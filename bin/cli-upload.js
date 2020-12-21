#!/usr/bin/env node
'use strict'

const upload = require('./upload.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const name = argv.name ? argv.name.trim() : null
    if (name == null) {
      throw new Error('Unknown name...')
    }
    const owner = argv.owner ? argv.owner.trim() : null
    const extension = argv.extension ? argv.extension.trim() : null
    if (extension == null) {
      throw new Error('Unknown file extension...')
    }
    const dir = argv.dir ? argv.dir.trim() : null
    if (dir == null) {
      throw new Error('Unknown output dir...')
    }
    const tags = argv.tags ? argv.tags.trim() : null
    await upload(name, owner, extension, dir, tags)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
