#!/usr/bin/env node
'use strict'

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const dotenv = require('dotenv')
const fs = require('fs')
const { create: IpfsHttpClient } = require('ipfs-http-client')
const IpfsUtils = require('bin/ipfs-utils.js')
const ipfsUtils = new IpfsUtils()
const ipfsBundle = ipfsUtils.ipfsBundle

async function processContent (gatewayUrl, fetchUrl, parameters, parentCid, cid, parentDir) {
  if (cid === undefined || cid == null || cid.toString().trim() === '') {
    cid = parentCid !== undefined && parentCid !== null && parentCid.toString().trim() !== '' ? parentCid.toString().trim() : null
  }
  parentDir = parentDir !== undefined && parentDir !== null && parentDir.trim() !== '' ? parentDir.trim() : ''
  const server = IpfsHttpClient(parameters)
  const dagNode = await ipfsBundle.dagGet(server, cid, {
    localResolve: false,
    timeout: ipfsBundle.shortTimeout,
  })
  const node = dagNode.value
  if (ipfsBundle.isDirectory(node.Data)) {
    if (node.Links !== undefined && node.Links !== null) {
      for (var i = 0; i < node.Links.length; i++) {
        const childNode = node.Links[i]
        await processContent(gatewayUrl, fetchUrl, parameters, parentCid, childNode.Hash, `${parentDir}/${childNode.Name}`)
      }
    }
  }
  if (fetchUrl !== undefined && fetchUrl !== null) {
    const url = `${fetchUrl}/ipfs/${parentCid}${parentDir}`
    await ipfsUtils.loadFromIpfs(url, ipfsBundle.longTimeout)
    console.log(` ${url}`)
  } else {
    console.log(` ${gatewayUrl}/ipfs/${parentCid}${parentDir}`)
  }
}

async function processGateway (apiUrl, gatewayUrl, fetchUrl, sourceUri) {
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const parameters = {
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: ipfsBundle.shortTimeout,
  }
  const server = IpfsHttpClient(parameters)
  const ipfsCid = await ipfsBundle.resolveIpfsContainer(server, sourceUri)
  if (ipfsCid === undefined || ipfsCid == null) {
    throw new Error(`Unknown IPFS cid:
 ${sourceUri}`)
  }
  console.log('***')
  console.log(`*** Load from ${fetchUrl || gatewayUrl} ***`)
  await processContent(gatewayUrl, fetchUrl, parameters, ipfsCid)
  console.log(`*** Loaded ***`)
}

module.exports = async function main (load) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  // build
  const buildPath = `./current/build.json`
  if (fs.existsSync(buildPath === false)) {
    throw new Error(`Unknown build: ${buildPath}`)
  }
  var build = JSON.parse(fs.readFileSync(buildPath))
  if (build.sourceUri === undefined || build.sourceUri == null) {
    throw new Error(`Unknown build uri`)
  }
  // Params
  load = load !== undefined && load !== null ? load : process.env.LOAD ? process.env.LOAD === 'true' || process.env.LOAD === true : true
  if (load === false) {
    return
  }
  await processGateway(new URL('http://10.45.0.1:8080'), null, 'https://dweb.link', build.sourceUri)
  await processGateway(new URL('https://ipfs.infura.io:5001'), 'https://ipfs.infura.io', null, build.sourceUri)
}
