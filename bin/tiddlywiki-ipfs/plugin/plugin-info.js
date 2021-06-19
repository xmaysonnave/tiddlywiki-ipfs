#!/usr/bin/env node
'use strict'

const fs = require('fs')

const IpfsUtils = require('bin/ipfs-utils.js')
const ipfsUtils = new IpfsUtils()
const ipfsBundle = ipfsUtils.ipfsBundle

async function main () {
  try {
    var member = null
    const name = '$:/plugins/ipfs'
    const normalizedName = ipfsBundle.filenamify(name)
    const current = JSON.parse(fs.readFileSync('./current/tiddlywiki-ipfs/plugin/current.json', 'utf8'))
    for (var j = 0; j < current.content.length; j++) {
      if (current.content[j].name === '$:/plugins/ipfs.zlib') {
        member = current.content[j]
        break
      }
    }
    const infoPlugin = JSON.parse(fs.readFileSync(`./build/output/tiddlywiki-ipfs/plugin/${normalizedName}.zlib.ipfs-%BUILD_PLUGIN_VERSION%.json`, 'utf8'))
    infoPlugin.type = 'application/json'
    infoPlugin._canonical_uri = member.sourceUri
    fs.writeFileSync(`./production/tiddlywiki-ipfs/plugin/${normalizedName}.zlib.ipfs-${current.version}.json`, ipfsUtils.getJson(infoPlugin), 'utf8')
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
