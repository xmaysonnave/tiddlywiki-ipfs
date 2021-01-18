#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const filenamify = require('filenamify')
const fileType = require('file-type')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const http = require('http')
const https = require('https')
const { pipeline } = require('stream')
const { promisify } = require('util')

async function load (url, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  const options = {
    compress: false,
    method: 'GET',
  }
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  if (stream) {
    const streamPipeline = promisify(pipeline)
    await streamPipeline(response.body, stream)
    return
  }
  const buffer = await response.buffer()
  return await fileType.fromBuffer(buffer)
}

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

/*
 * https://infura.io/docs
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (name, owner, extension, dir, tags) {
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  name = name == null || name === undefined || name.trim() === '' ? null : name.trim()
  if (name == null) {
    throw new Error('Unknown name...')
  }
  owner = owner == null || owner === undefined || owner.trim() === '' ? null : owner.trim()
  extension = extension == null || extension === undefined || extension.trim() === '' ? null : extension.trim()
  if (extension == null) {
    throw new Error('Unknown file extension...')
  }
  dir = dir == null || dir === undefined || dir.trim() === '' ? null : dir.trim()
  if (dir == null) {
    throw new Error('Unknown directory...')
  }
  tags = tags == null || tags === undefined || tags.trim() === '' ? null : tags.trim()

  const normalizedName = filenamify(name, { replacement: '_' })

  // build
  var path = `./build/output/${dir}/${normalizedName}_build.json`
  if (!fs.existsSync(path)) {
    throw new Error(`Unknown build: ${path}...`)
  }
  const build = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (build._version === undefined || build._version == null) {
    throw new Error('Unknown version...')
  }
  if (build._raw_hash === undefined || build._raw_hash == null) {
    throw new Error('Unknown raw hash...')
  }
  if (build._semver === undefined || build._semver == null) {
    throw new Error('Unknown semver...')
  }

  // current
  var i = null
  var current = null
  var member = null
  var path = `./current/${dir}/current.json`
  if (fs.existsSync(path)) {
    current = JSON.parse(fs.readFileSync(path, 'utf8'))
    if (!current) {
      throw new Error(`Unknown current: ${path}...`)
    }
    if (!Array.isArray(current)) {
      throw new Error(`Unknown json array: ${path}...`)
    }
    // Member lookup
    for (var j = 0; j < current.length; j++) {
      if (current[j]._name === name) {
        i = j
        member = current[j]
        break
      }
    }
    // Check
    if (member) {
      if (member._version === build._version) {
        if (member._raw_hash !== build._raw_hash) {
          throw new Error('Matching version but not raw hash...')
        }
      } else {
        if (member._semver === build._semver && member._raw_hash === build._raw_hash) {
          throw new Error('Raw hash inconsistency...')
        }
      }
    }
  }

  // Load favicon
  var favicon = null
  var faviconName = 'favicon.ico'
  var faviconPath = `./production/${dir}/${faviconName}`
  const upload = []
  if (fs.existsSync(faviconPath)) {
    favicon = fs.readFileSync(faviconPath)
  }
  if (!favicon) {
    faviconName = 'favicon.png'
    faviconPath = `./production/${dir}/${faviconName}`
    if (fs.existsSync(faviconPath)) {
      favicon = fs.readFileSync(faviconPath)
    }
  }
  if (favicon) {
    upload.push({
      path: `/${faviconName}`,
      content: favicon,
    })
  }

  // Load content
  var content = null
  var contentName = `${normalizedName}-${build._version}.${extension}`
  var contentPath = `./production/${dir}/${contentName}`
  if (fs.existsSync(contentPath)) {
    content = fs.readFileSync(contentPath, 'utf8')
  }
  if (!content) {
    contentName = normalizedName
    contentPath = `./build/output/${dir}/${normalizedName}`
    if (fs.existsSync(contentPath)) {
      content = fs.readFileSync(contentPath, 'utf8')
    }
  }
  if (!content) {
    throw new Error('Unknown content...')
  }
  upload.push({
    path: `/${contentName}`,
    content: StringToUint8Array(content),
  })

  // Ipfs Client
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  const agent = new http.Agent({
    keepAlive: true,
    // Similar to browsers which limit connections to six per host
    maxSockets: 6,
  })
  const agents = new https.Agent({
    keepAlive: true,
    // Similar to browsers which limit connections to six per host
    maxSockets: 6,
  })
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const api = IpfsHttpClient({
    agent: protocol === 'http' ? agent : agents,
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: '4m',
  })
  const gatewayUrl = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}/ipfs/` : 'https://dweb.link/ipfs/'

  // Upload
  var cid = null
  var parentCid = null
  var faviconCid = null
  var contentSize = null
  var parentSize = null
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    rawLeaves: false,
    wrapWithDirectory: true,
  }
  for await (const result of api.addAll(upload, options)) {
    if (!result) {
      throw new Error('IPFS client returned an unknown result...')
    }
    if (result.path === '') {
      parentCid = result.cid
      parentSize = result.size
    } else if (result.path === contentName) {
      cid = result.cid
      contentSize = result.size
    } else if (result.path === faviconName) {
      faviconCid = result.cid
    }
  }
  if (!parentCid) {
    throw new Error('Unknown parent cid...')
  }
  if (!cid) {
    throw new Error('Unknown cid...')
  }

  console.log(`*** added ${cid} ***`)
  if (faviconCid) {
    console.log(`*** added ${faviconCid} ***`)
  }
  console.log(`*** added ${parentCid} ***`)
  console.log(`*** added ${parentCid}/${contentName} ***`)
  if (faviconCid) {
    console.log(`*** added ${parentCid}/${faviconName} ***`)
  }

  // Check
  if (member && member._version === build._version) {
    if (member._cid !== cid.toString()) {
      throw new Error('Matching version but not cid...')
    }
    if (member._parent_cid !== parentCid.toString()) {
      throw new Error('Matching version but not parent cid...')
    }
  }

  // Json
  const node = {}
  node._name = `${name}`
  if (tags) {
    node._tags = tags
  }
  if (owner) {
    node._owner = owner
  }
  node._cid = `${cid.toString()}`
  node._cid_uri = `${gatewayUrl}${cid}`
  node._parent_cid = `${parentCid}`
  node._parent_size = parentSize
  node._parent_uri = `${gatewayUrl}${parentCid}`
  node._raw_hash = build._raw_hash
  node._semver = build._semver
  node._source_path = contentName
  node._source_size = contentSize
  node._source_uri = `${gatewayUrl}${parentCid}/${contentName}`
  node._version = build._version
  // Save current
  if (current == null) {
    current = []
  }
  if (i !== null) {
    current[i] = node
  } else {
    current.push(node)
  }
  fs.writeFileSync(`./current/${dir}/current.json`, beautify(current, null, 2, 80), 'utf8')
  // Build version
  if (name === '$:/plugins/ipfs.js') {
    fs.writeFileSync(
      './current/build.json',
      beautify(
        {
          _version: build._version,
        },
        null,
        2,
        80
      ),
      'utf8'
    )
  }

  // Tiddler
  var tid = `title: ${name}_build`
  if (tags) {
    tid = `${tid}
tags: ${node._tags}`
  }
  if (owner) {
    tid = `${tid}
_owner: ${node._owner}`
  }
  tid = `${tid}
_cid: ${node._cid}
_cid_uri: ipfs://${node._cid}
_parent_cid: ${node._parent_cid}
_parent_size: ${node._parent_size}
_parent_uri: ipfs://${node._parent_cid}
_raw_hash: ${node._raw_hash}
_semver: ${node._semver}
_source_path: ${node._source_path}
_source_size: ${node._source_size}
_source_uri: ipfs://${node._parent_cid}/${contentName}
_version: ${node._version}`

  // Save Tiddler
  fs.writeFileSync(`./production/${dir}/${normalizedName}_build.tid`, tid, 'utf8')

  // Load
  await load(node._parent_uri)
  console.log(`*** Fetched ${node._parent_uri} ***`)
  await load(node._source_uri)
  console.log(`*** Fetched ${node._source_uri} ***`)
  await load(node._cid_uri)
  console.log(`*** Fetched ${node._cid_uri} ***`)
  if (faviconCid) {
    const faviconUri = `${gatewayUrl}${parentCid}/${faviconName}`
    await load(faviconUri)
    console.log(`*** Fetched ${faviconUri} ***`)
    const faviconBlockUri = `${gatewayUrl}${faviconCid}`
    await load(faviconBlockUri)
    console.log(`*** Fetched ${faviconBlockUri} ***`)
  }
}
