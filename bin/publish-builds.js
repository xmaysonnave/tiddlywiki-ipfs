#!/usr/bin/env node
'use strict'

const CID = require('cids')
const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

// bluelight.link
const IPNS_RAW_BUILD_NAME = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'
const IPNS_BUILD_NAME = 'k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl'

const shortTimeout = 4000
const longTimeout = 2 * 60 * shortTimeout

async function managePin (api, gateway, key, recursive) {
  var cid = null
  var key = new CID(key)
  recursive = recursive ? recursive === 'true' : true
  var type = null
  try {
    for await (var { cid, type } of api.pin.ls({ paths: [key], timeout: shortTimeout })) {
      if (cid !== undefined && cid !== null) {
        break
      }
    }
  } catch (error) {
    // Ignore
  }
  if (cid !== undefined && cid !== null) {
    console.log(`*** Pin status: ${type}
 ${gateway}/ipfs/${cid} ***`)
  } else {
    console.log(`*** Pinning:
 ${gateway}/ipfs/${key} ***`)
    try {
      await ipfsBundle.pinAdd(api, key, {
        recursive: recursive,
        timeout: longTimeout,
      })
    } catch (error) {
      return false
    }
  }
  return true
}

async function manageUnpin (api, gateway, key, recursive) {
  var key = new CID(key)
  recursive = recursive ? recursive === 'true' : true
  var cid = null
  var type = null
  try {
    for await (var { cid, type } of api.pin.ls({ paths: [key], timeout: shortTimeout })) {
      if (cid !== undefined && cid !== null) {
        break
      }
    }
  } catch (error) {
    // Ignore
  }
  if (cid !== undefined && cid !== null) {
    console.log(`*** Unpinning: ${type}
 ${gateway}/ipfs/${cid} ***`)
    try {
      await ipfsBundle.pinRm(api, cid, {
        recursive: recursive,
        timeout: longTimeout,
      })
    } catch (error) {
      return false
    }
  } else {
    return false
  }
  return true
}

async function resolveIPNS (api, gateway, ipnsName) {
  var cid = null
  try {
    const options = {
      nocache: false,
      recursive: false,
      timeout: shortTimeout,
    }
    cid = await ipfsBundle.nameResolve(api, ipnsName, options)
  } catch (error) {
    if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
      throw error
    }
  }
  if (cid !== null) {
    var { cid } = ipfsBundle.getIpfsIdentifier(cid)
    console.log(`*** Resolved IPNS: ${ipnsName}
 ${gateway}/ipfs/${cid} ***`)
  }
  return cid
}

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (dir, pin) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  ipfsBundle.init()
  // Params
  dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : '.'
  pin = pin !== undefined && pin !== null && pin.trim() !== '' ? pin.trim() : null
  pin = pin ? pin === 'true' : process.env.PIN ? process.env.PIN === 'true' : true
  const rawBuildName = process.env.IPNS_RAW_BUILD_NAME ? `${process.env.IPNS_RAW_BUILD_NAME}` : IPNS_RAW_BUILD_NAME
  const buildName = process.env.IPNS_BUILD_NAME ? `${process.env.IPNS_BUILD_NAME}` : IPNS_BUILD_NAME
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
  // Ipfs
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const api = IpfsHttpClient({
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: longTimeout,
  })
  // Current Build
  var cid = null
  const path = `./current/${dir}/build.json`
  if (fs.existsSync(path)) {
    const current = fs.readFileSync(path)
    const jsonObject = JSON.parse(current)
    const sourceUri = jsonObject._source_uri
    var { cid } = ipfsBundle.getIpfsIdentifier(sourceUri)
    console.log(`*** Publish current build:
 ${gateway}/ipfs/${cid} ***`)
    if (pin) {
      await managePin(api, gateway, cid, true)
    } else {
      await manageUnpin(api, gateway, cid, true)
    }
  }
  // Raw build node
  console.log(`*** Publish raw build node:
 ${gateway}/ipns/${rawBuildName} ***`)
  var cid = await resolveIPNS(api, gateway, rawBuildName)
  if (cid !== null) {
    var node = null
    var previous = null
    try {
      const options = {
        localResolve: false,
        timeout: shortTimeout,
      }
      node = await ipfsBundle.dagGet(api, cid, options)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (node !== null) {
      const links = node.value.Links
      for (var i = 0; i < links.length; i++) {
        if (links[i].Name === 'previous') {
          previous = links[i].Hash
        }
      }
    }
    if (pin) {
      if (previous !== null) {
        await manageUnpin(api, gateway, previous, false)
      }
      await managePin(api, gateway, cid, true)
      const { name, value } = await ipfsBundle.namePublish(api, rawBuildName, cid, {
        resolve: false,
        key: rawBuildName,
        allowOffline: false,
        timeout: longTimeout,
      })
      console.log(`*** Published raw build node:
 ${gateway}/ipns/${name}
 ${gateway}${value} ***`)
    } else {
      if (previous !== null) {
        await managePin(api, gateway, previous, true)
      }
      await manageUnpin(api, gateway, cid, false)
      const { name, value } = await ipfsBundle.namePublish(api, rawBuildName, previous, {
        resolve: false,
        key: rawBuildName,
        allowOffline: false,
        timeout: longTimeout,
      })
      console.log(`*** Published previous raw build node:
 ${gateway}/ipns/${name}
 ${gateway}${value} ***`)
    }
  }
  // Build node
  console.log(`*** Publish build node:
 ${gateway}/ipns/${buildName} ***`)
  var cid = await resolveIPNS(api, gateway, buildName)
  if (cid !== null) {
    var node = null
    var previous = null
    try {
      const options = {
        localResolve: false,
        timeout: shortTimeout,
      }
      node = await ipfsBundle.dagGet(api, cid, options)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (node !== null) {
      const links = node.value.Links
      for (var i = 0; i < links.length; i++) {
        if (links[i].Name === 'previous') {
          previous = links[i].Hash
        }
      }
    }
    if (pin) {
      if (previous !== null) {
        await manageUnpin(api, gateway, previous, false)
      }
      await managePin(api, gateway, cid, true)
      const { name, value } = await ipfsBundle.namePublish(api, buildName, cid, {
        resolve: false,
        key: buildName,
        allowOffline: false,
        timeout: longTimeout,
      })
      console.log(`*** Published build node:
 ${gateway}/ipns/${name}
 ${gateway}${value} ***`)
    } else {
      if (previous !== null) {
        await managePin(api, gateway, previous, true)
      }
      await manageUnpin(api, gateway, cid, false)
      const { name, value } = await ipfsBundle.namePublish(api, buildName, previous, {
        resolve: false,
        key: buildName,
        allowOffline: false,
        timeout: longTimeout,
      })
      console.log(`*** Published previous build node:
 ${gateway}/ipns/${name}
 ${gateway}${value} ***`)
    }
  }
}
