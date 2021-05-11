#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const fs = require('fs')

const IpfsBundle = require('core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

async function main () {
  try {
    ipfsBundle.init()
    var member = null
    const name = '$:/core'
    const normalizedName = ipfsBundle.filenamify(name)
    const current = JSON.parse(fs.readFileSync('./current/tiddlywiki/core/current.json', 'utf8'))
    for (var j = 0; j < current.content.length; j++) {
      if (current.content[j].name === '$:/core.zlib') {
        member = current.content[j]
        break
      }
    }
    const infoPlugin = JSON.parse(fs.readFileSync(`./build/output/tiddlywiki/core/${normalizedName}.zlib.ipfs-%BUILD_TIDDLYWIKI_CORE_VERSION%.json`, 'utf8'))
    infoPlugin.type = 'application/json'
    infoPlugin._canonical_uri = member.sourceUri
    fs.writeFileSync(`./production/tiddlywiki/core/${normalizedName}.zlib.ipfs-${current.version}.json`, beautify(infoPlugin, null, 2, 80), 'utf8')
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
