#!/usr/bin/env node
'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const { globSource } = IpfsHttpClient

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = class PublishBuild {
  shortTimeout = 1000
  longTimeout = 2 * 60 * this.shortTimeout

  // bluelight.link
  // rawBuildIPNSName="k51qzi5uqu5dllr1ovhxtqndtbz21nc0mxhtn5158fea3zqv15c6wf7lc5lss5"
  // buildIPNSName="k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl"

  // localhost
  rawBuildIPNSName = 'k51qzi5uqu5djtojvb5fez5d451ixjck44qhiz7j8a4tduzuwe7q62ixqga50w'
  // buildIPNSName = 'k51qzi5uqu5dgbln4cfps8b42p2t1n9567qakp3oamgwg7yr19lmktyjbxg109'

  constructor () {
    this.dotEnv = dotenv.config()
    if (this.dotEnv.error) {
      throw this.dotEnv.error
    }
    this.rawBuildIPNSKey = process.env.IPNS_RAW_BUILD_KEY ? `${process.env.IPNS_RAW_BUILD_KEY}` : null
    if (this.rawBuildIPNSKey == null) {
      throw Error('Undefined raw build IPNS key')
    }
    const path = `./current/build.json`
    if (fs.existsSync(path) === false) {
      throw Error(`Unknown ${path}`)
    }
    const build = fs.readFileSync(path)
    this.build = JSON.parse(build)
    this.gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
  }

  async dagPut (api, links) {
    const dagNode = {
      Data: this.ipfsBundle.StringToUint8Array('\u0008\u0001'),
      Links: links,
    }
    return await this.ipfsBundle.dagPut(api, dagNode)
  }

  async publish () {
    console.log('***')
    console.log(`*** Publish ${this.build._version} ***`)
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
    const api = IpfsHttpClient({
      protocol: protocol,
      host: apiUrl.hostname,
      port: port,
      timeout: this.shortTimeout,
    })
    // Resolve build
    var { cid: buildCid } = this.ipfsBundle.getIpfsIdentifier(this.build._source_uri)
    if (buildCid == null) {
      throw Error(`Unknown ${this.build._source_uri}`)
    }
    var stat = null
    try {
      stat = await this.ipfsBundle.objectStat(api, buildCid)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
      throw Error(`Unknown ${this.build._source_uri}`)
    }
    if (stat == null) {
      throw Error(`Unknown ${this.build._source_uri}`)
    }
    console.log(`*** Resolved build:
 ${this.gateway}/ipfs/${buildCid} ***`)
    // Process raw build node
    const { previousRawBuildCid, newRawBuildCid } = await this.processRawBuildNode(api)
    // Process production build node
    // Pin management
    if (previousRawBuildCid !== null) {
      try {
        console.log(`*** Unpin previous raw build node:
 ${this.gateway}/ipfs/${previousRawBuildCid} ***`)
        await this.ipfsBundle.pinRm(api, previousRawBuildCid, true)
      } catch (error) {
        console.log(` ${error.message}`)
      }
    }
    if (newRawBuildCid !== null) {
      try {
        console.log(`*** Pin raw build node:
 ${this.gateway}/ipfs/${newRawBuildCid} ***`)
        await this.ipfsBundle.pinAdd(api, newRawBuildCid, true)
      } catch (error) {
        console.log(error.message)
      }
    }
  }

  async processRawBuildNode (api) {
    var currentBuildCid = null
    var currentBuildSize = null
    var previousRawBuildCid = null
    const links = []
    console.log(`*** Resolve IPNS:
 Key: ${this.rawBuildIPNSKey}
 Name: ${this.rawBuildIPNSName} ***`)
    try {
      previousRawBuildCid = await this.ipfsBundle.nameResolve(api, this.rawBuildIPNSName)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (previousRawBuildCid !== null) {
      var { cid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousRawBuildCid)
      var rawBuildNode = null
      try {
        rawBuildNode = await this.ipfsBundle.dagGet(api, previousRawBuildCid)
      } catch (error) {
        if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
          throw error
        }
      }
      if (rawBuildNode !== null) {
        console.log(`*** Resolved raw build node:
 ${this.gateway}/ipfs/${previousRawBuildCid} ***`)
        const rawBuildNodeLinks = rawBuildNode.value.Links
        for (var i = 0; i < rawBuildNodeLinks.length; i++) {
          if (rawBuildNodeLinks[i].Name === this.build._version) {
            console.log(`*** Build is already published:
 ${this.gateway}/ipfs/${rawBuildNodeLinks[i].Hash} ***`)
            return {
              previousRawBuildCid: null,
              newRawBuildCid: null,
            }
          }
          if (rawBuildNodeLinks[i].Name !== 'latest-build') {
            links.push({
              Name: rawBuildNodeLinks[i].Name,
              Tsize: rawBuildNodeLinks[i].Tsize,
              Hash: rawBuildNodeLinks[i].Hash,
            })
          }
        }
      }
    }
    // Add current build
    const glob = globSource('./current', {
      recursive: true,
    })
    const added = await this.ipfsBundle.addAll(api, glob, {
      chunker: 'rabin-262144-524288-1048576',
      cidVersion: 0,
      hashAlg: 'sha2-256',
      wrapWithDirectory: true,
      pin: false,
      rawLeaves: false,
      timeout: this.longTimeout,
    })
    for (const [key, value] of added.entries()) {
      if (value.path === '') {
        currentBuildCid = key
        currentBuildSize = value.size
      }
    }
    console.log(`*** Added current build:
 ${this.gateway}/ipfs/${currentBuildCid} ***`)
    links.push({
      Name: this.build._version,
      Tsize: currentBuildSize,
      Hash: currentBuildCid,
    })
    links.push({
      Name: 'latest-build',
      Tsize: currentBuildSize,
      Hash: currentBuildCid,
    })
    // https://discuss.ipfs.io/t/why-sort-links-in-pbnode/3157/3
    links.sort((a, b) => {
      return b.Name.localeCompare(a.Name)
    })
    // Create a new raw build
    var { cid: newRawBuildCid } = await this.dagPut(api, links)
    console.log(`*** Added raw build node:
 ${this.gateway}/ipfs/${newRawBuildCid} ***`)
    // Publish
    console.log(`*** Publish IPNS:
 Key: ${this.rawBuildIPNSKey}
 Name: ${this.rawBuildIPNSName} ***`)
    const { name, value } = await this.ipfsBundle.namePublish(api, this.rawBuildIPNSName, newRawBuildCid, {
      resolve: false,
      key: this.rawBuildIPNSName,
      allowOffline: false,
      timeout: this.longTimeout,
    })
    console.log(
      `*** Published raw build node:
 ${this.gateway}/ipns/${name}
 ${this.gateway}${value} ***`
    )
    return {
      previousRawBuildCid: previousRawBuildCid,
      newRawBuildCid: newRawBuildCid,
    }
  }
}
