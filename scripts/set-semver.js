#!/usr/bin/env node
'use strict'

const { generate, validate } = require('build-number-generator')
const dotenv = require('dotenv')
const filenamify = require('filenamify')
const fs = require('fs')
const replace = require('replace')
const createKeccakHash = require('keccak')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function main () {
  try {
    const result = dotenv.config()
    if (result.error) {
      throw result.error
    }
    const name = argv.name
    if (!name) {
      throw new Error('Unknown name...')
    }
    const extension = argv.extension
    if (!extension) {
      throw new Error('Unknown file extension...')
    }
    const env = argv.env
    if (!env) {
      throw new Error('Unknown env...')
    }
    const rawSemver = process.env[`${env}_SEMVER`]
    if (!rawSemver || rawSemver.trim() === '') {
      throw new Error(`Undefined 'env.${env}_SEMVER'...`)
    }
    // Semver
    console.log(`*** ${name} ***`)
    // Process Raw
    var raw = null
    const fileName = filenamify(name, { replacement: '_' })
    // Load
    var path = `./build/output/${fileName}-%BUILD_${env}_SEMVER%.${extension}`
    if (fs.existsSync(path)) {
      raw = fs.readFileSync(path, 'utf8')
    }
    if (!raw) {
      path = `./build/output/${fileName}.${extension}`
      if (fs.existsSync(path)) {
        raw = fs.readFileSync(path, 'utf8')
      }
    }
    if (!raw) {
      throw new Error(`Unknown raw content: '${path}'`)
    }
    // Keccak
    const keccak = createKeccakHash('keccak256')
    keccak.update(raw)
    const rawHash = keccak.digest('hex')
    console.log(`*** ${name}, hash: ${rawHash} ***`)

    var _rawHash = null
    var version = null

    // Current
    if (fs.existsSync(`./current/${fileName}.json`)) {
      const current = fs.readFileSync(`./current/${fileName}.json`, 'utf8')
      var { _rawHash, _version: version } = JSON.parse(current)
    }

    // Version
    if (rawHash !== _rawHash) {
      if (!validate(rawSemver)) {
        version = generate({ version: rawSemver, versionSeparator: '-' })
        console.log(`*** new version: ${version} ***`)
      }
    } else {
      console.log(`*** content matching ${name} ***`)
      console.log(`*** current version: ${version} ***`)
    }
    // Check
    if (!validate(version)) {
      throw new Error(`Invalid version: ${version}`)
    }

    // Set version
    replace({
      regex: `%BUILD_${env}_SEMVER%`,
      replacement: version,
      paths: ['./build/tiddlywiki.info'],
      recursive: false,
      silent: true
    })

    // https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j
    var files = fs
      .readdirSync('./build/tiddlers/system', { withFileTypes: true })
      .filter(item => !item.isDirectory())
      .map(item => item.name)
    for (var i = 0; i < files.length; i++) {
      if (files[i].endsWith('.meta')) {
        replace({
          regex: `%BUILD_${env}_SEMVER%`,
          replacement: version,
          paths: [`./build/tiddlers/system/${files[i]}`],
          recursive: false,
          silent: true
        })
      }
    }

    if (name === '$:/boot/boot.js') {
      replace({
        regex: `%BUILD_${env}_SEMVER%`,
        replacement: version,
        paths: ['./build/tiddlers/boot/boot.js'],
        recursive: false,
        silent: true
      })
    } else if (name === '$:/plugins/ipfs') {
      const sourceMetadata = './tiddlers/plugins/ipfs/plugin.info'
      const targetMetadata = './build/plugins/ipfs/plugin.info'
      const sourcePackage = './package.json'

      // retrieve current version from plugin.info
      var infoPlugin = JSON.parse(fs.readFileSync(sourceMetadata, 'utf8'))
      if (infoPlugin.version) {
        console.log(`*** ${sourceMetadata}, version; ${infoPlugin.version} ***`)
      }

      // package.json
      var infoProject = JSON.parse(fs.readFileSync(sourcePackage, 'utf8'))
      if (infoProject.version) {
        console.log(`*** ${sourcePackage}, version: ${infoProject.version} ***`)
      }

      // update version
      infoProject.version = version
      infoPlugin.version = version

      // update package.json
      var data = JSON.stringify(infoProject, null, 2)
      fs.writeFileSync(sourcePackage, data, 'utf8')

      // update plugin.info
      data = JSON.stringify(infoPlugin, null, 2)
      fs.writeFileSync(targetMetadata, data, 'utf8')
    }

    // Save
    const toJson = {
      _target: name,
      _rawHash: rawHash,
      _version: version
    }
    fs.writeFileSync(
      `./build/output/${fileName}_build.json`,
      JSON.stringify(toJson),
      'utf8'
    )
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
  process.exit(0)
}

main()
