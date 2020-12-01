#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const filenamify = require('filenamify')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const fetch = require('node-fetch')

async function fetchUrl (url) {
  var response = await fetch(url)
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

module.exports = async function main (
  name,
  owner,
  extension,
  dir,
  tags,
  hashOnly
) {
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }

  name =
    name == null || name === undefined || name.trim() === ''
      ? null
      : name.trim()
  if (name == null) {
    throw new Error('Unknown name...')
  }
  owner =
    owner == null || owner === undefined || owner.trim() === ''
      ? null
      : owner.trim()
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

  const fileName = filenamify(name, { replacement: '_' })

  // build
  const build = fs.readFileSync(
    `./build/output/${dir}/${fileName}_build.json`,
    'utf8'
  )
  var { _raw_hash: _rawHash, _semver, _version } = JSON.parse(build)
  if (_version === undefined || _version == null) {
    throw new Error('Unknown version...')
  }
  if (_rawHash === undefined || _rawHash == null) {
    throw new Error('Unknown raw hash...')
  }
  if (_semver === undefined || _semver == null) {
    throw new Error('Unknown semver...')
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
      _version: currentVersion,
      _raw_hash: currentRawHash,
      _semver: currentSemver
    } = JSON.parse(current)
    // Check
    if (currentVersion === _version) {
      if (_rawHash !== currentRawHash) {
        throw new Error('Matching version but not raw hash...')
      }
    } else {
      if (_semver === currentSemver && _rawHash === currentRawHash) {
        throw new Error('Raw hash inconsistency...')
      }
    }
  }

  // Pin
  var toBePinned = []
  if (fs.existsSync(`./build/output/pin/pin.json`)) {
    const pin = fs.readFileSync(`./build/output/pin/pin.json`, 'utf8')
    toBePinned = JSON.parse(pin)
  }

  // Load
  var load = null
  var file = `${fileName}-${_version}.${extension}`
  var content = `./production/${dir}/${file}`
  if (fs.existsSync(content)) {
    load = fs.readFileSync(content, 'utf8')
  }
  if (!load) {
    file = fileName
    content = `./build/output/${dir}/${fileName}`
    if (fs.existsSync(content)) {
      load = fs.readFileSync(content, 'utf8')
    }
  }
  if (!load) {
    throw new Error('Unknown content...')
  }

  // Ipfs Client
  const apiUrl = process.env.API
    ? process.env.API
    : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)
  const gatewayUrl = process.env.GATEWAY
    ? process.env.GATEWAY
    : 'https://dweb.link'

  var parentCid = await ipfs.object.new({
    template: 'unixfs-dir'
  })

  // Upload
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    wrapWithDirectory: true,
    rawLeaves: false
  }
  if (hashOnly) {
    options.onlyHash = true
  }
  var cid = null
  var size = null
  var msg = 'added'
  if (hashOnly) {
    msg = 'hashed'
  }

  const upload = {
    path: `/${file}`,
    content: StringToUint8Array(load)
  }
  const result = await api.add(upload, options)
  if (!result || !result.cid) {
    throw new Error('IPFS client returned an unknown result...')
  }
  const parentCid = result.cid

  // Lookup
  for await (const ls of api.ls(parentCid)) {
    if (ls.name === file) {
      cid = ls.cid
      size = ls.size
    }
  }
  if (!cid) {
    throw new Error('Unknown cid...')
  }
  console.log(`*** ${msg} ${parentCid} ***`)
  console.log(`*** ${msg} ${parentCid}/${file} ***`)
  console.log(`*** ${msg} ${cid} ***`)

  // Check
  if (currentVersion === _version) {
    if (cid.toString() !== currentCid) {
      throw new Error('Matching version but not cid...')
    }
    if (parentCid.toString() !== currentParentCid) {
      throw new Error('Matching version but not parent cid...')
    }
  }

  // Json
  const toJson = {
    _parent_cid: parentCid.toString(),
    _parent_uri: `${gatewayUrl}/ipfs/${parentCid}`,
    _source_path: file,
    _source_uri: `${gatewayUrl}/ipfs/${parentCid}/${file}`,
    _cid: cid.toString(),
    _cid_uri: `${gatewayUrl}/ipfs/${cid}`,
    _semver: _semver,
    _version: _version,
    _raw_hash: _rawHash,
    _size: size
  }
  if (owner) {
    toJson._owner = owner
  }
  if (tags) {
    toJson._tags = tags
  }
  // Save current
  fs.writeFileSync(
    `./current/${dir}/${fileName}.json`,
    beautify(toJson, null, 2, 80),
    'utf8'
  )

  // Tiddler
  var tid = `title: ${name}/build`
  if (tags) {
    tid = `${tid}
tags: ${toJson._tags}`
  }
  if (owner) {
    tid = `${tid}
_owner: ${toJson._owner}`
  }
  tid = `${tid}
_parent_cid: ${toJson._parent_cid}
_parent_uri: ipfs://${toJson._parent_cid}
_source_path: ${toJson._path}
_source_uri: ipfs://${toJson._parent_cid}/${file}
_cid: ${toJson._cid}
_cid_uri: ipfs://${toJson._cid_uri}
_semver: ${toJson._semver}
_version: ${toJson._version}
_raw_hash: ${toJson.__raw_hash}
_size: ${toJson._size}`

  // Save Tiddler
  fs.writeFileSync(`./production/${dir}/${fileName}_build.tid`, tid, 'utf8')

  // Pin reference
  if (toBePinned.indexOf(`${parentCid}/${file}`) === -1) {
    toBePinned.push(`${parentCid}/${file}`)
  }
  // Pin parent directory
  if (toBePinned.indexOf(parentCid.toString()) === -1) {
    toBePinned.push(parentCid.toString())
  }
  // Pin resource
  if (toBePinned.indexOf(cid.toString()) === -1) {
    toBePinned.push(cid.toString())
  }
  // Save
  fs.writeFileSync(
    `./build/output/pin/pin.json`,
    JSON.stringify(toBePinned),
    'utf8'
  )

  // Fetch
  if (!hashOnly) {
    await fetchUrl(`${gatewayUrl}/ipfs/${toJson._cid}`)
    console.log(`*** Fetched ${gatewayUrl}/ipfs/${toJson._cid} ***`)
    await fetchUrl(`${gatewayUrl}/ipfs/${toJson._parent_cid}`)
    console.log(`*** Fetched ${gatewayUrl}/ipfs/${toJson._parent_cid} ***`)
    await fetchUrl(
      `${gatewayUrl}/ipfs/${toJson._parent_cid}/${toJson._source_path}`
    )
    console.log(
      `*** Fetched ${gatewayUrl}/ipfs/${toJson._parent_cid}/${toJson._source_path} ***`
    )
  }
}
