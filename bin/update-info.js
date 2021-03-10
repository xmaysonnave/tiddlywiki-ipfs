#!/usr/bin/env node
'use strict'

const fs = require('fs')
const replace = require('replace')

function main () {
  try {
    var build = null

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

    // boot
    var path = './build/output/tiddlywiki-ipfs/boot/$_boot_boot.js-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build) {
      const boot = JSON.parse(build)
      if (!boot._version) {
        throw new Error('Unknown boot version...')
      }
      replace({
        regex: '%BUILD_BOOT_VERSION%',
        replacement: boot._version,
        paths: ['./build/tiddlywiki.info'],
        recursive: false,
        silent: true,
      })
    }

    // library
    path = './build/output/tiddlywiki-ipfs/library/$_library_ipfs-modules.js-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build) {
      const library = JSON.parse(build)
      if (!library._version) {
        throw new Error('Unknown library version...')
      }
      replace({
        regex: '%BUILD_LIBRARY_VERSION%',
        replacement: library._version,
        paths: ['./build/tiddlywiki.info'],
        recursive: false,
        silent: true,
      })
    }

    // plugin
    path = './build/output/tiddlywiki-ipfs/plugin/$_plugins_ipfs.js-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build) {
      const plugin = JSON.parse(build)
      if (!plugin._version) {
        throw new Error('Unknown plugin version...')
      }
      replace({
        regex: '%BUILD_PLUGIN_VERSION%',
        replacement: plugin._version,
        paths: ['./build/tiddlywiki.info'],
        recursive: false,
        silent: true,
      })
    }

    // documentation
    path = './build/output/tiddlywiki-ipfs/documentation/$_ipfs_documentation-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build) {
      const doc = JSON.parse(build)
      if (!doc._version) {
        throw new Error('Unknown documentation version...')
      }
      replace({
        regex: '%BUILD_DOCUMENTATION_VERSION%',
        replacement: doc._version,
        paths: ['./build/tiddlywiki.info'],
        recursive: false,
        silent: true,
      })
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
