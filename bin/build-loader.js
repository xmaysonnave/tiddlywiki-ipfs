#!/usr/bin/env node
'use strict'

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const dotenv = require('dotenv')
const IpfsUtils = require('bin/ipfs-utils.js')

module.exports = class BuildLoader {
  constructor () {
    this.dotEnv = dotenv.config()
    if (this.dotEnv.error) {
      throw this.dotEnv.error
    }
    require('events').EventEmitter.defaultMaxListeners = Infinity
    this.rawBuildKey = process.env.IPNS_PRODUCTION_RAW_KEY ? process.env.IPNS_PRODUCTION_RAW_KEY : null
    if (this.rawBuildKey == null) {
      throw Error('Undefined IPNS production raw key')
    }
    this.buildKey = process.env.IPNS_PRODUCTION_KEY ? process.env.IPNS_PRODUCTION_KEY : null
    if (this.buildKey == null) {
      throw Error('Undefined IPNS production key')
    }
    this.ipfsUtils = new IpfsUtils()
    this.ipfsBundle = this.ipfsUtils.ipfsBundle
    console.log(`*** Loader: ${this.ipfsUtils.apiUrl} ***`)
    this.once = false
  }

  async init () {
    // Init once
    if (this.once) {
      return
    }
    const { build, production, productionRaw, currentRaw, currentRawCid } = await this.ipfsUtils.loadBuild(this.ipfsUtils.getApiClient())
    this.build = build
    this.production = production
    this.productionRaw = productionRaw
    this.currentRaw = currentRaw
    this.currentRawCid = currentRawCid
    // Init once
    this.once = true
  }

  async processContent (apiUrl, gatewayUrl, fetchUrl, parentCid, cid, parentDir) {
    if (cid === undefined || cid == null || cid.toString().trim() === '') {
      cid = parentCid !== undefined && parentCid !== null && parentCid.toString().trim() !== '' ? parentCid.toString().trim() : null
    }
    parentDir = parentDir !== undefined && parentDir !== null && parentDir.trim() !== '' ? parentDir.trim() : ''
    const api = this.ipfsUtils.getApiClient(this.ipfsUtils.shortTimeout, apiUrl)
    const dagNode = await this.ipfsBundle.dagGet(api, cid, {
      localResolve: false,
      timeout: this.ipfsUtils.shortTimeout,
    })
    const node = dagNode.value
    if (this.ipfsBundle.isDirectory(node.Data)) {
      if (node.Links !== undefined && node.Links !== null) {
        for (var i = 0; i < node.Links.length; i++) {
          const childNode = node.Links[i]
          if (childNode.Name === '') {
            continue
          }
          await this.processContent(apiUrl, gatewayUrl, fetchUrl, parentCid, childNode.Hash, `${parentDir}/${childNode.Name}`)
        }
      }
    }
    if (fetchUrl !== undefined && fetchUrl !== null) {
      const url = `${fetchUrl}/ipfs/${parentCid}${parentDir}`
      await this.ipfsUtils.loadFromIpfs(url, this.ipfsUtils.longTimeout)
      console.log(` ${url}`)
    } else {
      console.log(` ${gatewayUrl}/ipfs/${parentCid}${parentDir}`)
    }
  }

  async processGateway (apiUrl, gatewayUrl, fetchUrl, sourceUri) {
    console.log(`*** Load: ${apiUrl} ***`)
    const api = this.ipfsUtils.getApiClient(this.ipfsUtils.shortTimeout, apiUrl)
    const ipfsCid = await this.ipfsBundle.resolveIpfsContainer(api, sourceUri)
    if (ipfsCid === undefined || ipfsCid == null) {
      throw new Error(`Unknown IPFS cid:
  ${sourceUri}`)
    }
    await this.processContent(apiUrl, gatewayUrl, fetchUrl, ipfsCid)
  }

  async processBuild (load) {
    load = load !== undefined && load !== null ? load === 'true' || load === true : false
    if (!load) {
      console.log('*** Do not load... ***')
      return
    }
    await this.processGateways(this.build.sourceUri)
  }

  async processProductionRaw (load) {
    load = load !== undefined && load !== null ? load === 'true' || load === true : false
    if (!load) {
      console.log('*** Do not load... ***')
      return
    }
    await this.processGateways(`/ipfs/${this.productionRaw}`)
  }

  async processProduction (load) {
    load = load !== undefined && load !== null ? load === 'true' || load === true : false
    if (!load) {
      console.log('*** Do not load... ***')
      return
    }
    await this.processGateways(`/ipfs/${this.production}`)
  }

  async process (load, ipfsPath) {
    load = load !== undefined && load !== null ? load === 'true' || load === true : false
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : null
    if (!load || !ipfsPath) {
      console.log('*** Do not load... ***')
      return
    }
    await this.processGateways(ipfsPath)
  }

  async processGateways (ipfsPath) {
    //await this.processGateway(new URL('http://127.0.0.1:5001'), 'http://127.0.0.1:8080', null, ipfsPath)
    //await this.processGateway(new URL('http://10.45.0.1:5001'), 'http://10.45.0.1:8080', null, ipfsPath)
    await this.processGateway(new URL('http://10.45.0.1:5001'), 'https://ipfs.infura.io', null, ipfsPath)
    await this.processGateway(new URL('https://ipfs.infura.io:5001'), 'https://dweb.link', null, ipfsPath)
    //await this.processGateway(new URL('http://10.45.0.1:8080'), null, 'https://ipfs.io', ipfsPath)
  }
}
