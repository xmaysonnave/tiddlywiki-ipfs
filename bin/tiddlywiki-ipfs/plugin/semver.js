#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const constants = require('../../constants.js')
const fs = require('fs')
const semver = require('../../semver.js')

async function main () {
  try {
    const name = '$:/plugins/ipfs'
    const dir = 'tiddlywiki-ipfs/plugin'
    const env = 'PLUGIN'
    const { build, version, kind } = await semver(`${name}.json`, 'json', dir, env)
    await semver(`${name}.zlib`, 'json', dir, env, version)
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
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
