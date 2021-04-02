#!/usr/bin/env node
'use strict'

const replace = require('replace')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/boot/boot.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/boot'
    const env = 'BOOT'
    const { build, version } = await semver(name, extension, dir, env)
    replace({
      regex: `%BUILD_${env}_BUILD%`,
      replacement: build,
      paths: ['./build/tiddlers/$_boot_boot.js.meta'],
      recursive: false,
      silent: true,
    })
    replace({
      regex: `%BUILD_${env}_VERSION%`,
      replacement: version,
      paths: ['./build/tiddlers/$_boot_boot.js.meta'],
      recursive: false,
      silent: true,
    })
    await semver(`${name}.zlib`, extension, dir, env, version)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
