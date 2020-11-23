#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fetch = require('node-fetch')
const filenamify = require('filenamify')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')

async function fetchUrl (url) {
  const response = await fetch(url)
  if (response.ok) {
    const ab = await response.arrayBuffer()
    return new Uint8Array(ab)
  }
  throw new Error(`[${response.status}], Fetch Error...`)
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
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (name, extension, dir, tags, hashOnly) {
  const result = dotenv.config()
  if (result.error) {
    throw result.error
  }
  name =
    name == null || name === undefined || name.trim() === ''
      ? null
      : name.trim()
  if (name == null) {
    throw new Error('Unknown name...')
  }
  extension =
    extension == null || extension === undefined || extension.trim() === ''
      ? null
      : extension.trim()
  if (extension == null) {
    throw new Error('Unknown file extension...')
  }
  dir =
    dir == null || dir === undefined || dir.trim() === '' ? null : dir.trim()
  if (dir == null) {
    throw new Error('Unknown output dir...')
  }
  tags =
    tags == null || tags === undefined || tags.trim() === ''
      ? null
      : tags.trim()
  hashOnly =
    hashOnly == null || hashOnly === undefined || hashOnly.trim() === ''
      ? null
      : hashOnly.trim()
  hashOnly = hashOnly
    ? hashOnly === 'true'
    : process.env.HASH_ONLY
    ? process.env.HASH_ONLY === 'true'
    : true
  console.log(`*** ${name} ***`)
  const fileName = filenamify(name, { replacement: '_' })
  // build
  const build = fs.readFileSync(
    `./build/output/${dir}/${fileName}_build.json`,
    'utf8'
  )
  var { _target, _raw_hash: _rawHash, _version } = JSON.parse(build)
  if (_target !== name) {
    throw new Error('Target inconsistency...')
  }
  // current
  var currentVersion = null
  var currentParentCid = null
  var currentCid = null
  if (fs.existsSync(`./current/${dir}/${fileName}.json`)) {
    const current = fs.readFileSync(`./current/${dir}/${fileName}.json`, 'utf8')
    if (!current) {
      throw new Error('Unknown current version...')
    }
    var {
      _parent_cid: currentParentCid,
      _cid: currentCid,
      _version: currentVersion
    } = JSON.parse(current)
  }
  // Ipfs Client
  const apiUrl = process.env.API
    ? process.env.API
    : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)
  const gatewayUrl = process.env.GATEWAY
    ? process.env.GATEWAY
    : 'https://dweb.link'
  // Load
  var load = null
  var file = `${fileName}-${_version}.${extension}`
  var path = `./production/${dir}/${file}`
  if (fs.existsSync(path)) {
    load = fs.readFileSync(path, 'utf8')
  }
  if (!load) {
    file = `${fileName}.${extension}`
    path = `./build/output/${dir}/${file}`
    if (fs.existsSync(path)) {
      load = fs.readFileSync(path, 'utf8')
    }
  }
  if (!load) {
    throw new Error('Unknown content...')
  }
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: true,
    wrapWithDirectory: true,
    rawLeaves: false
  }
  if (hashOnly) {
    options.onlyHash = true
  }
  var parentCid = null
  var cid = null
  var size = null
  path = null
  var msg = 'added'
  if (hashOnly) {
    msg = 'hashed only'
  }
  var content = {
    path: `/${file}`,
    content: StringToUint8Array(load)
  }
  for await (const added of api.addAll([content], options)) {
    if (!added || !added.cid) {
      throw new Error('IPFS client returned an unknown result...')
    }
    if (cid !== null && parentCid !== null) {
      throw new Error('IPFS client returned an unexpected result...')
    }
    if (!cid && added.path === file) {
      cid = added.cid
    } else if (!parentCid) {
      parentCid = added.cid
    }
    size = added.size
  }
  console.log(`*** ${msg} ${parentCid} ***`)
  console.log(`*** ${msg} ${parentCid}/${file} ***`)
  console.log(`*** ${msg} ${cid} ***`)
  // Check
  if (currentVersion !== null && currentVersion === _version) {
    if (cid.toString() !== currentCid) {
      throw new Error('Matching version but not cid...')
    }
    if (parentCid.toString() !== currentParentCid) {
      throw new Error('Matching version but not parent cid...')
    }
  }
  // Save
  const toJson = {
    _target: name,
    _path: file,
    _parent_cid: parentCid.toString(),
    _parent_uri: `${gatewayUrl}/ipfs/${parentCid}`,
    _source_uri: `${gatewayUrl}/ipfs/${parentCid}/${file}`,
    _cid: cid.toString(),
    _cid_uri: `${gatewayUrl}/ipfs/${cid}`,
    _version: _version,
    _raw_hash: _rawHash,
    _size: size
  }
  if (tags) {
    toJson._tags = tags
  }
  fs.writeFileSync(
    `./current/${dir}/${fileName}.json`,
    JSON.stringify(toJson),
    'utf8'
  )
  var tid = `title: ${name}/build`
  if (tags) {
    tid = `${tid}
tags: ${toJson._tags}`
  }
  tid = `${tid}
_target: ${toJson._target}
_path: ${toJson._path}
_parent_cid: ${toJson._parent_cid}
_parent_uri: ipfs://${toJson._parent_cid}
_source_uri: ipfs://${toJson._parent_cid}/${file}
_cid: ${toJson._cid}
_cid_uri: ipfs://${toJson._cid}
_version: ${toJson._version}
_raw_hash: ${toJson.__raw_hash}
_size: ${toJson._size}`
  // Save
  fs.writeFileSync(`./build/output/${dir}/${fileName}_build.tid`, tid, 'utf8')
  if (!hashOnly) {
    await fetchUrl(`${gatewayUrl}/ipfs/${toJson._cid}`)
    console.log(`*** Fetched ${gatewayUrl}/ipfs/${toJson._cid} ***`)
    await fetchUrl(`${gatewayUrl}/ipfs/${toJson._parent_cid}`)
    console.log(`*** Fetched ${gatewayUrl}/ipfs/${toJson._parent_cid} ***`)
    await fetchUrl(`${gatewayUrl}/ipfs/${toJson._parent_cid}/${toJson._path}`)
    console.log(
      `*** Fetched ${gatewayUrl}/ipfs/${toJson._parent_cid}/${toJson._path} ***`
    )
  }
}
