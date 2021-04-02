#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const fs = require('fs')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/plugins/ipfs.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/plugin'
    const env = 'PLUGIN'
    const { build, version } = await semver(name, extension, dir, env)
    const sourceMetadata = './core/plugin.info'
    const targetMetadata = './build/plugins/ipfs/plugin.info'
    const sourcePackage = './package.json'
    // retrieve current version from plugin.info
    const infoPlugin = JSON.parse(fs.readFileSync(sourceMetadata, 'utf8'))
    infoPlugin.build = build
    infoPlugin.version = version
    fs.writeFileSync(targetMetadata, beautify(infoPlugin, null, 2, 80), 'utf8')
    // retrieve current version from package.json
    const infoProject = JSON.parse(fs.readFileSync(sourcePackage, 'utf8'))
    infoProject.version = version
    fs.writeFileSync(sourcePackage, beautify(infoProject, null, 2, 80), 'utf8')
    await semver(`${name}.zlib`, extension, dir, env, version)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
