#!/usr/bin/env node
'use strict'

const PublishBuild = require('./publish-build.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const dir = argv.dir !== undefined && argv.dir !== null ? argv.dir : null
    const load = argv.load !== undefined && argv.load !== null ? argv.load === 'true' || argv.load === true : null
    const pin = argv.pin !== undefined && argv.pin !== null ? argv.pin === 'true' || argv.pin === true : null
    const reset = argv.reset !== undefined && argv.reset !== null ? argv.reset === 'true' || argv.reset === true : false
    const publisher = new PublishBuild(dir, pin, load)
    if (reset) {
      await publisher.resetBuild()
    } else {
      await publisher.publish()
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
