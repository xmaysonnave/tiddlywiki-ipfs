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
  const boot = JSON.parse(current)
  replace({
    regex: '%BUILD_BOOT_VERSION%',
    replacement: boot._version,
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
  const library = JSON.parse(current)
  replace({
    regex: '%BUILD_LIBRARY_VERSION%',
    replacement: library._version,
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
  const plugin = JSON.parse(current)
  replace({
    regex: '%BUILD_PLUGIN_VERSION%',
    replacement: plugin._version,
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
  const doc = JSON.parse(current)
  replace({
    regex: '%BUILD_DOCUMENTATION_VERSION%',
    replacement: doc._version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })
}
