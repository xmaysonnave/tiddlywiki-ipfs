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
      if (boot.version === undefined || boot.version == null) {
        throw new Error('Unknown boot version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_BOOT_VERSION%',
          replacement: boot.version,
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
      if (library.version === undefined || library.version == null) {
        throw new Error('Unknown library version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_LIBRARY_VERSION%',
          replacement: library.version,
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
      if (plugin.version === undefined || plugin.version == null) {
        throw new Error('Unknown plugin version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_PLUGIN_VERSION%',
          replacement: plugin.version,
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
      if (doc.version === undefined || doc.version == null) {
        throw new Error('Unknown documentation version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_DOCUMENTATION_VERSION%',
          replacement: doc.version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
      if (fs.existsSync('./build/tiddlers/assets/IPFS_Documentation_Assets.tid')) {
        replace({
          regex: '%BUILD_DOCUMENTATION_BUILD%',
          replacement: doc.build,
          paths: ['./build/tiddlers/assets/IPFS_Documentation_Assets.tid'],
          recursive: false,
          silent: true,
        })
        replace({
          regex: '%BUILD_DOCUMENTATION_VERSION%',
          replacement: doc.version,
          paths: ['./build/tiddlers/assets/IPFS_Documentation_Assets.tid'],
          recursive: false,
          silent: true,
        })
      }
    }

    // bluelightav
    var build = null
    var path = './build/output/editions/bluelightav/bluelightav-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const buildObject = JSON.parse(build)
      if (buildObject.version === undefined || buildObject.version == null) {
        throw new Error('Unknown bluelightav version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_BLUELIGHTAV_VERSION%',
          replacement: buildObject.version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
      if (fs.existsSync('./build/tiddlers/templates/tiddlywiki5.html.tid')) {
        replace({
          regex: '%BUILD_BLUELIGHTAV_VERSION%',
          replacement: `bluelightav-${buildObject.version}`,
          paths: ['./build/tiddlers/templates/tiddlywiki5.html.tid'],
          recursive: false,
          silent: true,
        })
      }
    }

    // dev
    var build = null
    var path = './build/output/editions/dev/dev-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const buildObject = JSON.parse(build)
      if (buildObject.version === undefined || buildObject.version == null) {
        throw new Error('Unknown dev version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_DEV_VERSION%',
          replacement: buildObject.version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
      if (fs.existsSync('./build/tiddlers/templates/tiddlywiki5.html.tid')) {
        replace({
          regex: '%BUILD_DEV_VERSION%',
          replacement: `dev-${buildObject.version}`,
          paths: ['./build/tiddlers/templates/tiddlywiki5.html.tid'],
          recursive: false,
          silent: true,
        })
      }
    }

    // empty
    var build = null
    var path = './build/output/editions/empty/empty-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const buildObject = JSON.parse(build)
      if (buildObject.version === undefined || buildObject.version == null) {
        throw new Error('Unknown empty version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_EMPTY_VERSION%',
          replacement: buildObject.version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
      if (fs.existsSync('./build/tiddlers/templates/tiddlywiki5.html.tid')) {
        replace({
          regex: '%BUILD_EMPTY_VERSION%',
          replacement: `empty-${buildObject.version}`,
          paths: ['./build/tiddlers/templates/tiddlywiki5.html.tid'],
          recursive: false,
          silent: true,
        })
      }
    }

    // tiddlywiki
    var build = null
    var path = './build/output/editions/tiddlywiki/tiddlywiki-build.json'
    if (fs.existsSync(path)) {
      build = fs.readFileSync(path, 'utf8')
    }
    if (build !== undefined && build !== null) {
      const buildObject = JSON.parse(build)
      if (buildObject.version === undefined || buildObject.version == null) {
        throw new Error('Unknown tiddlywiki version...')
      }
      if (fs.existsSync('./build/tiddlywiki.info')) {
        replace({
          regex: '%BUILD_TIDDLYWIKI_VERSION%',
          replacement: buildObject.version,
          paths: ['./build/tiddlywiki.info'],
          recursive: false,
          silent: true,
        })
      }
      if (fs.existsSync('./build/tiddlers/templates/tiddlywiki5.html.tid')) {
        replace({
          regex: '%BUILD_TIDDLYWIKI_VERSION%',
          replacement: `tiddlywiki-${buildObject.version}`,
          paths: ['./build/tiddlers/templates/tiddlywiki5.html.tid'],
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
