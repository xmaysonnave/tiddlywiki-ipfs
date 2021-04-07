#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const createKeccakHash = require('keccak')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const filenamify = require('filenamify')
const fs = require('fs')
const { generate, validate } = require('build-number-generator')
const { pipeline } = require('stream')
const { promisify } = require('util')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

// bluelight.link
const IPNS_CID_RAW_BUILD = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'

const shortTimeout = 6000
const longTimeout = 2 * 60 * shortTimeout

async function loadFromIpfs (url, timeout, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  var options = {
    method: 'options',
    timeout: timeout !== undefined ? timeout : longTimeout,
  }
  var response = await fetch(url, options)
  if (response.ok === false) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  var options = {
    compress: false,
    method: 'get',
    size: 0,
    timeout: timeout !== undefined ? timeout : longTimeout,
  }
  const location = response.headers.get('Location')
  url = location !== undefined && location !== null ? new URL(location) : url
  var response = await fetch(url, options)
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

module.exports = async function main (name, extension, dir, env, version) {
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
  extension = extension !== undefined && extension !== null && extension.trim() !== '' ? extension.trim() : null
  if (extension == null) {
    throw new Error('Unknown file extension...')
  }
  dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : null
  if (dir == null) {
    throw new Error('Unknown output dir...')
  }
  env = env !== undefined && env !== undefined && env.trim() !== '' ? env.trim() : null
  if (env == null) {
    throw new Error('Unknown env...')
  }
  version = version !== undefined && version !== undefined && version.trim() !== '' ? version.trim() : null
  const rawSemver = process.env[`${env}_SEMVER`] ? process.env[`${env}_SEMVER`].trim() : null
  if (rawSemver == null || rawSemver.trim() === '') {
    throw new Error(`Undefined 'env.${env}_SEMVER'...`)
  }
  // Process Raw
  var raw = null
  // Load
  var path = `./build/output/${dir}/${normalizedName}-%BUILD_${env}_VERSION%.${extension}`
  if (fs.existsSync(path)) {
    raw = fs.readFileSync(path, 'utf8')
  }
  if (raw == null) {
    path = `./build/output/${dir}/${normalizedName}.${extension}`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
  }
  if (raw == null) {
    path = `./build/output/${dir}/${normalizedName}`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
  }
  if (raw == null) {
    throw new Error(`Unknown build output: ${normalizedName}`)
  }
  const rawBuildCid = process.env.IPNS_CID_RAW_BUILD ? `${process.env.IPNS_CID_RAW_BUILD}` : IPNS_CID_RAW_BUILD
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
  // Keccak
  const keccak = createKeccakHash('keccak256')
  keccak.update(raw)
  const rawHash = keccak.digest('hex')
  console.log('***')
  console.log(`*** ${normalizedName}, hash: ${rawHash} ***`)
  // Version
  var build = null
  var kind = null
  if (version == null) {
    var current = null
    var content = null
    var path = `./current/${dir}/current.json`
    if (fs.existsSync(path)) {
      console.log(`*** Load current:
 ${path} ***`)
      current = JSON.parse(fs.readFileSync(path, 'utf8'))
    } else {
      console.log(`*** Unable to load current:
 ${path} ***`)
      const uri = `${gateway}/ipns/${rawBuildCid}/${dir}/latest-build/current.json`
      try {
        console.log(`*** Fetch current:
 ${uri} ***`)
        const ua = await loadFromIpfs(uri)
        current = JSON.parse(ipfsBundle.Utf8ArrayToStr(ua))
      } catch (error) {
        console.log(`*** Unable to fetch current:
 ${error.message} ***`)
      }
    }
    if (current !== null) {
      for (var j = 0; j < current.content.length; j++) {
        if (current.content[j].name === name) {
          content = current.content[j]
          break
        }
      }
    }
    if (content === undefined || content == null || (content !== undefined && content !== null && content.rawHash !== rawHash)) {
      version = generate({ version: rawSemver, versionSeparator: '-' })
      build = version.replace(`${rawSemver}-`, '')
      kind = 'New'
    } else {
      version = current.version
      build = current.build
      kind = 'Current'
    }
  } else {
    build = version.replace(`${rawSemver}-`, '')
    kind = 'Parent'
  }
  // Check
  if (validate(version) === false) {
    throw new Error(`Invalid version: ${version}`)
  }
  console.log(`*** ${kind} version: ${version} ***`)
  // Save
  var newBuild = {
    rawHash: rawHash,
    semver: rawSemver,
    build: build,
    version: version,
  }
  // Tiddler
  var tid = `title: $:/ipfs/edition/build
build: ${build}
name: ${normalizedName}
version: ${version}

${normalizedName}-${version}`
  // Save
  fs.writeFileSync(`./build/output/${dir}/${normalizedName}-build.json`, beautify(newBuild, null, 2, 80), 'utf8')
  fs.writeFileSync(`./build/output/${dir}/ipfs.edition.build.tid`, tid, 'utf8')
  // Done
  return newBuild
}
