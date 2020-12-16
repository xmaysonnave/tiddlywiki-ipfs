#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const CID = require('cids')

async function managePin (api, key) {
  var cid = null
  var type = null
  var key = new CID(key)
  try {
    for await (var { cid, type } of api.pin.ls({ paths: [key] })) {
      if (cid !== undefined && cid !== null) {
        break
      }
    }
  } catch (error) {
    // ignore
  }
  if (cid) {
    console.log(`*** Pin status: ${cid}, type: ${type} ***`)
  } else {
    console.log(`*** Pinning: ${key} ***`)
    cid = await api.pin.add(key, { recursive: true })
    if (key.toString() !== cid.toString()) {
      throw new Error(`Unable to pin: ${key}`)
    }
  }
}

async function manageUnpin (api, key) {
  var cid = null
  var type = null
  var key = new CID(key)
  try {
    for await (var { cid, type } of api.pin.ls({ paths: [key] })) {
      if (key === cid) {
        break
      }
    }
  } catch (error) {
    // ignore
  }
  if (cid) {
    console.log(`*** Unpinning ${key}, type: ${type} ***`)
    cid = await api.pin.rm(key, { recursive: true })
    if (key.toString() !== cid.toString()) {
      throw new Error(`Unable to unpin: ${key}`)
    }
  } else {
    console.log(`*** Unable to unpin non pinned ${key} ***`)
  }
}

/*
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (dir, pin) {
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  dir = dir == null || dir === undefined || dir.trim() === '' ? '.' : dir.trim()
  pin = pin == null || pin === undefined || pin.trim() === '' ? null : pin.trim()
  pin = pin ? pin === 'true' : process.env.PIN ? process.env.PIN === 'true' : true

  // Ipfs Client
  const apiUrl = process.env.API ? process.env.API : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)

  // Read node.json
  const path = `./current/${dir}/node.json`
  if (!fs.existsSync(path)) {
    throw Error(`Unknown ./current/${dir}/node.json`)
  }
  const current = fs.readFileSync(path)
  const jsonObject = JSON.parse(current)
  const cid = jsonObject._cid

  // Pin or Unpin
  if (pin) {
    await managePin(api, cid)
  } else {
    await manageUnpin(api, cid)
  }
}
