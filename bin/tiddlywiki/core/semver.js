#!/usr/bin/env node
'use strict'

const constants = require('bin/constants.js')
const fs = require('fs')
const semver = require('bin/semver.js')

const IpfsUtils = require('bin/ipfs-utils.js')
const ipfsUtils = new IpfsUtils()
const ipfsBundle = ipfsUtils.ipfsBundle

async function main () {
  try {
    const name = '$:/core'
    const normalizedName = ipfsBundle.filenamify(name)
    const dir = 'tiddlywiki/core'
    const env = 'TIDDLYWIKI_CORE'
    const { build, version, kind } = await semver(`${name}.json`, 'json', dir, env)
    await semver(`${name}.zlib`, 'json', dir, env, version)
    const sourceMetadata = `./build/output/tiddlywiki/core/${normalizedName}.json-%BUILD_TIDDLYWIKI_CORE_VERSION%.json`
    const ipfsTargetMetadata = `./build/output/tiddlywiki/core/${normalizedName}.zlib.ipfs-%BUILD_TIDDLYWIKI_CORE_VERSION%.json`
    const infoPlugin = JSON.parse(fs.readFileSync(sourceMetadata, 'utf8'))
    infoPlugin.build = build
    infoPlugin.version = version
    delete infoPlugin.text
    fs.writeFileSync(ipfsTargetMetadata, ipfsUtils.getJson(infoPlugin), 'utf8')
    await semver(`${name}.zlib.ipfs`, 'json', dir, env, version)
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
