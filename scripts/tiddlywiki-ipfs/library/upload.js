#!/usr/bin/env node
'use strict'

const publish = require('../../upload.js')

async function main () {
  try {
    const name = '$:/library/ipfs-library-modules.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/library'
    const tags = '$:/ipfs/core'
    await publish(name, extension, dir, tags)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
