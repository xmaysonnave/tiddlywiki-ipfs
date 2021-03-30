#!/usr/bin/env node
'use strict'

const Update = require('./update.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const load = argv.load ? argv.load.trim() : null
    const reset = argv.reset ? argv.reset.trim() === 'true' : false
    const updater = new Update(load)
    if (reset) {
      await updater.resetBuild()
    } else {
      await updater.publishBuild()
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
