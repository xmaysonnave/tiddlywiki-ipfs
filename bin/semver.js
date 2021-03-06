#!/usr/bin/env node
'use strict'

const { generate, validate } = require('build-number-generator')
const dotenv = require('dotenv')
const filenamify = require('filenamify')
const fs = require('fs')
const createKeccakHash = require('keccak')

module.exports = function main (name, extension, dir, env, version) {
  // Check
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
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
    path = `./build/output/${dir}/${fileName}.${extension}-%BUILD_${env}_VERSION%.json`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
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
    throw new Error('Unknown raw content...')
  }
  // Keccak
  const keccak = createKeccakHash('keccak256')
  keccak.update(raw)
  const rawHash = keccak.digest('hex')
  console.log(`*** ${name}, hash: ${rawHash} ***`)

  // Current
  var current = null
  var member = null
  var path = `./current/${dir}/current.json`
  if (fs.existsSync(path)) {
    current = JSON.parse(fs.readFileSync(path, 'utf8'))
    if (current) {
      if (Array.isArray(current) === false) {
        throw new Error(`Unknown structure: ${path}...`)
      }
      // Member lookup
      for (var j = 0; j < current.length; j++) {
        if (current[j]._name === name) {
          member = current[j]
          break
        }
      }
    }
  }

  // Version
  if (version === undefined || version == null) {
    if (member === undefined || member == null || (member !== undefined && member !== null && member._raw_hash !== rawHash)) {
      if (validate(rawSemver) === false) {
        version = generate({ version: rawSemver, versionSeparator: '-' })
        console.log(`*** new version: ${version} ***`)
      }
    } else {
      version = member._version
      console.log(`*** use current version: ${version} ***`)
    }
  } else {
    console.log(`*** use parent version: ${version} ***`)
  }
  // Check
  if (validate(version) === false) {
    throw new Error(`Invalid version: ${version}`)
  }

  // Save
  const toJson = {
    _raw_hash: rawHash,
    _semver: rawSemver,
    _version: version,
  }
  fs.writeFileSync(`./build/output/${dir}/${fileName}_build.json`, JSON.stringify(toJson), 'utf8')

  return version
}
