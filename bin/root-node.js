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
  const gateway = process.env.GATEWAY ? process.env.GATEWAY : 'https://dweb.link/'

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

  // gateway
  replace({
    regex: `%GATEWAY%`,
    replacement: gateway,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // branch
  replace({
    regex: `%BRANCH%`,
    replacement: branch,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // root node
  /*eslint camelcase:"off"*/
  var { _cid_uri } = JSON.parse(node)
  if (_cid_uri === undefined || _cid_uri == null) {
    throw new Error('Unknown root node uri...')
  }

  replace({
    regex: `%BUILD_ROOT_NODE%`,
    replacement: `ipfs/${_cid_uri}`,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  var version = null

  // boot
  var boot = null
  var path = './current/tiddlywiki-ipfs/boot/current.json'
  if (fs.existsSync(path)) {
    boot = fs.readFileSync(path, 'utf8')
  }
  if (!boot) {
    throw new Error(`Unknown current: ${path}`)
  }
  var { _version: version } = JSON.parse(boot)
  replace({
    regex: `%BUILD_BOOT_VERSION%`,
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // library
  var library = null
  var path = './current/tiddlywiki-ipfs/library/current.json'
  if (fs.existsSync(path)) {
    library = fs.readFileSync(path, 'utf8')
  }
  if (!library) {
    throw new Error(`Unknown current: ${path}`)
  }
  var { _version: version } = JSON.parse(library)
  replace({
    regex: `%BUILD_LIBRARY_VERSION%`,
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // plugin
  var plugin = null
  var path = './current/tiddlywiki-ipfs/plugin/current.json'
  if (fs.existsSync(path)) {
    plugin = fs.readFileSync(path, 'utf8')
  }
  if (!plugin) {
    throw new Error(`Unknown current: ${path}`)
  }
  var { _version: version } = JSON.parse(plugin)
  replace({
    regex: `%BUILD_PLUGIN_VERSION%`,
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })

  // documentation
  var doc = null
  var path = './current/tiddlywiki-ipfs/documentation/current.json'
  if (fs.existsSync(path)) {
    doc = fs.readFileSync(path, 'utf8')
  }
  if (!doc) {
    throw new Error(`Unknown current: ${path}`)
  }
  var { _version: version } = JSON.parse(doc)
  replace({
    regex: `%BUILD_DOCUMENTATION_VERSION%`,
    replacement: version,
    paths: [readmePath],
    recursive: false,
    silent: true,
  })
}
