#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const createKeccakHash = require('keccak')
const dotenv = require('dotenv')
const filenamify = require('filenamify')
const fs = require('fs')
const { generate, validate } = require('build-number-generator')

module.exports = function main (name, extension, dir, env, version) {
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
  const rawSemver = process.env[`${env}_SEMVER`]
  if (rawSemver === undefined || rawSemver == null || rawSemver.trim() === '') {
    throw new Error(`Undefined 'env.${env}_SEMVER'...`)
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
    const currentObject = JSON.parse(fs.readFileSync(path, 'utf8'))
    for (var j = 0; j < currentObject.length; j++) {
      if (currentObject[j]._name === name) {
        current = currentObject[j]
        break
      }
    }
  }
  // Version
  var kind = null
  if (version === undefined || version == null) {
    if (current === undefined || current == null || (current !== undefined && current !== null && current._raw_hash !== rawHash)) {
      version = generate({ version: rawSemver, versionSeparator: '-' })
      kind = 'New version'
    } else {
      version = current._version
      kind = 'Current version'
    }
  } else {
    kind = 'Parent version'
  }
  // Check
  if (validate(version) === false) {
    throw new Error(`Invalid version: ${version}`)
  }
  console.log(`*** ${kind}: ${version}`)
  // Save
  const build = {
    _raw_hash: rawHash,
    _semver: rawSemver,
    _version: version,
  }
  fs.writeFileSync(`./build/output/${dir}/${fileName}-build.json`, beautify(build, null, 2, 80), 'utf8')
  // Done
  return version
}
