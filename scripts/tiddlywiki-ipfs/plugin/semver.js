#!/usr/bin/env node
'use strict'

const fs = require('fs')
const semver = require('../../semver.js')

function main () {
  try {
    const name = '$:/plugins/ipfs'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/plugin'
    const env = 'PLUGIN'

    const version = semver(name, extension, dir, env)

    const sourceMetadata = './tiddlers/plugins/ipfs/plugin.info'
    const targetMetadata = './build/plugins/ipfs/plugin.info'
    const sourcePackage = './package.json'

    // retrieve current version from plugin.info
    const infoPlugin = JSON.parse(fs.readFileSync(sourceMetadata, 'utf8'))
    // package.json
    const infoProject = JSON.parse(fs.readFileSync(sourcePackage, 'utf8'))

    // update version
    infoProject.version = version
    infoPlugin.version = version

    // update package.json
    var data = JSON.stringify(infoProject, null, 2)
    fs.writeFileSync(sourcePackage, data, 'utf8')

    // update plugin.info
    data = JSON.stringify(infoPlugin, null, 2)
    fs.writeFileSync(targetMetadata, data, 'utf8')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
