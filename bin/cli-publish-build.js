#!/usr/bin/env node
'use strict'

const publish = require('./publish-build.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const dir = argv.dir ? argv.dir.trim() : null
    await publish(dir)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
