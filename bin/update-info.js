#!/usr/bin/env node
'use strict'

const fs = require('fs')
const replace = require('replace')

function main () {
  try {
    if (fs.existsSync('./build/tiddlywiki.info')) {
      // Derived Public Key
      replace({
        regex: '%DEV_DERIVED_PUBLIC_KEY%',
        replacement: process.env.DEV_DERIVED_PUBLIC_KEY,
        paths: ['./build/tiddlywiki.info'],
        recursive: false,
        silent: true,
      })
      // Private Key
      replace({
        regex: '%DEV_PRIVATE_KEY%',
        replacement: process.env.DEV_PRIVATE_KEY,
        paths: ['./build/tiddlywiki.info'],
        recursive: false,
        silent: true,
      })
    }

    // boot
    var build = null
    var path = './build/output/tiddlywiki-ipfs/boot/$_boot_boot.js-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const boot = JSON.parse(build)
      if (boot._version === undefined || boot._version == null) {
        throw new Error('Unknown boot version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_BOOT_VERSION%',
          replacement: boot._version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
    }

    // library
    var build = null
    var path = './build/output/tiddlywiki-ipfs/library/$_library_ipfs-modules.js-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const library = JSON.parse(build)
      if (library._version === undefined || library._version == null) {
        throw new Error('Unknown library version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_LIBRARY_VERSION%',
          replacement: library._version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
    }

    // plugin
    var build = null
    var path = './build/output/tiddlywiki-ipfs/plugin/$_plugins_ipfs.js-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const plugin = JSON.parse(build)
      if (plugin._version === undefined || plugin._version == null) {
        throw new Error('Unknown plugin version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_PLUGIN_VERSION%',
          replacement: plugin._version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
    }

    // documentation
    var build = null
    var path = './build/output/tiddlywiki-ipfs/documentation/$_ipfs_documentation-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const doc = JSON.parse(build)
      if (doc._version === undefined || doc._version == null) {
        throw new Error('Unknown documentation version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_DOCUMENTATION_VERSION%',
          replacement: doc._version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
      if (fs.existsSync('./build/tiddlers/assets/IPFS_Documentation_Assets.tid')) {
        replace({
          regex: '%BUILD_DOCUMENTATION_VERSION%',
          replacement: doc._version,
          paths: ['./build/tiddlers/assets/IPFS_Documentation_Assets.tid'],
          recursive: false,
          silent: true,
        })
      }
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
