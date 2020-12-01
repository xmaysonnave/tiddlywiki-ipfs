#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')

/*
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (pin) {
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  pin =
    pin == null || pin === undefined || pin.trim() === '' ? null : pin.trim()
  pin = pin
    ? pin === 'true'
    : process.env.PIN
    ? process.env.PIN === 'true'
    : true

  // Pin
  var toBePinned = []
  if (fs.existsSync(`./build/output/pin/pin.json`)) {
    const pin = fs.readFileSync(`./build/output/pin/pin.json`, 'utf8')
    toBePinned = JSON.parse(pin)
  }

  // Ipfs Client
  const apiUrl = process.env.API
    ? process.env.API
    : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)

  // Pin or Unpin
  for (var i = 0; i < toBePinned.length; i++) {
    try {
      if (pin) {
        console.log(`*** Pinning ${toBePinned[i]} ***`)
        await api.pin.add(toBePinned[i], { recursive: true })
      } else {
        console.log(`*** Unpinning ${toBePinned[i]} ***`)
        await api.pin.rm(toBePinned[i], { recursive: true })
      }
    } catch (error) {
      console.error(error.message)
    }
  }
}
