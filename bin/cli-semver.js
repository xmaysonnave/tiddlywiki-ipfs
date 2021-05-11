#!/usr/bin/env node
'use strict'

const constants = require('bin/constants.js')
const fs = require('fs')
const semver = require('bin/semver.js')
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
    const { kind } = await semver(name, extension, dir, env)
    const exists = fs.existsSync(`./production/${dir}`)
    if (exists && kind === constants.UNCHANGED) {
      console.log('***')
      process.exit(2)
    }
    if (exists) {
      await fs.rmdirSync(`./production/${dir}`, {
        recursive: true,
      })
    }
    await fs.mkdirSync(`./production/${dir}`, true)
  } catch (error) {
    console.error(error)
    console.log('***')
    process.exit(1)
  }
  console.log('***')
  process.exit(0)
}

main()
