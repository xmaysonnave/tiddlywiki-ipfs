#!/usr/bin/env node
'use strict'

const fs = require('fs')
const replace = require('replace')

function main () {
  try {
    // boot
    var boot = null
    var path = './build/output/tiddlywiki-ipfs/boot/$_boot_boot.js_build.json'
    if (fs.existsSync(path)) {
      boot = fs.readFileSync(path, 'utf8')
    }
    if (!boot) {
      throw new Error('Unknown boot build...')
    }

    // library
    var library = null
    path = './build/output/tiddlywiki-ipfs/library/$_library_ipfs-library-modules.js_build.json'
    if (fs.existsSync(path)) {
      library = fs.readFileSync(path, 'utf8')
    }
    if (!library) {
      throw new Error('Unknown library build...')
    }

    // plugin
    var plugin = null
    path = './build/output/tiddlywiki-ipfs/plugin/$_plugins_ipfs.js_build.json'
    if (fs.existsSync(path)) {
      plugin = fs.readFileSync(path, 'utf8')
    }
    if (!plugin) {
      throw new Error('Unknown plugin build...')
    }

    // documentation
    var documentation = null
    path = './build/output/tiddlywiki-ipfs/documentation/$_ipfs_documentation.json_build.json'
    if (fs.existsSync(path)) {
      documentation = fs.readFileSync(path, 'utf8')
    }
    if (!documentation) {
      throw new Error('Unknown documentation build...')
    }

    // boot
    var { _version } = JSON.parse(boot)
    if (_version === undefined || _version == null) {
      throw new Error('Unknown boot version...')
    }

    replace({
      regex: `%BUILD_BOOT_SEMVER%`,
      replacement: _version,
      paths: ['./build/tiddlywiki.info'],
      recursive: false,
      silent: true,
    })

    // library
    var { _version } = JSON.parse(library)
    if (_version === undefined || _version == null) {
      throw new Error('Unknown library version...')
    }

    replace({
      regex: `%BUILD_LIBRARY_SEMVER%`,
      replacement: _version,
      paths: ['./build/tiddlywiki.info'],
      recursive: false,
      silent: true,
    })

    // plugin
    var { _version } = JSON.parse(plugin)
    if (_version === undefined || _version == null) {
      throw new Error('Unknown plugin version...')
    }

    replace({
      regex: `%BUILD_PLUGIN_SEMVER%`,
      replacement: _version,
      paths: ['./build/tiddlywiki.info'],
      recursive: false,
      silent: true,
    })

    // documentation
    var { _version } = JSON.parse(documentation)
    if (_version === undefined || _version == null) {
      throw new Error('Unknown documentation version...')
    }

    replace({
      regex: `%BUILD_DOCUMENTATION_SEMVER%`,
      replacement: _version,
      paths: ['./build/tiddlywiki.info'],
      recursive: false,
      silent: true,
    })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
