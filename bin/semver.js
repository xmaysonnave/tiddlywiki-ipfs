#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const constants = require('bin/constants.js')
const createKeccakHash = require('keccak')
const dotenv = require('dotenv')
const fs = require('fs')
const { generate, validate } = require('build-number-generator')
const { loadFromIpfs } = require('bin/utils.js')

const IpfsBundle = require('core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

// bluelight.link
const IPNS_CID_RAW_BUILD = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'

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
  const normalizedName = ipfsBundle.filenamify(name)
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
  var buildPath = `./build/output/${dir}/${normalizedName}-%BUILD_${env}_VERSION%.${extension}`
  if (fs.existsSync(buildPath)) {
    raw = fs.readFileSync(buildPath, 'utf8')
  }
  if (raw == null) {
    buildPath = `./build/output/${dir}/${normalizedName}.${extension}`
    if (fs.existsSync(buildPath)) {
      raw = fs.readFileSync(buildPath, 'utf8')
    }
  }
  if (raw == null) {
    buildPath = `./build/output/${dir}/${normalizedName}`
    if (fs.existsSync(buildPath)) {
      raw = fs.readFileSync(buildPath, 'utf8')
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
      console.log(`*** Fetch current:
 ${uri} ***`)
      const data = await loadFromIpfs(uri)
      if (data !== undefined && data !== null) {
        var { content } = data
        current = JSON.parse(ipfsBundle.Utf8ArrayToStr(content))
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
    if (content === undefined || content == null || (content !== undefined && content !== null && (content.rawHash !== rawHash || current.rawSemver !== rawSemver))) {
      version = generate({ version: rawSemver, versionSeparator: '-' })
      build = version.replace(`${rawSemver}-`, '')
      kind = constants.NEW
    } else {
      version = current.version
      build = current.build
      kind = constants.UNCHANGED
    }
  } else {
    build = version.replace(`${rawSemver}-`, '')
    kind = constants.PARENT
  }
  // Check
  if (validate(version) === false) {
    throw new Error(`Invalid version: ${version}`)
  }
  console.log(`*** ${kind} version: ${version} ***`)
  // Save
  var newBuild = {
    build: build,
    kind: kind,
    rawHash: rawHash,
    rawSemver: rawSemver,
    version: version,
  }
  if (dir.includes('editions')) {
    var tid = `title: $:/ipfs/edition-build
build: ${build}
name: ${normalizedName}
version: ${version}

${normalizedName}-${version}`
    fs.writeFileSync(`./build/output/${dir}/$_ipfs_edition-build.tid`, tid, 'utf8')
  }
  fs.writeFileSync(`./build/output/${dir}/${normalizedName}-build.json`, beautify(newBuild, null, 2, 80), 'utf8')
  // Done
  return newBuild
}
