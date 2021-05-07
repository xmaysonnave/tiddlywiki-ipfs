#!/usr/bin/env node
'use strict'

const constants = require('../../constants.js')
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
    const { version, kind } = await semver(`${name}.css.json`, 'json', dir, env)
    await semver(`${name}.css`, 'css', dir, env, version)
    const exists = fs.existsSync(`./production/${dir}`)
    if (exists && kind === constants.UNCHANGED) {
      console.log('***')
      process.exit(2)
    }
    if (exists) {
      await fs.rmdirSync(`./production/${dir}`, {
        recursive: true,
      })
    }
    await fs.mkdirSync(`./production/${dir}`, true)
    await fs.copyFileSync(`./build/tiddlers/${normalizedName}.css`, `./production/${dir}/${normalizedName}.css-${version}.css`)
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
