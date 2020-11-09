#!/usr/bin/env node
'use strict'

var fs = require('fs')
var version = fs.readFileSync('.build-number', 'UTF-8')

var replace = require('replace')
replace({
  regex: '%BUILD_NUMBER%',
  replacement: `${version}`,
  paths: ['./build/tiddlers/boot/boot.js'],
  recursive: false,
  silent: true
})

var replace = require('replace')
replace({
  regex: '%BUILD_NUMBER%',
  replacement: `-${version}`,
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
      regex: '%BUILD_NUMBER%',
      replacement: `${version}`,
      paths: [`./build/tiddlers/system/${files[i]}`],
      recursive: false,
      silent: true
    })
  }
}

return 0
