#!/usr/bin/env node
'use strict'

const publish = require('../../upload.js')

async function main () {
  try {
    const name = 'index'
    const extension = 'html'
    const dir = 'editions/dev'
    const tags = 'bluelightav.eth'
    await publish(name, extension, dir, tags)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
