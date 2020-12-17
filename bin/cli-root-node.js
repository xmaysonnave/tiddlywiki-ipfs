#!/usr/bin/env node
'use strict'

const rootNode = require('./root-node.js')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

function main () {
  try {
    const branch = argv.branch ? argv.branch.trim() : null
    rootNode(branch)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
