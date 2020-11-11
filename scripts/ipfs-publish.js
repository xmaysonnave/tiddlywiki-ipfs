#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')

// String to uint array
function StringToUint8Array (string) {
  var escstr = encodeURIComponent(string)
  var binstr = escstr.replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1)
  })
  var ua = new Uint8Array(binstr.length)
  Array.prototype.forEach.call(binstr, function (ch, i) {
    ua[i] = ch.charCodeAt(0)
  })
  return ua
}

async function main () {
  const result = dotenv.config()
  if (result.error) {
    throw result.error
  }
  const args = process.argv.slice(2)
  if (!args[0]) {
    throw new Error('Nothing to publish...')
  }
  if (!args[1]) {
    throw new Error('Unknown file extension...')
  }
  const semver = fs.readFileSync('./build/output/.build-semver.json', 'utf8')
  if (!semver) {
    throw new Error('Unknown version...')
  }
  const { version, encoded } = JSON.parse(semver)
  if (!version) {
    throw new Error('Unknown version...')
  }
  if (!encoded) {
    throw new Error('Unknown encoded version...')
  }
  const name = `${args[0]}-${version}.${args[1]}`
  const encodedName = `${encodeURIComponent(args[0])}-${encoded}.${args[1]}`
  console.log(`*** upload: ${name} ***`)
  const api = process.env.API ? process.env.API : 'https://ipfs.infura.io:5001'
  var ipfs = IpfsHttpClient(api)
  const content = fs.readFileSync(`./production/${encodedName}`, 'utf8')
  // Upload
  const added = await ipfs.add(StringToUint8Array(content), {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: true,
    rawLeaves: false
  })
  if (!added || !added.path || !added.size) {
    throw new Error('IPFS client returned an unknown result...')
  }
  // Retrieve
  const gateway = process.env.GATEWAY
    ? process.env.GATEWAY
    : 'https://dweb.link'
  ipfs = IpfsHttpClient(gateway)
  for await (const file of ipfs.get(added.path)) {
    const content = JSON.stringify({
      name: name,
      uri: `${gateway}/ipfs/${file.path}?filename=${encodedName}`
    })
    fs.writeFileSync(
      `./build/output/.build-${encodeURIComponent(args[0])}.${args[1]}`,
      content,
      'UTF-8'
    )
  }
}

try {
  main()
} catch (error) {
  console.error(error)
  return 1
}

return 0
