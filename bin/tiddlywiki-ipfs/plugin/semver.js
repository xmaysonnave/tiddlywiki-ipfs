#!/usr/bin/env node
'use strict'

const fs = require('fs')
const semver = require('../../semver.js')

function main () {
  try {
    const name = '$:/plugins/ipfs.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/plugin'
    const env = 'PLUGIN'

    const version = semver(name, extension, dir, env)

    const sourceMetadata = './core/plugin.info'
    const targetMetadata = './build/plugins/ipfs/plugin.info'
    // const sourcePackage = './package.json'

    // retrieve current version from plugin.info
    const infoPlugin = JSON.parse(fs.readFileSync(sourceMetadata, 'utf8'))
    infoPlugin.version = version
    // update
    var data = JSON.stringify(infoPlugin, null, 2)
    fs.writeFileSync(targetMetadata, data, 'utf8')

    // retrieve current version from package.json
    // const infoProject = JSON.parse(fs.readFileSync(sourcePackage, 'utf8'))
    // infoProject.version = version
    // update
    // data = JSON.stringify(infoProject, null, 2)
    // fs.writeFileSync(sourcePackage, data, 'utf8')
    semver('$:/plugins/ipfs.js.zlib', 'json.zlib', dir, env, version)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
