#!/usr/bin/env node
'use strict'

const CID = require('cids')
const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const uint8ArrayFromString = require('uint8arrays/from-string')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

// bluelight.link
// const ipnsRawBuildName="k51qzi5uqu5dllr1ovhxtqndtbz21nc0mxhtn5158fea3zqv15c6wf7lc5lss5"
// const ipnsBuildName="k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl"

// localhost
const ipnsRawBuildName = 'k51qzi5uqu5djtojvb5fez5d451ixjck44qhiz7j8a4tduzuwe7q62ixqga50w'
// const ipnsBuildName = 'k51qzi5uqu5dgbln4cfps8b42p2t1n9567qakp3oamgwg7yr19lmktyjbxg109'

async function dagPut (api, links) {
  const dagNode = {
    Data: uint8ArrayFromString('\u0008\u0001'),
    Links: links,
  }
  return await ipfsBundle.dagPut(api, dagNode)
}

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (dir) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  ipfsBundle.init()
  // Params
  dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : '.'
  const ipnsRawBuildKey = process.env.IPNS_RAW_BUILD_KEY ? `${process.env.IPNS_RAW_BUILD_KEY}` : null
  if (ipnsRawBuildKey == null) {
    throw Error('Undefined IPNS Raw Build Key')
  }
  // Current build
  const path = `./current/${dir}/build.json`
  if (fs.existsSync(path) === false) {
    throw Error(`Unknown ${path}`)
  }
  const build = fs.readFileSync(path)
  const buildObject = JSON.parse(build)
  console.log('***')
  console.log(`*** Publish build: ${buildObject._version} ***`)
  console.log('***')
  // Ipfs
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'http://10.45.0.1:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  // Aggressive timeout, should be local
  const api = IpfsHttpClient({
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: 1000,
  })
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}/` : 'https://dweb.link/'
  // Resolve build
  var { cid: buildCid } = ipfsBundle.getIpfsIdentifier(buildObject._source_uri)
  if (buildCid == null) {
    throw Error(`Unknown build ${buildObject._source_uri}`)
  }
  var stat = null
  try {
    stat = await ipfsBundle.objectStat(api, buildCid)
  } catch (error) {
    if (error.name !== 'TimeoutError') {
      throw error
    }
    throw Error(`Unknown build ${buildObject._source_uri}`)
  }
  if (stat == null) {
    throw Error(`Unknown build ${buildObject._source_uri}`)
  }
  console.log(`*** Resolved build:
 ${gateway}ipfs/${buildCid} ***`)
  // Load raw listing
  console.log(`*** Resolve IPNS:
 ${gateway}ipns/${ipnsRawBuildName} ***`)
  var identifier = null
  var ipfsRawBuildCid = null
  var rawBuildNode = null
  try {
    for await (const key of api.name.resolve(ipnsRawBuildKey)) {
      identifier = key
    }
  } catch (error) {
    if (error.name !== 'TimeoutError') {
      throw error
    }
  }
  if (identifier !== null) {
    var { cid: ipfsRawBuildCid } = ipfsBundle.getIpfsIdentifier(ipnsRawBuildKey)
    console.log(`*** Resolved:
 ${gateway}ipfs/${ipfsRawBuildCid} ***`)
    // rawBuildNode = await api.dag.get(ipfsRawBuildCid)
  }
  if (ipfsRawBuildCid == null) {
    var { cid: rawBuildNode } = await dagPut(api, [
      {
        Name: buildObject._version,
        Tsize: buildObject._source_size,
        Hash: new CID(buildCid),
      },
    ])
  }
  // Publish
  if (rawBuildNode !== null) {
    const { name, value } = await ipfsBundle.namePublish(api, ipnsRawBuildName, rawBuildNode, {
      timeout: 2 * 60 * 1000,
    })
    console.log(
      `Successfully Raw Build Node:
 ${gateway}/ipns/${name}
 ${gateway}/ipfs/${value}`
    )
  }
}
