#!/usr/bin/env node
'use strict'

const Publisher = require('bin/publisher.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const dir = argv.dir !== undefined && argv.dir !== null ? argv.dir : null
    const check = argv.check !== undefined && argv.check !== null ? argv.check === 'true' || argv.check === true : false
    const publish = argv.publish !== undefined && argv.publish !== null ? argv.publish === 'true' || argv.publish === true : false
    const purge = argv.purge !== undefined && argv.purge !== null ? argv.purge === 'true' || argv.purge === true : false
    const pin = argv.pin !== undefined && argv.pin !== null ? argv.pin === 'true' || argv.pin === true : false
    const ipfsPath = argv.ipfsPath !== undefined && argv.ipfsPath !== null && argv.ipfsPath.trim() !== '' ? argv.ipfsPath.trim() : null
    const production = argv.production !== undefined && argv.production !== null ? argv.production === 'true' || argv.production === true : false
    const reset = argv.reset !== undefined && argv.reset !== null ? argv.reset === 'true' || argv.reset === true : false
    const publisher = new Publisher(dir, pin)
    if (reset && production) {
      await publisher.resetProduction()
    } else if (check && !production && ipfsPath) {
      await publisher.check(purge, ipfsPath)
    } else if (purge && !production && ipfsPath) {
      await publisher.check(true, ipfsPath)
    } else if (check && !production) {
      await publisher.check(purge)
    } else if (purge && !production) {
      await publisher.check(true)
    } else if (check && production) {
      await publisher.checkProduction(purge)
    } else if (purge && production) {
      await publisher.checkProduction(true)
    } else if (publish && production) {
      await publisher.publishProduction()
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
