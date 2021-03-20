#!/usr/bin/env node
'use strict'

const CID = require('cids')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const { globSource } = IpfsHttpClient
const { pipeline } = require('stream')
const { promisify } = require('util')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = class UpdateBuilds {
  shortTimeout = 4000
  longTimeout = 2 * 60 * this.shortTimeout

  // bluelight.link
  IPNS_RAW_BUILD_NAME = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'
  IPNS_BUILD_NAME = 'k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl'

  constructor (load) {
    this.dotEnv = dotenv.config()
    if (this.dotEnv.error) {
      throw this.dotEnv.error
    }
    this.rawBuildKey = process.env.IPNS_RAW_BUILD_KEY ? `${process.env.IPNS_RAW_BUILD_KEY}` : null
    if (this.rawBuildKey == null) {
      throw Error('Undefined raw build IPNS key')
    }
    this.buildKey = process.env.IPNS_BUILD_KEY ? `${process.env.IPNS_BUILD_KEY}` : null
    if (this.buildKey == null) {
      throw Error('Undefined build IPNS key')
    }
    this.rawBuildName = process.env.IPNS_RAW_BUILD_NAME ? `${process.env.IPNS_RAW_BUILD_NAME}` : this.IPNS_RAW_BUILD_NAME
    this.buildName = process.env.IPNS_BUILD_NAME ? `${process.env.IPNS_BUILD_NAME}` : this.IPNS_BUILD_NAME
    this.load = load !== undefined && load !== null ? load === 'true' : process.env.LOAD ? process.env.LOAD === 'true' : true
    this.newRawBuildCid = null
    this.newBuildCid = null
    this.previousRawBuildCid = null
    this.previousBuildCid = null
    this.gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
    this.publicGateway = process.env.PUBLIC_GATEWAY ? `${process.env.PUBLIC_GATEWAY}` : null
    if (this.publicGateway == null) {
      this.publicGateway = this.gateway
    }
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
  }

  async loadFromIpfs (url, timeout, stream) {
    if (url instanceof URL === false) {
      url = new URL(url)
    }
    const options = {
      compress: false,
      method: 'GET',
      timeout: timeout !== undefined ? timeout : this.longTimeout,
    }
    const response = await fetch(url, options)
    if (response.ok === false) {
      throw new Error(`unexpected response ${response.statusText}`)
    }
    if (stream !== undefined && stream !== null) {
      const streamPipeline = promisify(pipeline)
      await streamPipeline(response.body, stream)
      return
    }
    return await response.buffer()
  }

  async manageUnpin (api, key, recursive) {
    var key = new CID(key)
    recursive = recursive ? recursive === 'true' : true
    var cid = null
    var type = null
    try {
      for await (var { cid, type } of api.pin.ls({ paths: [key], timeout: this.shortTimeout })) {
        if (cid !== undefined && cid !== null) {
          break
        }
      }
    } catch (error) {
      // Ignore
    }
    if (cid !== undefined && cid !== null) {
      console.log(`*** Unpinning: ${type}
 ${this.gateway}/ipfs/${cid} ***`)
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

  async dagPut (api, links) {
    const dagNode = {
      Data: this.ipfsBundle.StringToUint8Array('\u0008\u0001'),
      Links: links,
    }
    const options = {
      format: 'dag-pb',
      hashAlg: 'sha2-256',
      pin: false,
      timeout: this.longTimeout,
    }
    return await this.ipfsBundle.dagPut(api, dagNode, options)
  }

  async publishCurrentBuild () {
    const path = `./current/build.json`
    if (fs.existsSync(path) === false) {
      throw new Error(`Unknown ${path}`)
    }
    await this.publish(JSON.parse(fs.readFileSync(path)))
  }

  async resetBuild () {
    // Ipfs
    const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    console.log('***')
    console.log(`*** Reset ${apiUrl} ***`)
    console.log('***')
    this.newRawBuildCid = null
    this.newBuildCid = null
    this.previousRawBuildCid = null
    this.previousBuildCid = null
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
    var previousRawBuildCid = null
    try {
      previousRawBuildCid = await this.ipfsBundle.nameResolve(api, this.rawBuildName)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (previousRawBuildCid !== null) {
      var { cid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousRawBuildCid)
      console.log(`*** Resolved previous raw build node:
 ${this.gateway}/ipns/${this.rawBuildName}
 ${this.gateway}/ipfs/${previousRawBuildCid} ***`)
      await this.manageUnpin(api, previousRawBuildCid, false)
    }
    this.newRawBuildCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')
    var { name, value } = await this.ipfsBundle.namePublish(api, this.rawBuildName, this.newRawBuildCid, {
      resolve: false,
      key: this.rawBuildName,
      allowOffline: false,
      timeout: this.longTimeout,
    })
    console.log(`*** Reset raw build node:
${this.gateway}/ipns/${name}
${this.gateway}${value} ***`)
    var previousBuildCid = null
    try {
      previousBuildCid = await this.ipfsBundle.nameResolve(api, this.buildName)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (previousBuildCid !== null) {
      var { cid: previousBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousBuildCid)
      console.log(`*** Resolved previous build node:
 ${this.gateway}/ipns/${this.buildName}
 ${this.gateway}/ipfs/${previousBuildCid} ***`)
      await this.manageUnpin(api, previousBuildCid, false)
    }
    this.newBuildCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')
    var { name, value } = await this.ipfsBundle.namePublish(api, this.buildName, this.newBuildCid, {
      resolve: false,
      key: this.buildName,
      allowOffline: false,
      timeout: this.longTimeout,
    })
    console.log(`*** Reset build node:
${this.gateway}/ipns/${name}
${this.gateway}${value} ***`)
  }

  async publish (build) {
    // Ipfs
    const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    console.log('***')
    console.log(`*** Publish ${apiUrl} ***`)
    console.log('***')
    this.newRawBuildCid = null
    this.newBuildCid = null
    this.previousRawBuildCid = null
    this.previousBuildCid = null
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
    if (build !== null) {
      // Resolve build
      var buildCid = null
      var { cid: buildCid } = this.ipfsBundle.getIpfsIdentifier(build._source_uri)
      if (buildCid !== null) {
        var stat = null
        try {
          stat = await this.ipfsBundle.objectStat(api, buildCid, this.shortTimeout)
        } catch (error) {
          if (error.name !== 'FetchError' && error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
            throw error
          }
        }
        if (stat !== null) {
          console.log(`*** Resolved build: ${build._version}
 ${this.gateway}/ipfs/${buildCid} ***`)
        }
      }
    }
    try {
      const links = await this.processRawBuildNode(api, build)
      await this.processProductionBuildNode(api, links)
    } catch (error) {
      console.log(error)
    }
    // Load
    if (this.load) {
      if (this.newRawBuildCid !== null) {
        const rawBuildUri = `${this.gateway}/ipfs/${this.newRawBuildCid}/`
        await this.loadFromIpfs(rawBuildUri)
        console.log(`*** Fetched new raw build node:
 ${rawBuildUri} ***`)
      }
      if (this.newBuildCid !== null) {
        const buildUri = `${this.gateway}/ipfs/${this.newBuildCid}/`
        await this.loadFromIpfs(buildUri)
        console.log(`*** Fetched new build node:
 ${buildUri} ***`)
      }
    }
  }

  async publishProductionBuildNode (links) {
    // Ipfs
    const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    console.log('***')
    console.log(`*** Publish production build node ${apiUrl} ***`)
    console.log('***')
    this.newBuildCid = null
    this.previousBuildCid = null
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
    try {
      await this.processProductionBuildNode(api, links)
    } catch (error) {
      console.log(error)
    }
    // Load
    if (this.load) {
      if (this.newBuildCid !== null) {
        const buildUri = `${this.gateway}/ipfs/${this.newBuildCid}/`
        await this.loadFromIpfs(buildUri)
        console.log(`*** Fetched new build node:
 ${buildUri} ***`)
      } else if (this.previousBuildCid !== null) {
        const buildUri = `${this.gateway}/ipfs/${this.previousBuildCid}/`
        await this.loadFromIpfs(buildUri)
        console.log(`*** Fetched previous build node:
 ${buildUri} ***`)
      }
    }
    return this.newBuildCid
  }

  async processProductionBuildNode (api, links) {
    const builds = []
    var previousBuildCid = null
    try {
      previousBuildCid = await this.ipfsBundle.nameResolve(api, this.buildName)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (previousBuildCid !== null) {
      var { cid: previousBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousBuildCid)
      this.previousBuildCid = previousBuildCid
      console.log(`*** Resolved build node:
 ${this.gateway}/ipns/${this.buildName}
 ${this.gateway}/ipfs/${this.previousBuildCid} ***`)
      await this.manageUnpin(api, previousBuildCid, false)
    }
    if (links !== undefined && links !== null) {
      for (var i = 0; i < links.length; i++) {
        var build = null
        var buildCid = null
        try {
          if (links[i].Name === 'previous') {
            continue
          }
          build = await this.loadFromIpfs(`${this.gateway}/ipfs/${links[i].Hash}/current/build.json`, this.shortTimeout)
          build = JSON.parse(this.ipfsBundle.Utf8ArrayToStr(build))
          var { cid: buildCid } = this.ipfsBundle.getIpfsIdentifier(build._source_uri)
          if (buildCid === undefined || buildCid == null) {
            continue
          }
          const stat = await this.ipfsBundle.objectStat(api, buildCid, this.shortTimeout)
          if (stat !== undefined && stat !== null) {
            console.log(`*** Resolved build: ${links[i].Name}
 ${this.gateway}/ipfs/${buildCid} ***`)
            builds.push({
              Name: links[i].Name,
              Tsize: stat.CumulativeSize,
              Hash: new CID(buildCid),
            })
          } else {
            console.log(`*** Discard build: ${links[i].Name}
 ${this.gateway}/ipfs/${buildCid} ***`)
          }
        } catch (error) {
          console.log(`*** Discard build: ${links[i].Name}
 ${error.message} ***`)
        }
      }
      // https://discuss.ipfs.io/t/why-sort-links-in-pbnode/3157/3
      builds.sort((a, b) => {
        return b.Name.localeCompare(a.Name)
      })
      // Create a new build
      var newBuildCid = null
      var { cid: newBuildCid } = await this.dagPut(api, builds)
      this.newBuildCid = newBuildCid
      const { name, value } = await this.ipfsBundle.namePublish(api, this.buildName, this.newBuildCid, {
        resolve: false,
        key: this.buildName,
        allowOffline: false,
        timeout: this.longTimeout,
      })
      console.log(
        `*** Published build node:
 ${this.gateway}/ipns/${name}
 ${this.gateway}${value} ***`
      )
    }
  }

  async processRawBuildNode (api, build) {
    const links = []
    var currentBuildCid = null
    var currentBuildSize = null
    var latestBuild = null
    var latestPrerelease = null
    var latestRelease = null
    var previousRawBuildCid = null
    try {
      const options = {
        nocache: false,
        recursive: true,
        timeout: this.shortTimeout,
      }
      previousRawBuildCid = await this.ipfsBundle.nameResolve(api, this.rawBuildName, options)
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
        throw error
      }
    }
    if (previousRawBuildCid !== null) {
      var { cid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousRawBuildCid)
      this.previousRawBuildCid = previousRawBuildCid
      console.log(`*** Resolved raw build node:
 ${this.gateway}/ipns/${this.rawBuildName}
 ${this.gateway}/ipfs/${this.previousRawBuildCid} ***`)
      var rawBuildNode = null
      try {
        const options = {
          localResolve: false,
          timeout: this.shortTimeout,
        }
        rawBuildNode = await this.ipfsBundle.dagGet(api, this.previousRawBuildCid, options)
      } catch (error) {
        if (error.name !== 'TimeoutError' && error.name !== 'IPFSUnknownResult') {
          throw error
        }
      }
      if (rawBuildNode !== null) {
        const published = {}
        const rawBuildNodeLinks = rawBuildNode.value.Links
        for (var i = 0; i < rawBuildNodeLinks.length; i++) {
          if (rawBuildNodeLinks[i].Name === 'previous') {
            continue
          }
          const newLength = links.push({
            Hash: rawBuildNodeLinks[i].Hash,
            Name: rawBuildNodeLinks[i].Name,
            Tsize: rawBuildNodeLinks[i].Tsize,
          })
          if (rawBuildNodeLinks[i].Name.includes('latest-build')) {
            latestBuild = newLength - 1
          } else if (rawBuildNodeLinks[i].Name.includes('latest-pre-release')) {
            latestPrerelease = newLength - 1
          } else if (rawBuildNodeLinks[i].Name.includes('latest-release')) {
            latestRelease = newLength - 1
          }
          if (build !== undefined && build !== null && rawBuildNodeLinks[i].Name === build._version) {
            published.Hash = rawBuildNodeLinks[i].Hash
            published.Name = rawBuildNodeLinks[i].Name
          }
        }
        if (published.Hash !== undefined && published.Hash !== null) {
          console.log(`*** Build is already published: ${published.Name}
 ${this.gateway}/ipfs/${published.Hash} ***`)
          return rawBuildNode.value.Links
        }
      }
    }
    if (build !== undefined && build !== null) {
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
      console.log(`*** Added current build: ${build._version}
 ${this.gateway}/ipfs/${currentBuildCid} ***`)
      links.push({
        Name: build._version,
        Tsize: currentBuildSize,
        Hash: currentBuildCid,
      })
      if (build._version.includes('pre-release')) {
        if (latestPrerelease !== null) {
          links[latestPrerelease].Tsize = currentBuildSize
          links[latestPrerelease].Hash = currentBuildCid
        } else {
          links.push({
            Name: 'latest-pre-release',
            Tsize: currentBuildSize,
            Hash: currentBuildCid,
          })
        }
      } else if (build._version.includes('release')) {
        if (latestRelease !== null) {
          links[latestRelease].Tsize = currentBuildSize
          links[latestRelease].Hash = currentBuildCid
        } else {
          links.push({
            Name: 'latest-release',
            Tsize: currentBuildSize,
            Hash: currentBuildCid,
          })
        }
      } else {
        if (latestBuild !== null) {
          links[latestBuild].Tsize = currentBuildSize
          links[latestBuild].Hash = currentBuildCid
        } else {
          links.push({
            Name: 'latest-build',
            Tsize: currentBuildSize,
            Hash: currentBuildCid,
          })
        }
      }
      // https://discuss.ipfs.io/t/why-sort-links-in-pbnode/3157/3
      links.sort((a, b) => {
        return b.Name.localeCompare(a.Name)
      })
      // Create a new raw build
      var newRawBuildCid = null
      var { cid: newRawBuildCid } = await this.dagPut(api, links)
      if (this.previousRawBuildCid !== null && this.previousRawBuildCid.toString() !== newRawBuildCid.toString()) {
        links.push({
          Name: 'previous',
          Hash: new CID(this.previousRawBuildCid),
        })
        var { cid: newRawBuildCid } = await this.dagPut(api, links)
      }
      this.newRawBuildCid = newRawBuildCid
      const { name, value } = await this.ipfsBundle.namePublish(api, this.rawBuildName, this.newRawBuildCid, {
        resolve: false,
        key: this.rawBuildName,
        allowOffline: false,
        timeout: this.longTimeout,
      })
      console.log(`*** Published raw build node:
 ${this.gateway}/ipns/${name}
 ${this.gateway}${value} ***`)
      return links
    }
  }
}
