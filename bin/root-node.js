#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const replace = require('replace')

module.exports = function main (branch) {
  // Check
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  branch = branch !== undefined && branch !== null && branch.trim() !== '' ? branch.trim() : null
  branch = branch || process.env.BRANCH || 'main'

  // current build
  var node = null
  var path = './current/build.json'
  if (fs.existsSync(path)) {
    node = fs.readFileSync(path, 'utf8')
  }
  if (node === false) {
    throw new Error(`Unknown build: ${path}`)
  }

  // README.md
  var readme = null
  var readmeRawPath = './README_RAW.md'
  var readmePath = './README.md'
  if (fs.existsSync(readmeRawPath)) {
    fs.copyFileSync(readmeRawPath, readmePath)
    readme = fs.readFileSync(readmePath, 'utf8')
  }
  if (readme == null) {
    throw new Error('Unknown README.md...')
  }

  // branch
  replace({
    regex: '%BRANCH%',
    replacement: branch,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  const build = JSON.parse(node)
  if (build._source_uri === undefined || build._source_uri === null) {
    throw new Error('Unknown build uri...')
  }

  // build
  var buildUri = build._source_uri
  replace({
    regex: '%BUILD_NODE%',
    replacement: buildUri,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // boot
  var current = null
  var path = './current/tiddlywiki-ipfs/boot/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (current == null) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (Array.isArray(current) === false) {
    throw new Error(`Array expected: ${path}...`)
  }
  var version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/boot/boot.js') {
      version = current[i]._version
      break
    }
  }
  if (version == null) {
    throw new Error(`Unknown '$:/boot/boot.js': ${path}`)
  }
  replace({
    regex: '%BUILD_BOOT_VERSION%',
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // library
  var current = null
  var path = './current/tiddlywiki-ipfs/library/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (current == null) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (Array.isArray(current) === false) {
    throw new Error(`Array expected: ${path}...`)
  }
  var version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/library/ipfs-modules.js') {
      version = current[i]._version
      break
    }
  }
  if (version == null) {
    throw new Error(`Unknown '$:/library/ipfs-modules.js': ${path}`)
  }
  replace({
    regex: '%BUILD_LIBRARY_VERSION%',
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // plugin
  var current = null
  var path = './current/tiddlywiki-ipfs/plugin/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (current == null) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (Array.isArray(current) === false) {
    throw new Error(`Array expected: ${path}...`)
  }
  var version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/plugins/ipfs.js') {
      version = current[i]._version
      break
    }
  }
  if (version == null) {
    throw new Error(`Unknown '$:/plugins/ipfs.js': ${path}`)
  }
  replace({
    regex: '%BUILD_PLUGIN_VERSION%',
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // documentation
  var current = null
  var path = './current/tiddlywiki-ipfs/documentation/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (current == null) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (Array.isArray(current) === false) {
    throw new Error(`Array expected: ${path}...`)
  }
  var version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/ipfs/documentation') {
      version = current[i]._version
      break
    }
  }
  if (version == null) {
    throw new Error(`Unknown '$:/ipfs/documentation': ${path}`)
  }
  replace({
    regex: '%BUILD_DOCUMENTATION_VERSION%',
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })
}
