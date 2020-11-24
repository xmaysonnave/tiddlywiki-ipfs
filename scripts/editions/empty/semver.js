#!/usr/bin/env node
'use strict'

const semver = require('../../semver.js')

function main () {
  try {
    const name = 'index'
    const extension = 'html'
    const dir = 'editions/empty'
    const env = 'EMPTY'
    semver(name, extension, dir, env)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
