#!/usr/bin/env node
'use strict'

const PublishBuild = require('./publish-build.js')

async function main () {
  try {
    const build = new PublishBuild()
    await build.publish()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
