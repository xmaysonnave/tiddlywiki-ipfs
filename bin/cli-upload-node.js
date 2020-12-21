#!/usr/bin/env node
'use strict'

const upload = require('./upload-node.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const dir = argv.dir ? argv.dir.trim() : null
    if (dir == null) {
      throw new Error('Unknown output dir...')
    }
    await upload(dir)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
