#!/usr/bin/env node
'use strict'

const constants = require('../../constants.js')
const fs = require('fs')
const filenamify = require('filenamify')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/library/sjcl'
    const dir = 'tiddlywiki-ipfs/sjcl'
    const env = 'SJCL'
    const normalizedName = filenamify(name, { replacement: '_' })
    await fs.copyFileSync(`./build/tiddlers/${normalizedName}.js`, `./build/output/${dir}/${normalizedName}.js`)
    const { version, kind } = await semver(`${name}.js.json`, 'json', dir, env)
    await semver(`${name}.js`, 'js', dir, env, version)
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
    await fs.copyFileSync(`./build/tiddlers/${normalizedName}.js`, `./production/${dir}/${normalizedName}.js-${version}.js`)
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
