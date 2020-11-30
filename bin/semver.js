#!/usr/bin/env node
'use strict'

const { generate, validate } = require('build-number-generator')
const dotenv = require('dotenv')
const filenamify = require('filenamify')
const fs = require('fs')
const replace = require('replace')
const createKeccakHash = require('keccak')

module.exports = function main (name, extension, dir, env) {
  // Check
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
  env =
    env == null || env === undefined || env.trim() === '' ? null : env.trim()
  if (!env) {
    throw new Error('Unknown env...')
  }
  const rawSemver = process.env[`${env}_SEMVER`]
  if (!rawSemver || rawSemver.trim() === '') {
    throw new Error(`Undefined 'env.${env}_SEMVER'...`)
  }

  // Process Raw
  var raw = null
  const fileName = filenamify(name, { replacement: '_' })
  // Load
  var path = `./build/output/${dir}/${fileName}-%BUILD_${env}_SEMVER%.${extension}`
  if (fs.existsSync(path)) {
    raw = fs.readFileSync(path, 'utf8')
  }
  if (!raw) {
    path = `./build/output/${dir}/${fileName}.${extension}-%BUILD_${env}_SEMVER%.json`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
  }
  if (!raw) {
    path = `./build/output/${dir}/${fileName}.${extension}`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
  }
  if (!raw) {
    throw new Error('Unknown raw content...')
  }
  // Keccak
  const keccak = createKeccakHash('keccak256')
  keccak.update(raw)
  const rawHash = keccak.digest('hex')
  console.log(`*** ${name}, hash: ${rawHash} ***`)

  var _rawHash = null
  var version = null

  // Current
  if (fs.existsSync(`./current/${dir}/${fileName}.${extension}.json`)) {
    const current = fs.readFileSync(
      `./current/${dir}/${fileName}.${extension}.json`,
      'utf8'
    )
    var { _raw_hash: _rawHash, _version: version } = JSON.parse(current)
  }

  // Version
  if (rawHash !== _rawHash) {
    if (!validate(rawSemver)) {
      version = generate({ version: rawSemver, versionSeparator: '-' })
      console.log(`*** new version: ${version} ***`)
    }
  } else {
    console.log(`*** use current version: ${version} ***`)
  }
  // Check
  if (!validate(version)) {
    throw new Error(`Invalid version: ${version}`)
  }

  // Set version
  replace({
    regex: `%BUILD_${env}_SEMVER%`,
    replacement: version,
    paths: ['./build/tiddlywiki.info'],
    recursive: false,
    silent: true
  })

  // Save
  const toJson = {
    _raw_hash: rawHash,
    _semver: rawSemver,
    _version: version
  }
  fs.writeFileSync(
    `./build/output/${dir}/${fileName}.${extension}_build.json`,
    JSON.stringify(toJson),
    'utf8'
  )

  return version
}
