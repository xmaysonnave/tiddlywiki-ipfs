#!/usr/bin/env node
'use strict'

const CID = require('cids')
const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = class PublishBuild {
  shortTimeout = 6000
  longTimeout = 2 * 60 * this.shortTimeout
  emptyDirectoryCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')

  // bluelight.link
  IPNS_CID_RAW_BUILD = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'
  IPNS_CID_BUILD = 'k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl'

  constructor (dir, pin, load) {
    this.dotEnv = dotenv.config()
    if (this.dotEnv.error) {
      throw this.dotEnv.error
    }
    this.rawBuildKey = process.env.IPNS_KEY_RAW_BUILD ? `${process.env.IPNS_KEY_RAW_BUILD}` : null
    if (this.rawBuildKey == null) {
      throw Error('Undefined raw build IPNS key')
    }
    this.buildKey = process.env.IPNS_KEY_BUILD ? `${process.env.IPNS_KEY_BUILD}` : null
    if (this.buildKey == null) {
      throw Error('Undefined build IPNS key')
    }
    this.rawBuildCid = process.env.IPNS_CID_RAW_BUILD ? `${process.env.IPNS_CID_RAW_BUILD}` : this.IPNS_CID_RAW_BUILD
    this.buildCid = process.env.IPNS_CID_BUILD ? `${process.env.IPNS_CID_BUILD}` : this.IPNS_CID_BUILD
    this.dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : '.'
    this.pin = pin !== undefined && pin !== null ? pin : process.env.PIN ? process.env.PIN === 'true' || process.env.PIN === true : true
    this.load = load !== undefined && load !== null ? load : process.env.LOAD ? process.env.LOAD === 'true' || process.env.LOAD === true : true
    this.apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    this.gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
    this.publicGateway = process.env.PUBLIC_GATEWAY ? `${process.env.PUBLIC_GATEWAY}` : null
    if (this.publicGateway == null) {
      this.publicGateway = this.gateway
    }
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
  }

  async managePin (api, key, recursive) {
    var cid = null
    var key = new CID(key)
    recursive = recursive ? recursive === 'true' || recursive === true : true
    try {
      for await (var { cid } of api.pin.ls({ paths: [key], timeout: this.shortTimeout })) {
        if (cid !== undefined && cid !== null) {
          break
        }
      }
    } catch (error) {
      // Ignore
    }
    if (cid === undefined || cid == null) {
      try {
        await this.ipfsBundle.pinAdd(api, key, {
          recursive: recursive,
          timeout: this.longTimeout,
        })
      } catch (error) {
        return false
      }
    }
    return true
  }

  async manageUnpin (api, key, recursive) {
    var key = new CID(key)
    recursive = recursive ? recursive === 'true' || recursive === true : true
    var cid = null
    try {
      for await (var { cid } of api.pin.ls({ paths: [key], timeout: this.shortTimeout })) {
        if (cid !== undefined && cid !== null) {
          break
        }
      }
    } catch (error) {
      // Ignore
    }
    if (cid !== undefined && cid !== null) {
      try {
        await this.ipfsBundle.pinRm(api, cid, {
          recursive: recursive,
          timeout: this.longTimeout,
        })
      } catch (error) {
        return false
      }
    } else {
      return false
    }
    return true
  }

  async resolveIPNS (api, ipnsCid) {
    var cid = null
    try {
      var { cid } = await this.ipfsBundle.dagResolve(api, `/ipns/${ipnsCid}`, this.shortTimeout)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (cid !== null) {
      var { ipfsCid: cid } = this.ipfsBundle.getIpfsIdentifier(cid)
    }
    return cid
  }

  async resetBuild () {
    console.log(`*** Reset Raw and Production:
 api: ${this.apiUrl}
 gateway: ${new URL(this.gateway)}
 public gateway: ${new URL(this.publicGateway)}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    const protocol = this.apiUrl.protocol.slice(0, -1)
    var port = this.apiUrl.port
    if (port === undefined || port == null || port.trim() === '') {
      port = 443
      if (protocol === 'http') {
        port = 80
      }
    }
    const api = IpfsHttpClient({
      protocol: protocol,
      host: this.apiUrl.hostname,
      port: port,
      timeout: this.shortTimeout,
    })
    const previousRawBuildCid = await this.resolveIPNS(api, this.rawBuildCid)
    if (previousRawBuildCid !== null && previousRawBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
      console.log(`*** Unpin previous Raw:
 ipns://${this.rawBuildCid}
 ipfs://${previousRawBuildCid} ***`)
      await this.manageUnpin(api, previousRawBuildCid, false)
      console.log(`*** Publish empty directory to Raw:
 ipfs://${this.emptyDirectoryCid} ***`)
      await this.ipfsBundle.namePublish(api, this.rawBuildKey, this.emptyDirectoryCid, {
        resolve: false,
        key: this.rawBuildKey,
        allowOffline: false,
        timeout: this.longTimeout,
      })
    }
    const previousBuildCid = await this.resolveIPNS(api, this.buildCid)
    if (previousBuildCid !== null && previousBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
      console.log(`*** Unpin previous Production:
 ipns://${this.buildCid}
 ipfs://${previousBuildCid} ***`)
      await this.manageUnpin(api, previousBuildCid, false)
      console.log(`*** Publish empty directory to Production:
 ipfs://${this.emptyDirectoryCid} ***`)
      await this.ipfsBundle.namePublish(api, this.buildKey, this.emptyDirectoryCid, {
        resolve: false,
        key: this.buildKey,
        allowOffline: false,
        timeout: this.longTimeout,
      })
    }
  }

  async publish () {
    console.log(`*** Publish Raw and Production:
 api: ${this.apiUrl}
 gateway: ${new URL(this.gateway)}
 public gateway: ${new URL(this.publicGateway)}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    const protocol = this.apiUrl.protocol.slice(0, -1)
    var port = this.apiUrl.port
    if (port === undefined || port == null || port.trim() === '') {
      port = 443
      if (protocol === 'http') {
        port = 80
      }
    }
    const api = IpfsHttpClient({
      protocol: protocol,
      host: this.apiUrl.hostname,
      port: port,
      timeout: this.longTimeout,
    })
    // current build
    const buildPath = `./current/build.json`
    if (fs.existsSync(buildPath) === false) {
      throw new Error(`Unknown ${buildPath}`)
    }
    const build = JSON.parse(fs.readFileSync(buildPath))
    const { ipfsCid: sourceUriCid } = this.ipfsBundle.getIpfsIdentifier(build.sourceUri)
    if (this.pin) {
      console.log(`*** Pin current build:
 ipfs://${sourceUriCid} ***`)
      await this.managePin(api, sourceUriCid, true)
    } else {
      console.log(`*** Unpin current build:
 ipfs://${sourceUriCid} ***`)
      await this.manageUnpin(api, sourceUriCid, true)
    }
    // current raw and production build node
    if (build.currentRawBuild === undefined || build.currentRawBuild == null) {
      throw new Error('Unknown current Raw')
    }
    const { ipfsCid: currentRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(build.currentRawBuild)
    if (build.currentBuild === undefined || build.currentBuild == null) {
      throw new Error('Unknown current Production')
    }
    const { ipfsCid: currentBuildCid } = this.ipfsBundle.getIpfsIdentifier(build.currentBuild)
    var previousRawBuildCid = null
    if (build.previousRawBuild !== undefined && build.previousRawBuild !== null) {
      var { ipfsCid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(build.previousRawBuild)
    }
    var previousBuildCid = null
    if (build.previousBuild !== undefined && build.previousBuild !== null) {
      var { ipfsCid: previousBuildCid } = this.ipfsBundle.getIpfsIdentifier(build.previousBuild)
    }
    // Remote raw build node
    var remoteRawBuildCid = null
    try {
      var { cid: remoteRawBuildCid } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.rawBuildCid}`, this.shortTimeout)
    } catch (error) {
      console.log('Unknown remote Raw...')
    }
    if (this.pin) {
      if (previousRawBuildCid !== null && previousRawBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Unpin previous Raw:
 ipns://${this.rawBuildCid}
 ipfs://${previousRawBuildCid} ***`)
        await this.manageUnpin(api, previousRawBuildCid, false)
      }
      if (remoteRawBuildCid !== null && remoteRawBuildCid.toString() !== currentRawBuildCid.toString()) {
        console.log(`*** Pin current Raw:
 ipns://${this.rawBuildCid}
 ipfs://${currentRawBuildCid} ***`)
        await this.managePin(api, currentRawBuildCid, true)
        console.log(`*** Publish current Raw:
 ipns://${this.rawBuildCid}
 ipfs://${currentRawBuildCid} ***`)
        await this.ipfsBundle.namePublish(api, this.rawBuildKey, currentRawBuildCid, {
          resolve: false,
          key: this.rawBuildKey,
          allowOffline: false,
          timeout: this.longTimeout,
        })
      }
    } else {
      if (currentRawBuildCid !== null && currentRawBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Unpin current Raw:
 ipns://${this.rawBuildCid}
 ipfs://${currentRawBuildCid} ***`)
        await this.manageUnpin(api, currentRawBuildCid, false)
      }
      if (previousRawBuildCid !== null && previousRawBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Pin previous Raw:
 ipns://${this.rawBuildCid}
 ipfs://${previousRawBuildCid} ***`)
        await this.managePin(api, previousRawBuildCid, true)
      }
      if (remoteRawBuildCid !== null && remoteRawBuildCid.toString() !== previousRawBuildCid.toString()) {
        console.log(`*** Publish previous Raw:
 ipns://${this.rawBuildCid}
 ipfs://${previousRawBuildCid} ***`)
        await this.ipfsBundle.namePublish(api, this.rawBuildKey, previousRawBuildCid, {
          resolve: false,
          key: this.rawBuildKey,
          allowOffline: false,
          timeout: this.longTimeout,
        })
      }
    }
    // Remote build node
    var remoteBuildCid = null
    try {
      var { cid: remoteBuildCid } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.buildCid}`, this.shortTimeout)
    } catch (error) {
      console.log('Unknown remote Production...')
    }
    if (this.pin) {
      if (previousBuildCid !== null && previousBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Unpin previous Production:
 ipns://${this.buildCid}
 ipfs://${previousBuildCid} ***`)
        await this.manageUnpin(api, previousBuildCid, false)
      }
      if (remoteBuildCid !== null && remoteBuildCid.toString() !== currentBuildCid.toString()) {
        console.log(`*** Pin current Production:
 ipns://${this.buildCid}
 ipfs://${currentBuildCid} ***`)
        await this.managePin(api, currentBuildCid, true)
        console.log(`*** Publish current Production:
 ipns://${this.buildCid}
 ipfs://${currentBuildCid} ***`)
        await this.ipfsBundle.namePublish(api, this.buildKey, currentBuildCid, {
          resolve: false,
          key: this.buildKey,
          allowOffline: false,
          timeout: this.longTimeout,
        })
      }
    } else {
      if (currentBuildCid !== null && currentBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Unpin current Production:
 ipns://${this.buildCid}
 ipfs://${currentBuildCid} ***`)
        await this.manageUnpin(api, currentBuildCid, false)
      }
      if (previousBuildCid !== null && previousBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Pin previous Production:
 ipns://${this.buildCid}
 ipfs://${previousBuildCid} ***`)
        await this.managePin(api, previousBuildCid, true)
      }
      if (remoteBuildCid !== null && remoteBuildCid.toString() !== previousBuildCid.toString()) {
        console.log(`*** Publish previous Production:
 ipns://${this.buildCid}
 ipfs://${previousBuildCid} ***`)
        await this.ipfsBundle.namePublish(api, this.buildKey, previousBuildCid, {
          resolve: false,
          key: this.buildKey,
          allowOffline: false,
          timeout: this.longTimeout,
        })
      }
    }
  }
}
