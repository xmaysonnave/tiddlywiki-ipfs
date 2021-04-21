#!/usr/bin/env node
'use strict'

const Publisher = require('./publisher.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const build = argv.build !== undefined && argv.build !== null ? argv.build === 'true' || argv.build === true : false
    const dir = argv.dir !== undefined && argv.dir !== null ? argv.dir : null
    const check = argv.check !== undefined && argv.check !== null ? argv.check === 'true' || argv.check === true : null
    const purge = argv.purge !== undefined && argv.purge !== null ? argv.purge === 'true' || argv.purge === true : null
    const load = argv.load !== undefined && argv.load !== null ? argv.load === 'true' || argv.load === true : null
    const pin = argv.pin !== undefined && argv.pin !== null ? argv.pin === 'true' || argv.pin === true : null
    const production = argv.production !== undefined && argv.production !== null ? argv.production === 'true' || argv.production === true : false
    const reset = argv.reset !== undefined && argv.reset !== null ? argv.reset === 'true' || argv.reset === true : false
    const publisher = new Publisher(dir, pin, load)
    if (reset) {
      await publisher.resetProduction()
    } else if (build) {
      await publisher.publishBuild()
    } else if (check) {
      await publisher.check(false)
    } else if (purge) {
      await publisher.check(true)
    } else if (production) {
      await publisher.publishProduction()
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
