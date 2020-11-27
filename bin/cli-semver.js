#!/usr/bin/env node
'use strict'

const semver = require('./semver.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

function main () {
  try {
    const name = argv.name ? argv.name.trim() : null
    if (name == null) {
      throw new Error('Unknown name...')
    }
    const extension = argv.extension ? argv.extension.trim() : null
    if (extension == null) {
      throw new Error('Unknown file extension...')
    }
    const dir = argv.dir ? argv.dir.trim() : null
    if (dir == null) {
      throw new Error('Unknown output dir...')
    }
    const env = argv.env ? argv.env.trim() : null
    if (!env) {
      throw new Error('Unknown env...')
    }
    semver(name, extension, dir, env)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
