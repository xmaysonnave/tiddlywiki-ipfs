#!/usr/bin/env node
'use strict'

const upload = require('./uploader.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    // Args
    const dir = argv.dir !== undefined && argv.dir !== null ? argv.dir : null
    if (dir == null) {
      throw new Error('Unknown output dir...')
    }
    const extension = argv.extension !== undefined && argv.extension !== null ? argv.extension : null
    if (extension == null) {
      throw new Error('Unknown file extension...')
    }
    const load = argv.load !== undefined && argv.load !== null ? argv.load === 'true' || argv.load === true : null
    const name = argv.name !== undefined && argv.name !== null ? argv.name : null
    if (name == null) {
      throw new Error('Unknown name...')
    }
    const tags = argv.tags !== undefined && argv.tags !== null ? argv.tags : null
    // Upload
    await upload(name, extension, dir, tags, load)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
