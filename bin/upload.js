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

async function loadFromIpfs (url, timeout, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  const options = {
    compress: false,
    method: 'GET',
    timeout: timeout !== undefined ? timeout : longTimeout,
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
  load = load !== undefined && load !== null ? load : process.env.LOAD ? process.env.LOAD === 'true' || process.env.LOAD === true : true
  // Build
  var buildPath = `./build/output/${dir}/${normalizedName}-build.json`
  if (fs.existsSync(buildPath) === false) {
    throw new Error(`Unknown build: ${buildPath}...`)
  }
  const build = JSON.parse(fs.readFileSync(buildPath, 'utf8'))
  if (build.build === undefined || build.build == null) {
    throw new Error('Unknown build...')
  }
  if (build.version === undefined || build.version == null) {
    throw new Error('Unknown version...')
  }
  const rawBuildName = process.env.IPNS_RAW_BUILD_NAME ? `${process.env.IPNS_RAW_BUILD_NAME}` : IPNS_RAW_BUILD_NAME
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
  var publicGateway = process.env.PUBLIC_GATEWAY ? `${process.env.PUBLIC_GATEWAY}` : null
  if (publicGateway == null) {
    publicGateway = gateway
  }
  console.log('***')
  console.log(`*** Upload build: ${dir}
 api: ${apiUrl}
 gateway: ${new URL(gateway)}
 public gateway: ${new URL(publicGateway)} ***`)
  var current = null
  var member = null
  var memberPosition = null
  const currentPath = `./current/${dir}/current.json`
  if (fs.existsSync(currentPath)) {
    current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))
    console.log(`*** Loaded current:
 ${currentPath} ***`)
  } else {
    const uri = `${gateway}/ipns/${rawBuildName}/latest-build/${dir}/current.json`
    try {
      const ua = await loadFromIpfs(uri)
      current = JSON.parse(ipfsBundle.Utf8ArrayToStr(ua))
      console.log(`*** Fetched current:
 ${uri} ***`)
    } catch (error) {
      console.log(`*** Unable to fetch current:
 ${uri}
 ${error.message} ***`)
    }
  }
  // Member lookup
  if (current !== null) {
    for (var j = 0; j < current.content.length; j++) {
      if (current.content[j].name === name) {
        member = current.content[j]
        memberPosition = j
        break
      }
    }
    if (member !== null) {
      if (current.version === build.version) {
        if (member.title.endsWith(build.build) && member.rawHash !== build.rawHash) {
          throw new Error('Matching version but not raw hash...')
        }
      } else {
        if (member.rawHash === build.rawHash) {
          throw new Error('Raw hash inconsistency...')
        }
      }
    }
    current.build = build.build
    current.version = build.version
  } else {
    current = {
      build: build.build,
      content: [],
      version: build.version,
    }
  }
  // Ipfs
  const api = IpfsHttpClient({
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: 2 * 60 * 1000,
  })
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 1,
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
  var titleName = `${normalizedName}-${build.version}`
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
    throw new Error(`Unknown content: ${sourcePath}`)
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
  if (sourceFileName.endsWith('.html')) {
    upload.push({
      path: '/index.html',
      content: ipfsBundle.StringToUint8Array(source),
    })
  } else {
    upload.push({
      path: `/${sourceFileName}`,
      content: ipfsBundle.StringToUint8Array(source),
    })
  }
  var added = await ipfsBundle.addAll(api, upload, options)
  for (const [key, value] of added.entries()) {
    if (value.path === '') {
      parentCid = key
    } else if (value.path === faviconFileName) {
      faviconCid = key
      faviconSize = value.size
    } else {
      sourceCid = key
      sourceSize = value.size
    }
  }
  if (parentCid === undefined || parentCid == null) {
    throw new Error('Unknown parent cid...')
  }
  if (sourceCid === undefined || sourceCid == null) {
    throw new Error('Unknown content cid...')
  }
  // Check
  if (member !== null && member.version === build.version) {
    var oldParentCid = await ipfsBundle.resolveIpfsContainer(api, member.sourceUri)
    if (oldParentCid !== null && oldParentCid.toString() !== parentCid.toString()) {
      throw new Error('Matching version but not parent cid...')
    }
    var oldSourceCid = null
    if (sourceFileName.endsWith('.html')) {
      var { cid: oldSourceCid } = await ipfsBundle.resolveIpfs(api, `${member.sourceUri}index.html`)
    } else {
      var { cid: oldSourceCid } = await ipfsBundle.resolveIpfs(api, member.sourceUri)
    }
    if (oldSourceCid !== null && oldSourceCid.toString() !== sourceCid.toString()) {
      throw new Error('Matching version but not content cid...')
    }
    if (faviconCid !== null) {
      var { cid: oldFaviconCid } = await ipfsBundle.resolveIpfs(api, member.faviconUri)
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
  if (sourceFileName.endsWith('.html')) {
    console.log(`*** Added content ***
 ipfs://${parentCid}/index.html`)
  } else {
    console.log(`*** Added content ***
 ipfs://${parentCid}/${sourceFileName}`)
  }
  // Json
  const node = {}
  node.title = titleName
  if (tags !== null) {
    node.tags = tags
  }
  if (faviconCid !== null) {
    node.faviconSize = faviconSize
    node.faviconUri = `${publicGateway}/ipfs/${parentCid}/${faviconFileName}`
  }
  node.name = name
  if (owner !== null) {
    node.owner = owner
  }
  node.rawHash = build.rawHash
  node.sourceSize = sourceSize
  if (sourceFileName.endsWith('.html')) {
    node.sourceUri = `${publicGateway}/ipfs/${parentCid}/`
  } else {
    node.sourceUri = `${publicGateway}/ipfs/${parentCid}/${sourceFileName}`
  }
  // Update current
  if (memberPosition !== null) {
    current.content[memberPosition] = node
  } else {
    current.content.push(node)
  }
  // Tiddler
  var tid = `title: ${node.name}-build`
  if (tags !== null) {
    tid = `${tid}
tags: ${node.tags}`
  }
  tid = `${tid}
build: ${current.build}`
  if (faviconCid !== null) {
    tid = `${tid}
faviconSize: ${node.faviconSize}
faviconUri: ipfs://${parentCid}/${faviconFileName}`
  }
  tid = `${tid}
name: ${node.name}`
  if (owner !== null) {
    tid = `${tid}
owner: ${node.owner}`
  }
  tid = `${tid}
sourceSize: ${node.sourceSize}`
  if (sourceFileName.endsWith('.html')) {
    tid = `${tid}
sourceUri: ipfs://${parentCid}/`
  } else {
    tid = `${tid}
sourceUri: ipfs://${parentCid}/${sourceFileName}`
  }
  tid = `${tid}
version: ${build.version}`
  // Save and upload tiddler
  fs.writeFileSync(`./production/${dir}/${normalizedName}-build.tid`, tid, 'utf8')
  const loaded = fs.readFileSync(`./production/${dir}/${normalizedName}-build.tid`)
  var added = await api.add(
    {
      path: `/${normalizedName}-build.tid`,
      content: loaded,
    },
    {
      chunker: 'rabin-262144-524288-1048576',
      cidVersion: 1,
      hashAlg: 'sha2-256',
      pin: false,
      rawLeaves: false,
      wrapWithDirectory: true,
      timeout: longTimeout,
    }
  )
  if (added === undefined || added == null) {
    throw new Error('IPFS returned an unknown result...')
  }
  // Check
  if (member !== null && member.version === build.version) {
    var oldTiddlerCid = await ipfsBundle.resolveIpfsContainer(api, member.tidUri)
    if (oldTiddlerCid !== null && oldTiddlerCid.toString() !== added.cid.toString()) {
      throw new Error('Matching version but not tiddler cid...')
    }
  }
  console.log(`*** Added tiddler ***
 ipfs://${added.cid}/${normalizedName}-build.tid`)
  // Update node
  node.tidSize = added.size
  node.tidUri = `${publicGateway}/ipfs/${added.cid}/${normalizedName}-build.tid`
  // Save current
  fs.writeFileSync(`./current/${dir}/current.json`, beautify(current, null, 2, 80), 'utf8')
  // Load
  if (load) {
    var uri = `${gateway}/ipfs/${added.cid}/${normalizedName}-build.tid`
    await loadFromIpfs(uri)
    console.log(`*** Fetched tiddler ***
 ${uri}`)
    var uri = `${gateway}/ipfs/${parentCid}/`
    await loadFromIpfs(uri)
    console.log(`*** Fetched content ***
 ${uri}`)
    if (sourceFileName.endsWith('.html')) {
      var uri = `${gateway}/ipfs/${parentCid}/index.html`
      await loadFromIpfs(uri)
      console.log(`*** Fetched source ***
 ${uri}`)
    } else {
      var uri = `${gateway}/ipfs/${parentCid}/${sourceFileName}`
      await loadFromIpfs(uri)
      console.log(`*** Fetched source ***
 ${uri}`)
    }
    if (faviconCid !== null) {
      var uri = `${gateway}/ipfs/${parentCid}/${faviconFileName}`
      await loadFromIpfs(uri)
      console.log(`*** Fetched favicon ***
 ${uri}`)
    }
  }
}
