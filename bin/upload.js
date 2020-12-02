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
    throw new Error('Unknown directory...')
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

  // Replay
  const replay = new Map()
  if (fs.existsSync(`./production/${dir}/$_replay.json`)) {
    const json = fs.readFileSync(`./production/${dir}/$_replay.json`, 'utf8')
    const jsonObject = JSON.parse(json)
    for (const key in jsonObject) {
      replay.set(key, jsonObject[key])
    }
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

  var gatewayUrl = process.env.GATEWAY
    ? process.env.GATEWAY
    : 'https://dweb.link'
  gatewayUrl = `${gatewayUrl}/ipfs/`

  // Upload Leaf
  var cid = null
  var parentCid = null
  var size = null
  var msg = 'added'
  if (hashOnly) {
    msg = 'hashed'
  }
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    rawLeaves: false,
    wrapWithDirectory: true
  }
  if (hashOnly) {
    options.onlyHash = true
  }
  const upload = [
    {
      path: `/${file}`,
      content: StringToUint8Array(load)
    }
  ]
  for await (const result of api.addAll(upload, options)) {
    if (!result) {
      throw new Error('IPFS client returned an unknown result...')
    }
    if (result.path === '') {
      parentCid = result.cid
    } else if (result.path === file) {
      cid = result.cid
      size = result.size
    }
  }
  if (!parentCid) {
    throw new Error('Unknown parent cid...')
  }
  if (!cid) {
    throw new Error('Unknown cid...')
  }

  console.log(`*** ${msg} ${cid} ***`)
  console.log(`*** ${msg} ${parentCid} ***`)
  console.log(`*** ${msg} ${parentCid}/${file} ***`)

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
    _parent_uri: `${gatewayUrl}${parentCid}`,
    _source_path: file,
    _source_uri: `${gatewayUrl}${parentCid}/${file}`,
    _cid: cid.toString(),
    _cid_uri: `${gatewayUrl}${cid}`,
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

  // resource
  if (!replay.has(cid.toString())) {
    replay.set(cid.toString(), 'file')
  }
  // parent directory
  if (!replay.has(parentCid.toString())) {
    replay.set(parentCid.toString(), 'dir')
  }
  // link
  if (!replay.has(`${parentCid}/${file}`)) {
    replay.set(`${parentCid}/${file}`, 'link')
  }

  // Save
  const jsonObject = {}
  replay.forEach((value, key) => {
    jsonObject[key] = value
  })
  fs.writeFileSync(
    `./production/${dir}/$_replay.json`,
    JSON.stringify(jsonObject),
    'utf8'
  )

  // Fetch
  if (!hashOnly) {
    await fetchUrl(`${gatewayUrl}${toJson._cid}`)
    console.log(`*** Fetched ${gatewayUrl}${toJson._cid} ***`)
    await fetchUrl(`${gatewayUrl}${toJson._parent_cid}`)
    console.log(`*** Fetched ${gatewayUrl}${toJson._parent_cid} ***`)
    await fetchUrl(`${gatewayUrl}${toJson._parent_cid}/${toJson._source_path}`)
    console.log(
      `*** Fetched ${gatewayUrl}${toJson._parent_cid}/${toJson._source_path} ***`
    )
  }
}
