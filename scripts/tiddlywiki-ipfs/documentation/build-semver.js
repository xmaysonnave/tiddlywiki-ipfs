#!/usr/bin/env node
'use strict'

const semver = require('../../build-semver.js')

async function main () {
  try {
    const name = '$:/ipfs/documentation'
    const extension = 'json'
    const dir = 'tiddlywiki-ipfs/documentation'
    const env = 'DOCUMENTATION'
    semver(name, extension, dir, env)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
