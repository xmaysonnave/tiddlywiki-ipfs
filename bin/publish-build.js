#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')

// const raw = '/ipns/k51qzi5uqu5dllr1ovhxtqndtbz21nc0mxhtn5158fea3zqv15c6wf7lc5lss5'
// const rawKey = 'raw.tidly.bluelightav.eth'

// const production = '/ipns/k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl'
// const productionKey = 'tidly.bluelightav.eth'

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

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
  // Read node
  var path = `./current/${dir}/node.json`
  if (fs.existsSync(path) === false) {
    throw Error(`Unknown ${path}`)
  }
  const node = fs.readFileSync(path)
  const nodeObject = JSON.parse(node)
  // Read build
  path = `./current/${dir}/build.json`
  if (fs.existsSync(path) === false) {
    throw Error(`Unknown ${path}`)
  }
  const build = fs.readFileSync(path)
  const buildObject = JSON.parse(build)
  const buildUri = `${nodeObject._source_uri}${buildObject._version}`
  // Ipfs
  const apiUrl = new URL(process.env.IPNS_API ? process.env.IPNS_API : 'http://10.45.0.1:5001')
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
  })
  console.log('***')
  // Resolve build container
  const buildCid = await ipfsBundle.resolveIpfsContainer(api, buildUri, 2 * 60 * 1000)
  if (buildCid == null) {
    throw Error(`Unknown build container ${buildUri}`)
  }
  console.log(`*** Resolved build container ${buildCid} ***`)
  // // Load raw listing
  // var identifier = null
  // var rawCid = null
  // try {
  //   for await (const key of api.name.resolve(rawKey, {
  //     timeout: 1000,
  //   })) {
  //     identifier = key
  //   }
  // } catch (error) {
  //   if (error.name !== 'TimeoutError') {
  //     throw error
  //   }
  // }
  // if (identifier == null) {
  //   console.log(`*** Init ${rawKey} ***`)
  // } else {
  //   console.log(`*** Resolved ${rawKey} ***`)
  //   const { cid: rawCid } = ipfsBundle.getIpfsIdentifier(rawKey)
  //   const rawNode = await api.dag.get(rawCid)
  // }
  // const options = {
  //   chunker: 'rabin-262144-524288-1048576',
  //   cidVersion: 0,
  //   hashAlg: 'sha2-256',
  //   pin: true,
  //   rawLeaves: false,
  //   wrapWithDirectory: false,
  // }
  console.log('***')
}
