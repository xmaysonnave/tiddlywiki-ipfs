#!/usr/bin/env node
'use strict'

const publish = require('../../upload.js')

async function main () {
  try {
    const name = '$:/ipfs/documentation'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/documentation'
    await publish(name, extension, dir)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
