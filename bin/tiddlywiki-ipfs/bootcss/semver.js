#!/usr/bin/env node
'use strict'

const fs = require('fs')
const filenamify = require('filenamify')

const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/boot/boot'
    const dir = 'tiddlywiki-ipfs/bootcss'
    const env = 'BOOT_CSS'
    const normalizedName = filenamify(name, { replacement: '_' })
    await fs.copyFileSync(`./build/tiddlers/${normalizedName}.css`, `./build/output/${dir}/${normalizedName}.css`)
    const { version } = await semver(`${name}.css.json`, 'json', dir, env)
    await fs.copyFileSync(`./build/tiddlers/${normalizedName}.css`, `./production/${dir}/${normalizedName}.css-${version}.css`)
    await semver(`${name}.css`, 'css', dir, env, version)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
