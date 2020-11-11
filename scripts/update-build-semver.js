#!/usr/bin/env node
'use strict'

const fs = require('fs')
const replace = require('replace')

function main () {
  const semver = fs.readFileSync('./build/output/.build-semver.json', 'utf8')
  if (!semver) {
    throw new Error('Unknown version...')
  }
  const { version, encoded } = JSON.parse(semver)
  if (!version) {
    throw new Error('Unknown version...')
  }
  if (!encoded) {
    throw new Error('Unknown encoded version...')
  }

  replace({
    regex: '%BUILD_SEMVER%',
    replacement: `${version}`,
    paths: ['./build/tiddlers/boot/boot.js'],
    recursive: false,
    silent: true
  })

  replace({
    regex: '%BUILD_SEMVER%',
    replacement: `-${encoded}`,
    paths: ['./build/tiddlywiki.info'],
    recursive: false,
    silent: true
  })

  // https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j
  var files = fs
    .readdirSync('./build/tiddlers/system', { withFileTypes: true })
    .filter(item => !item.isDirectory())
    .map(item => item.name)
  for (var i = 0; i < files.length; i++) {
    if (files[i].endsWith('.meta')) {
      replace({
        regex: '%BUILD_SEMVER%',
        replacement: `${version}`,
        paths: [`./build/tiddlers/system/${files[i]}`],
        recursive: false,
        silent: true
      })
    }
  }
}

try {
  main()
} catch (error) {
  console.error(error)
  return 1
}
