#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fs = require('fs')
const { create: IpfsHttpClient } = require('ipfs-http-client')
const path = require('path')
const IpfsUtils = require('bin/ipfs-utils.js')
const ipfsUtils = new IpfsUtils()
const ipfsBundle = ipfsUtils.ipfsBundle

// bluelight.link
const IPNS_CID_RAW_BUILD = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'

const shortTimeout = 6000
const longTimeout = 4 * 60 * shortTimeout

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (name, extension, dir, tags, faviconFileName) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
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
  faviconFileName = faviconFileName !== undefined && faviconFileName !== null && faviconFileName.trim() !== '' ? faviconFileName.trim() : null
  if (faviconFileName !== 'favicon.ico' && faviconFileName !== 'favicon.png') {
    faviconFileName = 'favicon.ico'
  }
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
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://ipfs.infura.io'
  const normalizedUri = `${gateway}/ipns/${rawBuildCid}/${dir}/latest-build/`
  var publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? `${process.env.IPFS_PUBLIC_GATEWAY}` : null
  if (publicGateway == null) {
    publicGateway = 'https://dweb.link'
  }
  console.log('***')
  console.log(`*** Upload build: ${dir}
 api: ${apiUrl}
 gateway: ${gateway}
 public gateway: ${publicGateway} ***`)
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
    const uri = `${normalizedUri}/current.json`
    console.log(`*** Fetch current:
 ${uri} ***`)
    const data = await ipfsUtils.loadFromIpfs(uri)
    if (data !== undefined && data !== null) {
      var { content: current } = data
      current = JSON.parse(ipfsBundle.Utf8ArrayToStr(current))
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
    current.buildUri = build.buildUri
    current.rawSemver = build.rawSemver
    current.version = build.version
  } else {
    current = {
      build: build.build,
      buildUri: null,
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
  var faviconPath = `./${faviconFileName}`
  if (fs.existsSync(faviconPath)) {
    favicon = fs.readFileSync(faviconPath)
  }
  // Load content
  var source = null
  var titleName = `${normalizedName}-${build.version}`
  var sourceFileName = `${titleName}.${extension}`
  var sourcePath = `./production/${dir}/${sourceFileName}`
  if (fs.existsSync(sourcePath)) {
    source = fs.readFileSync(sourcePath, 'utf8')
  }
  titleName = path.basename(path.dirname(sourcePath))
  if (source === undefined || source == null) {
    sourceFileName = normalizedName
    sourcePath = `./build/output/${dir}/${sourceFileName}`
    if (fs.existsSync(sourcePath)) {
      source = fs.readFileSync(sourcePath, 'utf8')
    }
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
  var parentCid = null
  var sourceCid = null
  var sourceSize = null
  const upload = []
  if (sourceFileName.endsWith('.html')) {
    if (favicon !== undefined && favicon !== null) {
      upload.push({
        path: `/${faviconFileName}`,
        content: favicon,
      })
    }
    upload.push({
      path: '/index.html',
      content: ipfsBundle.StringToUint8Array(source),
    })
    sourceFileName = 'index.html'
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
    } else if (value.path === sourceFileName) {
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
  // Json
  const node = {}
  node.title = titleName
  if (tags !== null) {
    node.tags = tags
  }
  node.name = name
  node.rawHash = build.rawHash
  node.sourceExtension = extension
  node.sourceFilename = normalizedName
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
  var tid = null
  if (sourceFileName.endsWith('.html')) {
    tid = 'title: $:/ipfs/edition-build'
  } else {
    tid = `title: ${node.name}-build`
  }
  if (tags !== null) {
    tid = `${tid}
tags: ${node.tags}
type: text/vnd.tiddlywiki`
  }
  tid = `${tid}
build: ${current.build}`
  tid = `${tid}
name: ${node.name}
version: ${build.version}
sourceSize: ${node.sourceSize}
sourceExtension: ${node.sourceExtension}
sourceFilename: ${node.sourceFilename}`
  if (sourceFileName.endsWith('.html')) {
    tid = `${tid}
sourceUri: ipfs://${parentCid}/`
  } else {
    tid = `${tid}
sourceUri: ipfs://${parentCid}/${sourceFileName}`
  }
  tid = `${tid}

<$ipfslink value={{!!sourceUri}}>{{!!name}}-{{!!version}}</$ipfslink>`
  // Save and upload tiddler
  var tidName = null
  if (sourceFileName.endsWith('.html')) {
    tidName = '$_ipfs_edition'
  } else {
    tidName = `${normalizedName}.${extension}`
  }
  fs.writeFileSync(`./production/${dir}/${tidName}-build.tid`, tid, 'utf8')
  const loaded = fs.readFileSync(`./production/${dir}/${tidName}-build.tid`)
  var added = await api.add(
    {
      path: `/${tidName}-build.tid`,
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
  // Update node
  node.tidSize = added.size
  node.tidUri = `${publicGateway}/ipfs/${added.cid}/${tidName}-build.tid`
  // Save current
  fs.writeFileSync(`./current/${dir}/current.json`, beautify(current, null, 2, 80), 'utf8')
  // Log
  console.log('***')
  if (faviconCid) {
    console.log(`*** Added 'favicon' ***
 ${gateway}/ipfs/${parentCid}/${faviconFileName}`)
  }
  console.log(`*** Added build ***
 ${gateway}/ipfs/${parentCid}/${sourceFileName}`)
  console.log(`*** Added build tiddler ***
 ${gateway}/ipfs/${added.cid}/${tidName}-build.tid`)
}
