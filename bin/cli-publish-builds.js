#!/usr/bin/env node
'use strict'

const publish = require('./publish-builds.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const dir = argv.dir ? argv.dir.trim() : null
    const load = argv.load ? argv.load.trim() : null
    const pin = argv.pin ? argv.pin.trim() : null
    await publish(dir, pin, load)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
