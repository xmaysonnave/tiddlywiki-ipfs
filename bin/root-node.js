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
  branch = branch == null || branch === undefined || branch.trim() === '' ? null : branch.trim()
  branch = branch || process.env.BRANCH || 'main'

  // current root node
  var node = null
  var path = './current/node.json'
  if (fs.existsSync(path)) {
    node = fs.readFileSync(path, 'utf8')
  }
  if (!node) {
    throw new Error(`Unknown root node: ${path}`)
  }

  // README.md
  var readme = null
  var readmeRawPath = './README_RAW.md'
  var readmePath = './README.md'
  if (fs.existsSync(readmeRawPath)) {
    fs.copyFileSync(readmeRawPath, readmePath)
    readme = fs.readFileSync(readmePath, 'utf8')
  }
  if (!readme) {
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

  // root node
  const root = JSON.parse(node)
  if (!root._cid_uri) {
    throw new Error('Unknown root node uri...')
  }
  var rootUri = root._cid_uri
  if (root._parent_uri) {
    rootUri = `${root._parent_uri}`
  }
  replace({
    regex: '%BUILD_ROOT_NODE%',
    replacement: rootUri,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })
  // build node
  var buildUri = root._cid_uri
  if (root._parent_uri) {
    buildUri = `${root._parent_uri}/${root._source_path}`
  }
  replace({
    regex: '%BUILD_NODE%',
    replacement: buildUri,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  var current = null

  // boot
  var path = './current/tiddlywiki-ipfs/boot/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (!current) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (!Array.isArray(current)) {
    throw new Error(`Array expected: ${path}...`)
  }
  var version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/boot/boot.js') {
      version = current[i]._version
      break
    }
  }
  if (!version) {
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
  var path = './current/tiddlywiki-ipfs/library/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (!current) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (!Array.isArray(current)) {
    throw new Error(`Array expected: ${path}...`)
  }
  version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/library/ipfs-library-modules.js') {
      version = current[i]._version
      break
    }
  }
  if (!version) {
    throw new Error(`Unknown '$:/library/ipfs-library-modules.js': ${path}`)
  }
  replace({
    regex: '%BUILD_LIBRARY_VERSION%',
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // plugin
  var path = './current/tiddlywiki-ipfs/plugin/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (!current) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (!Array.isArray(current)) {
    throw new Error(`Array expected: ${path}...`)
  }
  version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/plugins/ipfs.js') {
      version = current[i]._version
      break
    }
  }
  if (!version) {
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
  var path = './current/tiddlywiki-ipfs/documentation/current.json'
  if (fs.existsSync(path)) {
    current = fs.readFileSync(path, 'utf8')
  }
  if (!current) {
    throw new Error(`Unknown current: ${path}`)
  }
  current = JSON.parse(current)
  if (!Array.isArray(current)) {
    throw new Error(`Array expected: ${path}...`)
  }
  version = null
  for (var i = 0; i < current.length; i++) {
    if (current[i]._name === '$:/ipfs/documentation.json') {
      version = current[i]._version
      break
    }
  }
  if (!version) {
    throw new Error(`Unknown '$:/ipfs/documentation.json': ${path}`)
  }
  replace({
    regex: '%BUILD_DOCUMENTATION_VERSION%',
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })
}
