#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const path = require('path')
const { pipeline } = require('stream')
const { promisify } = require('util')
const timeoutSignal = require('timeout-signal')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

// bluelight.link
const IPNS_CID_RAW_BUILD = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'

const shortTimeout = 6000
const longTimeout = 4 * 60 * shortTimeout

async function loadFromIpfs (url, timeout, stream) {
  try {
    if (url instanceof URL === false) {
      url = new URL(url)
    }
    timeout = timeout !== undefined && timeout !== null ? timeout : longTimeout
    var options = {
      method: 'options',
      signal: timeoutSignal(timeout),
    }
    var response = await fetch(url, options)
    if (response.ok === false) {
      throw new Error(`Unexpected response ${response.statusText}`)
    }
    var options = {
      compress: false,
      method: 'get',
      size: 0,
      signal: timeoutSignal(timeout),
    }
    const location = response.headers.get('Location')
    url = location !== undefined && location !== null ? new URL(location) : url
    var response = await fetch(url, options)
    if (response.ok === false) {
      throw new Error(`Unexpected response ${response.statusText}`)
    }
    if (stream !== undefined && stream !== null) {
      const streamPipeline = promisify(pipeline)
      await streamPipeline(response.body, stream)
      return
    }
    return await response.buffer()
  } catch (error) {
    console.log(`*** Fetch error:
${error.message}
${url} ***`)
  }
  return null
}

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (name, extension, dir, tags, load) {
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
  const normalizedName = ipfsBundle.filenamify(name)
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
  const rawBuildCid = process.env.IPNS_CID_RAW_BUILD ? `${process.env.IPNS_CID_RAW_BUILD}` : IPNS_CID_RAW_BUILD
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
  var publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? `${process.env.IPFS_PUBLIC_GATEWAY}` : null
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
    console.log(`*** Load current:
 ${currentPath} ***`)
    current = JSON.parse(fs.readFileSync(currentPath, 'utf8'))
  } else {
    console.log(`*** Unable to load current:
 ${currentPath} ***`)
    const uri = `${gateway}/ipns/${rawBuildCid}/${dir}/latest-build/current.json`
    console.log(`*** Fetch current:
 ${uri} ***`)
    const ua = await loadFromIpfs(uri)
    if (ua !== null) {
      current = JSON.parse(ipfsBundle.Utf8ArrayToStr(ua))
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
    current.rawSemver = build.rawSemver
    current.version = build.version
  } else {
    current = {
      build: build.build,
      content: [],
      rawSemver: build.rawSemver,
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
    } else if (value.path === sourceFileName || value.path === 'index.html') {
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
name: ${node.name}
sourceSize: ${node.sourceSize}`
  if (sourceFileName.endsWith('.html')) {
    tid = `${tid}
sourceUri: ipfs://${parentCid}/`
  } else {
    tid = `${tid}
sourceUri: ipfs://${parentCid}/${sourceFileName}`
  }
  tid = `${tid}
version: ${build.version}

<$ipfslink value={{!!sourceUri}}>{{!!name}}-{{!!version}}</$ipfslink>`
  // Save and upload tiddler
  fs.writeFileSync(`./production/${dir}/${normalizedName}.${extension}-build.tid`, tid, 'utf8')
  const loaded = fs.readFileSync(`./production/${dir}/${normalizedName}.${extension}-build.tid`)
  var added = await api.add(
    {
      path: `/${normalizedName}.${extension}-build.tid`,
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
 ipfs://${added.cid}/${normalizedName}.${extension}-build.tid`)
  // Update node
  node.tidSize = added.size
  node.tidUri = `${publicGateway}/ipfs/${added.cid}/${normalizedName}.${extension}-build.tid`
  // Save current
  fs.writeFileSync(`./current/${dir}/current.json`, beautify(current, null, 2, 80), 'utf8')
  // Load
  if (load) {
    var uri = `${gateway}/ipfs/${added.cid}/${normalizedName}.${extension}-build.tid`
    console.log(`*** Fetch tiddler ***
 ${uri}`)
    await loadFromIpfs(uri)
    var uri = `${gateway}/ipfs/${parentCid}/`
    console.log(`*** Fetch parent ***
 ${uri}`)
    await loadFromIpfs(uri)
    if (sourceFileName.endsWith('.html')) {
      var uri = `${gateway}/ipfs/${parentCid}/index.html`
      console.log(`*** Fetch content ***
 ${uri}`)
      await loadFromIpfs(uri)
    } else {
      var uri = `${gateway}/ipfs/${parentCid}/${sourceFileName}`
      console.log(`*** Fetch content ***
 ${uri}`)
      await loadFromIpfs(uri)
    }
    if (faviconCid !== null) {
      var uri = `${gateway}/ipfs/${parentCid}/${faviconFileName}`
      console.log(`*** Fetch favicon ***
 ${uri}`)
      await loadFromIpfs(uri)
    }
  }
}
