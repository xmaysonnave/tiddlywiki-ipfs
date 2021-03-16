#!/usr/bin/env node
'use strict'

const UpdateBuilds = require('./update-builds.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const load = argv.load ? argv.load.trim() : null
    const build = new UpdateBuilds(load)
    await build.publish()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
