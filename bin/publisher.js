#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const CID = require('cids')
const dotenv = require('dotenv')
const fromString = require('uint8arrays').fromString
const fs = require('fs')
const fetch = require('node-fetch')
const timeoutSignal = require('timeout-signal')
const IpfsHttpClient = require('ipfs-http-client')
const { pipeline } = require('stream')
const { promisify } = require('util')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = class Publisher {
  shortTimeout = 6000
  longTimeout = 2 * 60 * this.shortTimeout
  dagDirectory = fromString('\u0008\u0001')
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
    this.publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? `${process.env.IPFS_PUBLIC_GATEWAY}` : null
    if (this.publicGateway == null) {
      this.publicGateway = this.gateway
    }
    this.protocol = this.apiUrl.protocol.slice(0, -1)
    this.port = this.apiUrl.port
    if (this.port === undefined || this.port == null || this.port.trim() === '') {
      this.port = 443
      if (this.protocol === 'http') {
        this.port = 80
      }
    }
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
  }

  async loadFromIpfs (url, timeout, stream) {
    try {
      if (url instanceof URL === false) {
        url = new URL(url)
      }
      timeout = timeout !== undefined && timeout !== null ? timeout : this.longTimeout
      var options = {
        method: 'options',
        signal: timeoutSignal(timeout),
      }
      var response = await fetch(url, options)
      if (response.ok === false) {
        throw new Error(`Unexpected response ${response.statusText}`)
      }
      var options = {
        compress: false,
        method: 'get',
        size: 0,
        signal: timeoutSignal(timeout),
      }
      const location = response.headers.get('Location')
      url = location !== undefined && location !== null ? new URL(location) : url
      var response = await fetch(url, options)
      if (response.ok === false) {
        throw new Error(`Unexpected response ${response.statusText}`)
      }
      if (stream !== undefined && stream !== null) {
        const streamPipeline = promisify(pipeline)
        await streamPipeline(response.body, stream)
        return
      }
      return await response.buffer()
    } catch (error) {
      console.log(`*** Fetch error:
${error.message}
${url} ***`)
    }
    return null
  }

  async dagPut (api, links, timeout) {
    const dagNode = {
      Data: this.dagDirectory,
      Links: [],
    }
    if (links !== undefined && links !== null) {
      dagNode.Links = links
    }
    timeout = timeout !== undefined && timeout !== null ? timeout : this.longTimeout
    const options = {
      format: 'dag-pb',
      hashAlg: 'sha2-256',
      pin: false,
      timeout: timeout,
    }
    return await this.ipfsBundle.dagPut(api, dagNode, options)
  }

  async managePin (api, key, recursive) {
    var key = new CID(key)
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

  async resetProduction () {
    console.log(`*** Reset Raw and Production:
 api: ${this.apiUrl}
 public production: ${this.publicGateway}/ipns/${this.buildCid}
 public raw: ${this.publicGateway}/ipns/${this.rawBuildCid}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    const api = IpfsHttpClient({
      protocol: this.protocol,
      host: this.apiUrl.hostname,
      port: this.port,
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

  async publishBuild (api) {
    console.log(`*** Publish current build:
 api: ${this.apiUrl}
 public production: ${this.publicGateway}/ipns/${this.buildCid}
 public raw: ${this.publicGateway}/ipns/${this.rawBuildCid}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    api =
      api !== undefined && api !== null
        ? api
        : IpfsHttpClient({
            protocol: this.protocol,
            host: this.apiUrl.hostname,
            port: this.port,
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
    return build
  }

  async checkRawContent (api, rawBuildNode, purge) {
    // Check
    if (rawBuildNode === undefined || rawBuildNode == null) {
      return {
        cid: null,
        size: null,
      }
    }
    const links = new Map()
    // Process directories
    for (var i = 0; i < rawBuildNode.value.Links.length; i++) {
      var childRawBuildNode = null
      const link = rawBuildNode.value.Links[i]
      try {
        childRawBuildNode = await this.ipfsBundle.dagGet(api, link.Hash, {
          localResolve: false,
          timeout: this.shortTimeout,
        })
      } catch (error) {
        const nodeUri = `${this.gateway}/ipfs/${link.Hash}`
        console.log(`*** Discard raw node:
 ${nodeUri} ***`)
        continue
      }
      if (this.ipfsBundle.isDirectory(childRawBuildNode.value.Data)) {
        const { cid, size } = await this.checkRawContent(api, childRawBuildNode, purge)
        if (cid !== null) {
          links.set(link.Name, {
            Name: link.Name,
            Tsize: size,
            Hash: cid,
          })
        }
      }
    }
    // Process current
    var current = null
    var currentRawNode = null
    const rawBuildNodeLinks = rawBuildNode.value.Links
    for (var i = 0; i < rawBuildNodeLinks.length; i++) {
      if (rawBuildNodeLinks[i].Name === 'current.json') {
        const nodeUri = `${this.publicGateway}/ipfs/${rawBuildNodeLinks[i].Hash}`
        console.log(`*** Fetch current:
 ${nodeUri} ***`)
        current = await this.loadFromIpfs(nodeUri, this.shortTimeout)
        if (current !== null) {
          current = JSON.parse(this.ipfsBundle.Utf8ArrayToStr(current))
          currentRawNode = rawBuildNodeLinks[i]
        }
      }
    }
    if (current !== null) {
      try {
        var { ipfsCid: cid, ipnsIdentifier, path } = this.ipfsBundle.getIpfsIdentifier(current.buildUri)
        var ipfsPath = null
        var ipfsUri = null
        if (ipnsIdentifier !== null) {
          ipfsPath = `/ipns/${ipnsIdentifier}${path}`
          ipfsUri = `ipns://${ipnsIdentifier}${path}`
        } else {
          ipfsPath = `/ipfs/${cid}${path}`
          ipfsUri = `ipfs://${cid}${path}`
        }
        var { cid } = await this.ipfsBundle.dagResolve(api, ipfsPath, this.shortTimeout)
        if (cid !== undefined && cid !== null) {
          console.log(`*** ${purge ? 'Keep' : 'Live'} build: ${current.build}
 ${ipfsUri} ***`)
          return {
            cid: currentRawNode.Hash,
            size: currentRawNode.Tsize,
          }
        } else {
          console.log(`*** ${purge ? 'Discard' : 'Dead'} build: ${current.build}
 ${ipfsUri} ***`)
        }
      } catch (error) {
        console.log(`*** ${purge ? 'Discard' : 'Dead'} build: ${current.build}
 ${error.message} ***`)
      }
    }
    if (purge) {
      var newLinks = Array.from(links.values())
      // Reverse sort
      newLinks.sort((a, b) => {
        return b.Name.localeCompare(a.Name)
      })
      if (newLinks.length > 0) {
        const node = await this.dagPut(api, newLinks)
        if (this.load) {
          const nodeUri = `${this.gateway}/ipfs/${node.cid}`
          console.log(`*** Fetch Raw node:
${nodeUri} ***`)
          await this.loadFromIpfs(nodeUri)
        }
        return {
          cid: this.ipfsBundle.cidToCidV1(node.cid),
          size: node.size,
        }
      }
    }
    return {
      cid: null,
      size: null,
    }
  }

  async check (purge) {
    console.log(`*** Check Raw:
 api: ${this.apiUrl}
 public production: ${this.publicGateway}/ipns/${this.buildCid}
 public raw: ${this.publicGateway}/ipns/${this.rawBuildCid}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    const api = IpfsHttpClient({
      protocol: this.protocol,
      host: this.apiUrl.hostname,
      port: this.port,
      timeout: this.longTimeout,
    })
    // Raw build
    const buildPath = `./current/build.json`
    if (fs.existsSync(buildPath) === false) {
      throw new Error(`Unknown ${buildPath}`)
    }
    const build = JSON.parse(fs.readFileSync(buildPath))
    // Current raw
    var currentRawBuildCid = null
    if (build.currentRawBuild !== undefined && build.currentRawBuild !== null) {
      var { ipfsCid: currentRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(build.currentRawBuild)
    }
    // Previous raw
    var previousRawBuildCid = null
    if (build.previousRawBuild !== undefined && build.previousRawBuild !== null) {
      var { ipfsCid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(build.previousRawBuild)
    }
    // Remote raw
    var remoteRawBuildCid = null
    try {
      var { cid: remoteRawBuildCid } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.rawBuildCid}`, this.shortTimeout)
    } catch (error) {
      console.log('Unknown Raw...')
    }
    var currentRawBuildNode = null
    if (currentRawBuildCid !== null) {
      var rawBuildNode = null
      try {
        rawBuildNode = await this.ipfsBundle.dagGet(api, this.ipfsBundle.cidToCidV1(currentRawBuildCid), {
          localResolve: false,
          timeout: this.shortTimeout,
        })
      } catch (error) {
        console.log('Unknown Raw...')
      }
      if (rawBuildNode !== null) {
        const rawBuildNodeLinks = rawBuildNode.value.Links
        for (var i = 0; i < rawBuildNodeLinks.length; i++) {
          if (rawBuildNodeLinks[i].Name === 'current') {
            currentRawBuildNode = await this.ipfsBundle.dagGet(api, this.ipfsBundle.cidToCidV1(rawBuildNodeLinks[i].Hash), {
              localResolve: false,
              timeout: this.shortTimeout,
            })
            break
          }
        }
      }
    }
    var node = await this.checkRawContent(api, currentRawBuildNode, purge)
    if (node.cid !== null) {
      const links = []
      var msg = '*** Fetch'
      if (currentRawBuildCid == null || (currentRawBuildCid !== null && currentRawBuildCid.toString() !== node.cid.toString())) {
        if (previousRawBuildCid !== null) {
          const stat = await this.ipfsBundle.objectStat(api, previousRawBuildCid, this.shortTimeout)
          links.push({
            Name: 'previous',
            Tsize: stat.CumulativeSize,
            Hash: previousRawBuildCid,
          })
          build.previousRawBuild = `${this.publicGateway}/ipfs/${previousRawBuildCid}`
        }
        links.push({
          Name: 'current',
          Tsize: node.size,
          Hash: node.cid,
        })
        if (this.load) {
          const rawNodeUri = `${this.gateway}/ipfs/${node.cid}`
          console.log(`*** Fetch Raw node:
 ${rawNodeUri} ***`)
          await this.loadFromIpfs(rawNodeUri)
        }
        node = await this.dagPut(api, links)
        build.currentRawBuild = `${this.publicGateway}/ipfs/${node.cid}`
        if (currentRawBuildCid == null) {
          msg = `${msg} new`
        } else {
          msg = `${msg} updated`
        }
      } else {
        msg = `${msg} current`
      }
      fs.writeFileSync(`./current/build.json`, beautify(build, null, 2, 80), 'utf8')
      if (this.load) {
        const rawNodeUri = `${this.gateway}/ipfs/${node.cid}`
        console.log(`${msg} Raw:
 ${rawNodeUri} ***`)
        await this.loadFromIpfs(rawNodeUri)
      }
      if (previousRawBuildCid !== null && previousRawBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Unpin previous Raw:
 ipfs://${previousRawBuildCid} ***`)
        await this.manageUnpin(api, previousRawBuildCid, false)
      }
      if (remoteRawBuildCid !== null && remoteRawBuildCid.toString() !== node.cid.toString()) {
        console.log(`*** Pin current Raw:
 ipfs://${node.cid} ***`)
        await this.managePin(api, node.cid, true)
        console.log(`*** Publish current Raw:
 ipfs://${node.cid} ***`)
        await this.ipfsBundle.namePublish(api, this.rawBuildKey, node.cid, {
          resolve: false,
          key: this.rawBuildKey,
          allowOffline: false,
          timeout: this.longTimeout,
        })
      }
    }
    return node
  }

  async publishProduction () {
    console.log(`*** Publish Production:
 api: ${this.apiUrl}
 public production: ${this.publicGateway}/ipns/${this.buildCid}
 public raw: ${this.publicGateway}/ipns/${this.rawBuildCid}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    const api = IpfsHttpClient({
      protocol: this.protocol,
      host: this.apiUrl.hostname,
      port: this.port,
      timeout: this.longTimeout,
    })
    // current build
    const buildPath = `./current/build.json`
    if (fs.existsSync(buildPath) === false) {
      throw new Error(`Unknown ${buildPath}`)
    }
    const build = JSON.parse(fs.readFileSync(buildPath))
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
 ipfs://${previousRawBuildCid} ***`)
        await this.manageUnpin(api, previousRawBuildCid, false)
      }
      if (remoteRawBuildCid !== null && remoteRawBuildCid.toString() !== currentRawBuildCid.toString()) {
        console.log(`*** Pin current Raw:
 ipfs://${currentRawBuildCid} ***`)
        await this.managePin(api, currentRawBuildCid, true)
        console.log(`*** Publish current Raw:
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
 ipfs://${currentRawBuildCid} ***`)
        await this.manageUnpin(api, currentRawBuildCid, false)
      }
      if (previousRawBuildCid !== null && previousRawBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Pin previous Raw:
 ipfs://${previousRawBuildCid} ***`)
        await this.managePin(api, previousRawBuildCid, true)
      }
      if (remoteRawBuildCid !== null && remoteRawBuildCid.toString() !== previousRawBuildCid.toString()) {
        console.log(`*** Publish previous Raw:
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
 ipfs://${previousBuildCid} ***`)
        await this.manageUnpin(api, previousBuildCid, false)
      }
      if (remoteBuildCid !== null && remoteBuildCid.toString() !== currentBuildCid.toString()) {
        console.log(`*** Pin current Production:
 ipfs://${currentBuildCid} ***`)
        await this.managePin(api, currentBuildCid, true)
        console.log(`*** Publish current Production:
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
 ipfs://${currentBuildCid} ***`)
        await this.manageUnpin(api, currentBuildCid, false)
      }
      if (previousBuildCid !== null && previousBuildCid.toString() !== this.emptyDirectoryCid.toString()) {
        console.log(`*** Pin previous Production:
 ipfs://${previousBuildCid} ***`)
        await this.managePin(api, previousBuildCid, true)
      }
      if (remoteBuildCid !== null && remoteBuildCid.toString() !== previousBuildCid.toString()) {
        console.log(`*** Publish previous Production:
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
