#!/usr/bin/env node
'use strict'

const fs = require('fs')
const replace = require('replace')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/library/ipfs-modules.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/library'
    const env = 'LIBRARY'
    const { build, version } = await semver(name, extension, dir, env)
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
    await semver(`${name}.zlib`, extension, dir, env, version)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
