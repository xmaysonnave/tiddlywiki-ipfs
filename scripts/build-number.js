#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const result = dotenv.config()
if (result.error) {
  console.error(result.error)
  return 1
}

const fs = require('fs')
const { generate, validate } = require('build-number-generator')
const sourceMetadata = './tiddlers/plugins/ipfs/plugin.info'
const targetMetadata = './build/plugins/ipfs/plugin.info'
const sourcePackage = './package.json'

// retrieve current version from plugin.info
var rawdata = fs.readFileSync(sourceMetadata)
var infoPlugin = JSON.parse(rawdata)
if (infoPlugin.version) {
  console.log(`${sourceMetadata}: ${infoPlugin.version}`)
}

// retrieve version from env
var version = process.env.VERSION
// env priority
if (version === undefined || version == null || version.trim() === '') {
  // Fallback
  if (infoPlugin.version === undefined) {
    console.error("Undefined 'plugin.info' version...")
    return 1
  }
  version = infoPlugin.version
} else {
  console.log(`env: ${version}`)
}

// package.json
rawdata = fs.readFileSync(sourcePackage)
var infoProject = JSON.parse(rawdata)
if (infoProject.version === undefined) {
  console.error("Undefined 'package.json' version...")
  return 1
}
console.log(`${sourcePackage}: ${infoProject.version}`)

// Generate new version if applicable
if (validate(version) === false) {
  version = generate({ version: version, versionSeparator: '+build' })
}
console.log(`version: ${version}`)

// update version
infoProject.version = version
infoPlugin.version = version

// update package.json
var data = JSON.stringify(infoProject, null, 2)
fs.writeFileSync(sourcePackage, data, 'UTF-8')

// update plugin.info
data = JSON.stringify(infoPlugin, null, 2)
fs.writeFileSync(targetMetadata, data, 'UTF-8')

// README.md
var file = fs.readFileSync('README.md', 'UTF-8')
fs.writeFileSync('README.md', file, 'UTF-8')

// Save version
fs.writeFileSync('.build-number', version, 'UTF-8')

return 0
