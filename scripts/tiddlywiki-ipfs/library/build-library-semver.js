#!/usr/bin/env node
'use strict'

const fs = require('fs')
const replace = require('replace')
const semver = require('../../build-semver.js')

async function main () {
  try {
    const name = '$:/library/ipfs-library-modules.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/library'
    const env = 'LIBRARY'

    const version = semver(name, extension, dir, env)

    // https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j
    var files = fs
      .readdirSync('./build/tiddlers/system', { withFileTypes: true })
      .filter(item => !item.isDirectory())
      .map(item => item.name)
    for (var i = 0; i < files.length; i++) {
      if (files[i].endsWith('.meta')) {
        replace({
          regex: `%BUILD_${env}_SEMVER%`,
          replacement: version,
          paths: [`./build/tiddlers/system/${files[i]}`],
          recursive: false,
          silent: true
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
