#!/usr/bin/env node
'use strict'

const publish = require('../../ipfs-publish.js')

async function main () {
  try {
    const name = '$:/plugins/ipfs'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/plugin'
    const tags = '$:/ipfs/documentation'
    await publish(name, extension, dir, tags)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
