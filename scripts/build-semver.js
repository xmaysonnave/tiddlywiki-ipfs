#!/usr/bin/env node
'use strict'

const { generate, validate } = require('build-number-generator')
const dotenv = require('dotenv')
const fs = require('fs')

function main () {
  const result = dotenv.config()
  if (result.error) {
    throw result.error
  }

  const sourceMetadata = './tiddlers/plugins/ipfs/plugin.info'
  const targetMetadata = './build/plugins/ipfs/plugin.info'
  const sourcePackage = './package.json'

  // retrieve current version from plugin.info
  var rawdata = fs.readFileSync(sourceMetadata, 'utf8')
  var infoPlugin = JSON.parse(rawdata)
  if (infoPlugin.version) {
    console.log(`${sourceMetadata}: ${infoPlugin.version}`)
  }

  // retrieve version from env
  var version = process.env.SEMVER
  // env priority
  if (!version || version.trim() === '') {
    // Fallback
    if (!infoPlugin.version) {
      throw new Error("Undefined 'plugin.info' version...")
    }
    version = infoPlugin.version
  } else {
    console.log(`semver: ${version}`)
  }

  // package.json
  rawdata = fs.readFileSync(sourcePackage, 'utf8')
  var infoProject = JSON.parse(rawdata)
  if (!infoProject.version) {
    throw new Error("Undefined 'package.json' version...")
  }
  console.log(`${sourcePackage}: ${infoProject.version}`)

  // Generate new version if applicable
  if (!validate(version)) {
    version = generate({ version: version, versionSeparator: '+build' })
  }
  console.log(`version: ${version}`)

  // update version
  infoProject.version = version
  infoPlugin.version = version

  // update package.json
  var data = JSON.stringify(infoProject, null, 2)
  fs.writeFileSync(sourcePackage, data, 'utf8')

  // update plugin.info
  data = JSON.stringify(infoPlugin, null, 2)
  fs.writeFileSync(targetMetadata, data, 'utf8')

  // README.md
  var file = fs.readFileSync('README.md', 'utf8')
  fs.writeFileSync('README.md', file, 'utf8')

  // Save
  const content = JSON.stringify({ version })
  fs.writeFileSync('./build/output/.build-semver.json', content, 'utf8')
}

try {
  main()
} catch (error) {
  console.error(error)
  return 1
}

return 0
