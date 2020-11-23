#!/usr/bin/env node
'use strict'

const publish = require('../../ipfs-publish.js')

async function main () {
  try {
    const name = '$:/boot/boot.js'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/boot'
    const tags = '$:/ipfs/core'
    await publish(name, extension, dir, tags)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
