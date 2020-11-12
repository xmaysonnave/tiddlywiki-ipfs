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
  const name = args[0]
  if (!name) {
    throw new Error('Nothing to publish...')
  }
  const extension = args[1]
  if (!extension) {
    throw new Error('Unknown file extension...')
  }
  const deployTiddler = args[2] ? args[2] === 'true' : true
  const dryRun = args[3]
    ? args[3] === 'true'
    : process.env.DRY_RUN
    ? process.env.DRY_RUN === 'true'
    : true
  const semver = fs.readFileSync('./build/output/.build-semver.json', 'utf8')
  if (!semver) {
    throw new Error('Unknown version...')
  }
  const { version } = JSON.parse(semver)
  if (!version) {
    throw new Error('Unknown version...')
  }
  const longName = `${name.replace(/[:/]/g, '_')}`
  console.log(`*** upload: ${name}-${version}.${extension} ***`)
  const api = process.env.API ? process.env.API : 'https://ipfs.infura.io:5001'
  var ipfs = IpfsHttpClient(api)
  const content = fs.readFileSync(
    `./production/${longName}-${version}.${extension}`,
    'utf8'
  )
  // Upload
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: true,
    rawLeaves: false,
    wrapWithDirectory: true
  }
  if (dryRun) {
    options.onlyHash = true
  }
  const file = {
    path: `/${longName}-${version}.${extension}`,
    content: StringToUint8Array(content)
  }
  const added = await ipfs.add(file, options)
  if (!added || !added.cid || !added.size) {
    throw new Error('IPFS client returned an unknown result...')
  }
  var msg = 'added'
  if (dryRun) {
    msg = 'hash only'
  }
  console.log(
    `*** ${msg}, name: ${longName}-${version}.${extension}, path: ipfs://${added.cid}, size: ${added.size} ***`
  )
  // Env
  const env = {
    tiddler: name,
    _source_uri: `ipfs://${added.cid}/${longName}-${version}.${extension}`
  }
  fs.writeFileSync(
    `./build/output/.build-${longName}.json`,
    JSON.stringify(env),
    'utf8'
  )
  // Tiddler
  fs.writeFileSync(
    `./build/output/${longName}_source.tid`,
    `title: ${name}/source\ntiddler: ${name}\ntags: $:/ipfs/core\n_source_uri: ${env._source_uri}`,
    'UTF-8'
  )
  if (deployTiddler) {
    fs.copyFile(
      `./build/output/${longName}_source.tid`,
      `./build/plugins/ipfs/config/${longName}_source.tid`,
      function (error) {
        if (error) throw error
      }
    )
  }
  if (!dryRun) {
    // Retrieve
    const gateway = process.env.GATEWAY
      ? process.env.GATEWAY
      : 'https://dweb.link'
    ipfs = IpfsHttpClient(gateway)
    for await (const file of ipfs.get(added.cid)) {
      console.log(
        `*** fetched, path: ipfs://${file.path}, type: ${file.type} ***`
      )
    }
  }
}

try {
  main()
} catch (error) {
  console.error(error)
  return 1
}

return 0
