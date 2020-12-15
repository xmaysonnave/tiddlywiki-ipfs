#!/usr/bin/env node
'use strict'

const replace = require('replace')
const semver = require('../../semver.js')

function main () {
  try {
    const name = '$:/boot/boot'
    const extension = 'js'
    const dir = 'tiddlywiki-ipfs/boot'
    const env = 'BOOT'

    const version = semver(name, extension, dir, env)

    replace({
      regex: `%BUILD_${env}_SEMVER%`,
      replacement: version,
      paths: ['./build/tiddlers/$_boot_boot.js.meta'],
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
