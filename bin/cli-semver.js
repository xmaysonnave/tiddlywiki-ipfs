#!/usr/bin/env node
'use strict'

const semver = require('./semver.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const name = argv.name !== undefined && argv.name !== null ? argv.name : null
    if (name == null) {
      throw new Error('Unknown name...')
    }
    const extension = argv.extension !== undefined && argv.extension !== null ? argv.extension : null
    if (extension == null) {
      throw new Error('Unknown file extension...')
    }
    const dir = argv.dir !== undefined && argv.dir !== null ? argv.dir : null
    if (dir == null) {
      throw new Error('Unknown output dir...')
    }
    const env = argv.env !== undefined && argv.env !== null ? argv.env : null
    if (env == null) {
      throw new Error('Unknown env...')
    }
    await semver(name, extension, dir, env)
    console.log('***')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
