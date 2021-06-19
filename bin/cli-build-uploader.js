#!/usr/bin/env node
'use strict'

const upload = require('bin/build-uploader.js')

async function main () {
  try {
    await upload()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
