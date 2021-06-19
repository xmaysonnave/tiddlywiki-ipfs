#!/usr/bin/env node
'use strict'

const BuildLoader = require('bin/build-loader.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const load = argv.load !== undefined && argv.load !== null ? argv.load === 'true' || argv.load === true : false
    const production = argv.production !== undefined && argv.production !== null ? argv.production === 'true' || argv.production === true : false
    const productionRaw = argv.productionRaw !== undefined && argv.productionRaw !== null ? argv.productionRaw === 'true' || argv.productionRaw === true : false
    const ipfsPath = argv.ipfsPath !== undefined && argv.ipfsPath !== null && argv.ipfsPath.trim() !== '' ? argv.ipfsPath.trim() : null
    const buildLoader = new BuildLoader()
    await buildLoader.init()
    if (production) {
      await buildLoader.processProduction(load)
    } else if (productionRaw) {
      await buildLoader.processProductionRaw(load)
    } else if (ipfsPath) {
      await buildLoader.process(load, ipfsPath)
    } else {
      await buildLoader.processBuild(load)
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
