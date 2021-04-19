#!/usr/bin/env node
'use strict'

const fs = require('fs')
const filenamify = require('filenamify')
const replace = require('replace')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/boot/boot'
    const dir = 'tiddlywiki-ipfs/boot'
    const env = 'BOOT'
    const normalizedName = filenamify(name, { replacement: '_' })
    const { build, version } = await semver(`${name}.js.json`, 'json', dir, env)
    await fs.copyFileSync(`./build/output/${dir}/${normalizedName}.js`, `./production/${dir}/${normalizedName}.js-${version}.js`)
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
    await semver(`${name}.js`, 'js', dir, env, version)
    await semver(`${name}.js.zlib`, 'json', dir, env, version)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
