#!/usr/bin/env node
'use strict'

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
    const { version } = await semver(`${name}.js.json`, 'json', dir, env)
    await fs.copyFileSync(`./build/tiddlers/${normalizedName}.js`, `./production/${dir}/${normalizedName}.js-${version}.js`)
    await semver(`${name}.js`, 'js', dir, env, version)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
