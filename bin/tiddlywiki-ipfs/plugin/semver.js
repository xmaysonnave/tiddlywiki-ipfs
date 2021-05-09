#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const constants = require('../../constants.js')
const fs = require('fs')
const semver = require('../../semver.js')

const IpfsBundle = require('../../../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

async function main () {
  try {
    ipfsBundle.init()
    const name = '$:/plugins/ipfs'
    const normalizedName = ipfsBundle.filenamify(name)
    const dir = 'tiddlywiki-ipfs/plugin'
    const env = 'PLUGIN'
    const { build, version, kind } = await semver(`${name}.json`, 'json', dir, env)
    await semver(`${name}.zlib`, 'json', dir, env, version)
    const sourceMetadata = './core/plugin.info'
    const targetMetadata = './build/plugins/ipfs/plugin.info'
    const ipfsTargetMetadata = `./build/output/tiddlywiki-ipfs/plugin/${normalizedName}.zlib.ipfs-%BUILD_PLUGIN_VERSION%.json`
    const sourcePackage = './package.json'
    // retrieve current version from plugin.info
    const infoPlugin = JSON.parse(fs.readFileSync(sourceMetadata, 'utf8'))
    infoPlugin.build = build
    infoPlugin.version = version
    fs.writeFileSync(targetMetadata, beautify(infoPlugin, null, 2, 80), 'utf8')
    fs.writeFileSync(ipfsTargetMetadata, beautify(infoPlugin, null, 2, 80), 'utf8')
    await semver(`${name}.zlib.ipfs`, 'json', dir, env, version)
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
