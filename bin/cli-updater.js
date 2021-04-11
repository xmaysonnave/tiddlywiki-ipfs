#!/usr/bin/env node
'use strict'

const Updater = require('./updater.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const load = argv.load !== undefined && argv.load !== null ? argv.load === 'true' || argv.load === true : null
    const updater = new Updater(load)
    await updater.production(load)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
