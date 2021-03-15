#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const filenamify = require('filenamify')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const path = require('path')
const { pipeline } = require('stream')
const { promisify } = require('util')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

// bluelight.link
const IPNS_RAW_BUILD_NAME = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'

const shortTimeout = 4000
const longTimeout = 2 * 60 * shortTimeout

async function loadFromIpfs (url, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  const options = {
    compress: false,
    method: 'GET',
    timeout: longTimeout,
  }
  const response = await fetch(url, options)
  if (response.ok === false) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  if (stream !== undefined && stream !== null) {
    const streamPipeline = promisify(pipeline)
    await streamPipeline(response.body, stream)
    return
  }
  return await response.buffer()
}

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (name, owner, extension, dir, tags, load) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  ipfsBundle.init()
  // Params
  name = name !== undefined && name !== null && name.trim() !== '' ? name.trim() : null
  if (name == null) {
    throw new Error('Unknown name...')
  }
  const normalizedName = filenamify(name, { replacement: '_' })
  owner = owner !== undefined && owner !== null && owner.trim() !== '' ? owner.trim() : null
  extension = extension !== undefined && extension !== null && extension.trim() !== '' ? extension.trim() : null
  if (extension == null) {
    throw new Error('Unknown file extension...')
  }
  dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : null
  if (dir == null) {
    throw new Error('Unknown directory...')
  }
  tags = tags !== undefined && tags !== null && tags.trim() !== '' ? tags.trim() : null
  load = load !== undefined && load !== null ? load === 'true' : process.env.LOAD ? process.env.LOAD === 'true' : true
  // Build
  const buildPath = `./build/output/${dir}/${normalizedName}-build.json`
  if (fs.existsSync(buildPath) === false) {
    throw new Error(`Unknown build: ${buildPath}...`)
  }
  const build = JSON.parse(fs.readFileSync(buildPath, 'utf8'))
  if (build._version === undefined || build._version == null) {
    throw new Error('Unknown version...')
  }
  const rawBuildName = process.env.IPNS_RAW_BUILD_NAME ? `${process.env.IPNS_RAW_BUILD_NAME}` : IPNS_RAW_BUILD_NAME
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
  var publicGateway = process.env.PUBLIC_GATEWAY ? `${process.env.PUBLIC_GATEWAY}` : null
  if (publicGateway == null) {
    publicGateway = gateway
  }
  var current = null
  var member = null
  var memberPosition = null
  const currentPath = `./current/${dir}/current.json`
  if (fs.existsSync(currentPath)) {
    current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))
  } else {
    const uri = `${gateway}/ipns/${rawBuildName}/latest-build/current/${dir}/current.json`
    try {
      const ua = await loadFromIpfs(uri)
      current = JSON.parse(ipfsBundle.Utf8ArrayToStr(ua))
      console.log(`*** Fetched:
 ${uri} ***`)
    } catch (error) {
      console.log(error.message)
    }
  }
  // Member lookup
  if (current !== null) {
    for (var j = 0; j < current.length; j++) {
      if (current[j]._name === name) {
        member = current[j]
        memberPosition = j
        break
      }
    }
    // Check
    if (member !== null) {
      if (member._version === build._version) {
        if (member._raw_hash !== build._raw_hash) {
          throw new Error('Matching version but not raw hash...')
        }
      } else {
        if (member._raw_hash === build._raw_hash) {
          throw new Error('Raw hash inconsistency...')
        }
      }
    }
  }
  // Ipfs
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const api = IpfsHttpClient({
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: 2 * 60 * 1000,
  })
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    rawLeaves: false,
    wrapWithDirectory: true,
  }
  // Load favicon
  var favicon = null
  var faviconFileName = 'favicon.ico'
  var faviconPath = `./production/${dir}/${faviconFileName}`
  if (fs.existsSync(faviconPath)) {
    favicon = fs.readFileSync(faviconPath)
  }
  if (favicon === undefined || favicon == null) {
    faviconFileName = 'favicon.png'
    faviconPath = `./production/${dir}/${faviconFileName}`
    if (fs.existsSync(faviconPath)) {
      favicon = fs.readFileSync(faviconPath)
    }
  }
  // Load content
  var source = null
  var titleName = `${normalizedName}-${build._version}`
  var sourceFileName = `${titleName}.${extension}`
  var sourcePath = `./production/${dir}/${sourceFileName}`
  if (fs.existsSync(sourcePath)) {
    source = fs.readFileSync(sourcePath, 'utf8')
  }
  if (source === undefined || source == null) {
    titleName = path.basename(path.dirname(sourcePath))
    sourceFileName = `${normalizedName}.${extension}`
    sourcePath = `./build/output/${dir}/${sourceFileName}`
    if (fs.existsSync(sourcePath)) {
      source = fs.readFileSync(sourcePath, 'utf8')
    }
  }
  if (source === undefined || source == null) {
    throw new Error('Unknown content...')
  }
  // Upload
  var faviconCid = null
  var faviconSize = null
  var parentCid = null
  var sourceCid = null
  var sourceSize = null
  const upload = []
  if (favicon !== undefined && favicon !== null) {
    upload.push({
      path: `/${faviconFileName}`,
      content: favicon,
    })
  }
  upload.push({
    path: `/${sourceFileName}`,
    content: ipfsBundle.StringToUint8Array(source),
  })
  const added = await ipfsBundle.addAll(api, upload, options)
  for (const [key, value] of added.entries()) {
    if (value.path === '') {
      parentCid = key
    } else if (value.path === sourceFileName) {
      sourceCid = key
      sourceSize = value.size
    } else if (value.path === faviconFileName) {
      faviconCid = key
      faviconSize = value.size
    }
  }
  if (parentCid === undefined || parentCid == null) {
    throw new Error('Unknown parent cid...')
  }
  if (sourceCid === undefined || sourceCid == null) {
    throw new Error('Unknown content cid...')
  }
  // Check
  if (member !== null && member._version === build._version) {
    var oldParentCid = await ipfsBundle.resolveIpfsContainer(api, member._source_uri)
    if (oldParentCid !== null && oldParentCid.toString() !== parentCid.toString()) {
      throw new Error('Matching version but not parent cid...')
    }
    var { cid: oldSourceCid } = await ipfsBundle.resolveIpfs(api, member._source_uri)
    if (oldSourceCid !== null && oldSourceCid.toString() !== sourceCid.toString()) {
      throw new Error('Matching version but not content cid...')
    }
    if (faviconCid !== null) {
      var { cid: oldFaviconCid } = await ipfsBundle.resolveIpfs(api, member._favicon_uri)
      if (oldFaviconCid !== null && oldFaviconCid.toString() !== faviconCid.toString()) {
        throw new Error('Matching version but not favicon cid...')
      }
    }
  }
  // Log
  console.log('***')
  if (faviconCid) {
    console.log(`*** Added favicon ***
 ipfs://${parentCid}/${faviconFileName}`)
  }
  console.log(`*** Added content ***
 ipfs://${parentCid}/${sourceFileName}`)
  // Json
  const node = {}
  node.title = titleName
  if (tags !== null) {
    node.tags = tags
  }
  if (faviconCid !== null) {
    node._favicon_size = faviconSize
    node._favicon_uri = `${publicGateway}/ipfs/${parentCid}/${faviconFileName}`
  }
  node._name = name
  if (owner !== null) {
    node._owner = owner
  }
  node._raw_hash = build._raw_hash
  node._source_size = sourceSize
  node._source_uri = `${publicGateway}/ipfs/${parentCid}/${sourceFileName}`
  node._version = build._version
  // Save current
  if (current == null) {
    current = []
  }
  if (memberPosition !== null) {
    current[memberPosition] = node
  } else {
    current.push(node)
  }
  fs.writeFileSync(`./current/${dir}/current.json`, beautify(current, null, 2, 80), 'utf8')
  // Build
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
  var tid = `title: ${titleName}-build`
  if (tags !== null) {
    tid = `${tid}
tags: ${node.tags}`
  }
  if (faviconCid !== null) {
    tid = `${tid}
_favicon_size: ${node._favicon_size}
_favicon_uri: ipfs://${parentCid}/${faviconFileName}`
  }
  tid = `${tid}
_name: ${node._name}`
  if (owner !== null) {
    tid = `${tid}
_owner: ${node._owner}`
  }
  tid = `${tid}
_source_size: ${node._source_size}
_source_uri: ipfs://${parentCid}/${sourceFileName}
_version: ${node._version}`
  // Save Tiddler
  fs.writeFileSync(`./production/${dir}/${normalizedName}-build.tid`, tid, 'utf8')
  // Load
  if (load) {
    const sourceUri = `${gateway}/ipfs/${parentCid}/${sourceFileName}`
    await loadFromIpfs(sourceUri)
    console.log(`*** Fetched content ***
  ${sourceUri}`)
    if (faviconCid !== null) {
      const faviconUri = `${gateway}/ipfs/${parentCid}/${faviconFileName}`
      await loadFromIpfs(faviconUri)
      console.log(`*** Fetched favicon ***
  ${faviconUri}`)
    }
  }
}
