#!/usr/bin/env node
'use strict'

const constants = require('../../constants.js')
const fs = require('fs')
const filenamify = require('filenamify')
const replace = require('replace')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/library/ipfs'
    const dir = 'tiddlywiki-ipfs/library'
    const env = 'LIBRARY'
    const normalizedName = filenamify(name, { replacement: '_' })
    const { build, version, kind } = await semver(`${name}.js.json`, 'json', dir, env)
    await semver(`${name}.js`, 'js', dir, env, version)
    // https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j
    var files = fs
      .readdirSync('./build/tiddlers', { withFileTypes: true })
      .filter(item => !item.isDirectory())
      .map(item => item.name)
    for (var i = 0; i < files.length; i++) {
      if (files[i].endsWith('.meta')) {
        replace({
          regex: `%BUILD_${env}_BUILD%`,
          replacement: build,
          paths: [`./build/tiddlers/${files[i]}`],
          recursive: false,
          silent: true,
        })
        replace({
          regex: `%BUILD_${env}_VERSION%`,
          replacement: version,
          paths: [`./build/tiddlers/${files[i]}`],
          recursive: false,
          silent: true,
        })
      }
    }
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
    await fs.copyFileSync(`./build/output/${dir}/${normalizedName}.js`, `./production/${dir}/${normalizedName}.js-${version}.js`)
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
