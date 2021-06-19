#!/usr/bin/env node
'use strict'

const Updater = require('bin/updater.js')

async function main () {
  try {
    const updater = new Updater()
    await updater.updateProduction()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
