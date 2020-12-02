#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const CID = require('cids')

async function managePin (api, key, kind) {
  var cid = null
  var type = null
  key = new CID(key)
  try {
    for await (var { cid, type } of api.pin.ls({ paths: [key] })) {
      if (cid !== undefined && cid !== null) {
        break
      }
    }
  } catch (error) {
    // Ignore
  }
  var gatewayUrl = process.env.GATEWAY
    ? process.env.GATEWAY
    : 'https://dweb.link'
  gatewayUrl = `${gatewayUrl}/ipfs/`
  if (cid) {
    console.log(
      `*** Pin status: ${gatewayUrl}${cid}, kind: ${kind}, type: ${type} ***`
    )
  } else {
    console.log(`*** Pinning: ${gatewayUrl}${key}, kind: ${kind} ***`)
    cid = await api.pin.add(key, { recursive: false })
    if (key.toString() !== cid.toString()) {
      throw new Error(`Unable to pin: ${gatewayUrl}${key}`)
    }
  }
}

async function manageUnpin (api, key, kind) {
  var cid = null
  var type = null
  key = new CID(key)
  try {
    for await (var { cid, type } of api.pin.ls({ paths: [key] })) {
      if (key === cid) {
        break
      }
    }
  } catch (error) {
    // Ignore
  }
  var gatewayUrl = process.env.GATEWAY
    ? process.env.GATEWAY
    : 'https://dweb.link'
  gatewayUrl = `${gatewayUrl}/ipfs/`
  if (cid) {
    console.log(
      `*** Unpinning ${gatewayUrl}${key}, kind: ${kind}, type: ${type} ***`
    )
    if (type === 'recursive') {
      cid = await api.pin.rm(key, { recursive: true })
    } else {
      cid = await api.pin.rm(key, { recursive: false })
    }
    if (key.toString() !== cid.toString()) {
      throw new Error(`Unable to unpin: ${gatewayUrl}${key}`)
    }
  } else {
    console.log(`*** Not pinned ${gatewayUrl}${key}, kind: ${kind} ***`)
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
  dir =
    dir == null || dir === undefined || dir.trim() === '' ? null : dir.trim()
  if (dir == null) {
    throw new Error('Unknown directory...')
  }
  pin =
    pin == null || pin === undefined || pin.trim() === '' ? null : pin.trim()
  pin = pin
    ? pin === 'true'
    : process.env.PIN
    ? process.env.PIN === 'true'
    : true

  // Replay
  const replay = new Map()
  const json = fs.readFileSync(`./production/${dir}/$_replay.json`, 'utf8')
  const jsonObject = JSON.parse(json)
  for (const key in jsonObject) {
    replay.set(key, jsonObject[key])
  }

  // Ipfs Client
  const apiUrl = process.env.API
    ? process.env.API
    : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)

  // Pin or Unpin
  for (const key of replay.keys()) {
    try {
      const kind = replay.get(key)
      if (kind === 'link') {
        continue
      }
      if (pin) {
        await managePin(api, key, kind)
      } else {
        await manageUnpin(api, key, kind)
      }
    } catch (error) {
      console.error(error.message)
    }
  }
}
