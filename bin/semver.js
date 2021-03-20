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
  const ipfsTiddlyWikiSemver = process.env.IPFS_TIDDLYWIKI_SEMVER ? process.env.IPFS_TIDDLYWIKI_SEMVER.trim() : null
  if (ipfsTiddlyWikiSemver == null || ipfsTiddlyWikiSemver.trim() === '') {
    throw new Error("Undefined 'env.IPFS_TIDDLYWIKI_SEMVER'...")
  }
  // Process Raw
  var raw = null
  const fileName = filenamify(name, { replacement: '_' })
  // Load
  var path = `./build/output/${dir}/${fileName}-%BUILD_${env}_VERSION%.${extension}`
  if (fs.existsSync(path)) {
    raw = fs.readFileSync(path, 'utf8')
  }
  if (raw == null) {
    path = `./build/output/${dir}/${fileName}.${extension}`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
  }
  if (raw == null) {
    path = `./build/output/${dir}/${fileName}`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
  }
  if (raw == null) {
    throw new Error(`Unknown raw content: ${fileName}`)
  }
  const rawBuildName = process.env.IPNS_RAW_BUILD_NAME ? `${process.env.IPNS_RAW_BUILD_NAME}` : IPNS_RAW_BUILD_NAME
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
  // Keccak
  const keccak = createKeccakHash('keccak256')
  keccak.update(raw)
  const rawHash = keccak.digest('hex')
  console.log('***')
  console.log(`*** ${name}, hash: ${rawHash} ***`)
  // Current
  var current = null
  var path = `./current/${dir}/current.json`
  if (fs.existsSync(path)) {
    current = JSON.parse(fs.readFileSync(path, 'utf8'))
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
  if (current !== null) {
    for (var j = 0; j < current.length; j++) {
      if (current[j]._name === name) {
        current = current[j]
        break
      }
    }
  }
  // Version
  var kind = null
  if (version == null) {
    if (current === undefined || current == null || (current !== undefined && current !== null && current._raw_hash !== rawHash)) {
      version = generate({ version: rawSemver, versionSeparator: '-' })
      kind = 'New'
    } else {
      version = current._version
      kind = 'Current'
    }
  } else {
    kind = 'Parent'
  }
  if (validate(version) === false) {
    throw new Error(`Invalid version: ${version}`)
  }
  // build version
  var build = {}
  var path = './current/build.json'
  if (fs.existsSync(path)) {
    build = JSON.parse(fs.readFileSync(path, 'utf8'))
  }
  if (kind === 'New' || build._version === undefined || build._version === null) {
    build._version = generate({ version: ipfsTiddlyWikiSemver, versionSeparator: '-' })
    if (validate(build._version) === false) {
      throw new Error(`Invalid version: ${build._version}`)
    }
    fs.writeFileSync('./current/build.json', beautify(build, null, 2, 80), 'utf8')
    console.log(`*** New build: ${build._version}`)
  } else {
    console.log(`*** Current build: ${build._version}`)
  }
  console.log(`*** ${kind}: ${version}`)
  // Save
  var build = {
    _raw_hash: rawHash,
    _semver: rawSemver,
    _version: version,
  }
  fs.writeFileSync(`./build/output/${dir}/${fileName}-build.json`, beautify(build, null, 2, 80), 'utf8')
  // Done
  return version
}
