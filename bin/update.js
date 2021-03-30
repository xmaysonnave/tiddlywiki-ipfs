#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const CID = require('cids')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fromString = require('uint8arrays').fromString
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const path = require('path')
const { pipeline } = require('stream')
const { promisify } = require('util')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = class Update {
  shortTimeout = 4000
  longTimeout = 2 * 60 * this.shortTimeout
  dagDirectory = fromString('\u0008\u0001')
  emptyDirectoryCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')

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

  isDirectory (ua) {
    if (ua.byteLength !== this.dagDirectory.byteLength) return false
    return ua.every((val, i) => val === this.dagDirectory[i])
  }

  async resetBuild () {
    // Ipfs
    const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    console.log('***')
    console.log(`*** Reset builds:
 api: ${apiUrl}
 gateway: ${new URL(this.gateway)}
 public gateway: ${new URL(this.publicGateway)} ***`)
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
      console.log(`*** Unpin previous raw build node:
 ${this.gateway}/ipns/${this.rawBuildName}
 ${this.gateway}/ipfs/${previousRawBuildCid} ***`)
      await this.manageUnpin(api, previousRawBuildCid, false)
    }
    var { name, value } = await this.ipfsBundle.namePublish(api, this.rawBuildName, this.emptyDirectoryCid, {
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
      console.log(`*** Unpin previous build node:
 ${this.gateway}/ipns/${this.buildName}
 ${this.gateway}/ipfs/${previousBuildCid} ***`)
      await this.manageUnpin(api, previousBuildCid, false)
    }
    var { name, value } = await this.ipfsBundle.namePublish(api, this.buildName, this.emptyDirectoryCid, {
      resolve: false,
      key: this.buildName,
      allowOffline: false,
      timeout: this.longTimeout,
    })
    console.log(`*** Reset build node:
 ${this.gateway}/ipns/${name}
 ${this.gateway}${value} ***`)
  }

  async publishBuild () {
    const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    console.log('***')
    console.log(`*** Update builds:
 api: ${apiUrl}
 gateway: ${new URL(this.gateway)}
 public gateway: ${new URL(this.publicGateway)} ***`)
    console.log('***')
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
    var buildNode = null
    var rawBuildNode = null
    try {
      rawBuildNode = await this.processRawBuildNode(api)
      if (rawBuildNode !== null) {
        buildNode = await this.processProductionBuildNode(api)
      }
    } catch (error) {
      console.log(error)
    }
    // Load
    if (this.load) {
      if (rawBuildNode !== null) {
        const rawBuildUri = `${this.gateway}/ipfs/${rawBuildNode.cid}`
        await this.loadFromIpfs(rawBuildUri)
        console.log(`*** Fetched raw build node:
 ${rawBuildUri} ***`)
      }
      if (buildNode !== null) {
        const buildUri = `${this.gateway}/ipfs/${buildNode.cid}`
        await this.loadFromIpfs(buildUri)
        console.log(`*** Fetched build node:
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
      if (this.newRawBuildCid !== null) {
        const rawBuildUri = `${this.gateway}/ipfs/${this.newRawBuildCid}/`
        await this.loadFromIpfs(rawBuildUri)
        console.log(`*** Fetched new raw build node:
 ${rawBuildUri} ***`)
      } else if (this.previousRawBuildCid !== null) {
        const rawBuildUri = `${this.gateway}/ipfs/${this.previousRawBuildCid}/`
        await this.loadFromIpfs(rawBuildUri)
        console.log(`*** Fetched previous raw build node:
 ${rawBuildUri} ***`)
      }
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

  async processProductionContent (api, rawBuildNode) {
    const links = new Map()
    // Process directories
    for (var i = 0; i < rawBuildNode.value.Links.length; i++) {
      const link = rawBuildNode.value.Links[i]
      const childRawBuildNode = await this.ipfsBundle.dagGet(api, link.Hash, {
        localResolve: false,
        timeout: this.shortTimeout,
      })
      if (this.isDirectory(childRawBuildNode.value.Data)) {
        const childNode = await this.processProductionContent(api, childRawBuildNode)
        if (childNode !== null) {
          links.set(link.Name, {
            Name: link.Name,
            Tsize: childNode.size,
            Hash: this.ipfsBundle.cidToCidV1(childNode.cid),
          })
        }
      }
    }
    // Process current
    var builds = null
    const rawBuildNodeLinks = rawBuildNode.value.Links
    for (var i = 0; i < rawBuildNodeLinks.length; i++) {
      if (rawBuildNodeLinks[i].Name === 'current.json') {
        builds = await this.loadFromIpfs(`${this.gateway}/ipfs/${rawBuildNodeLinks[i].Hash}`, this.shortTimeout)
        builds = JSON.parse(this.ipfsBundle.Utf8ArrayToStr(builds))
        break
      }
    }
    if (builds !== null) {
      try {
        for (var i = 0; i < builds.length; i++) {
          const { cid } = this.ipfsBundle.getIpfsIdentifier(builds[i].sourceUri)
          const stat = await this.ipfsBundle.objectStat(api, cid, this.shortTimeout)
          if (stat !== undefined && stat !== null) {
            links.set(builds[i].title, {
              Name: builds[i].title,
              Tsize: stat.CumulativeSize,
              Hash: new CID(cid),
            })
          } else {
            console.log(`*** Discard build: ${builds[i].title}
 ${this.gateway}/ipfs/${cid} ***`)
          }
        }
      } catch (error) {
        console.log(`*** Discard build: ${builds[i].title}
 ${error.message} ***`)
      }
    }
    const newLinks = Array.from(links.values())
    newLinks.sort((a, b) => {
      return a.Name.localeCompare(b.Name)
    })
    if (newLinks.length > 0) {
      return await this.dagPut(api, newLinks)
    }
    return null
  }

  async processProductionBuildNode (api) {
    // Raw build
    const buildPath = `./current/build.json`
    if (fs.existsSync(buildPath) === false) {
      throw new Error(`Unknown ${buildPath}`)
    }
    const build = JSON.parse(fs.readFileSync(buildPath))
    // Raw build node
    var currentRawBuildCid = null
    if (build._currentRawBuild === undefined || build._currentRawBuild == null) {
      try {
        currentRawBuildCid = await this.ipfsBundle.nameResolve(api, this.rawBuildName, {
          recursive: true,
          timeout: this.shortTimeout,
        })
      } catch (error) {
        console.log('Unknown raw build node...')
      }
    } else {
      currentRawBuildCid = build._currentRawBuild
    }
    var currentRawBuildNode = null
    var { cid: currentRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(currentRawBuildCid)
    const rawBuildNode = await this.ipfsBundle.dagGet(api, this.ipfsBundle.cidToCidV1(currentRawBuildCid), {
      localResolve: false,
      timeout: this.shortTimeout,
    })
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
    // Process
    var node = await this.processProductionContent(api, currentRawBuildNode)
    if (node !== null) {
      build._currentBuild = `${this.gateway}/ipfs/${node.cid}`
      fs.writeFileSync(`./current/build.json`, beautify(build, null, 2, 80), 'utf8')
    }
    return node
  }

  async processRawContent (api, rawBuildNode, rawBuild, parentDir) {
    parentDir = parentDir !== undefined && parentDir !== null ? parentDir : ''
    const currentDirPathname = path.resolve(`./current/${parentDir}`)
    const links = new Map()
    const previousLinks = new Map()
    if (rawBuildNode !== undefined && rawBuildNode !== null) {
      const rawBuildNodeLinks = rawBuildNode.value.Links
      for (var i = 0; i < rawBuildNodeLinks.length; i++) {
        const cidV1 = this.ipfsBundle.cidToCidV1(rawBuildNodeLinks[i].Hash)
        links.set(rawBuildNodeLinks[i].Name, {
          Hash: new CID(cidV1),
          Name: rawBuildNodeLinks[i].Name,
          Tsize: rawBuildNodeLinks[i].Tsize,
        })
      }
    }
    // Process directories
    for (var i = 0; i < rawBuild.value.Links.length; i++) {
      const link = rawBuild.value.Links[i]
      const contentPathname = parentDir !== undefined && parentDir !== null && parentDir.trim() !== '' ? `${parentDir}/${link.Name}` : `${link.Name}`
      const childRawBuild = await this.ipfsBundle.dagGet(api, link.Hash, {
        localResolve: false,
        timeout: this.shortTimeout,
      })
      if (this.isDirectory(childRawBuild.value.Data)) {
        // child raw build node
        var childRawBuildNode = null
        const childLink = links.get(link.Name)
        if (childLink !== undefined) {
          childRawBuildNode = await this.ipfsBundle.dagGet(api, childLink.Hash, {
            localResolve: false,
            timeout: this.shortTimeout,
          })
        }
        const childNode = await this.processRawContent(api, childRawBuildNode, childRawBuild, contentPathname)
        if (childNode !== null) {
          const cidV1 = this.ipfsBundle.cidToCidV1(childNode.cid)
          const currentLink = links.get(link.Name)
          if (currentLink !== undefined) {
            if (this.ipfsBundle.cidToCidV1(currentLink.Hash).toString() !== cidV1.toString()) {
              previousLinks.set(contentPathname, `${this.publicGateway}/ipfs/${currentLink.Hash}`)
              console.log(`Update: ${link.Name}`)
            }
          } else {
            console.log(`New: ${link.Name}`)
          }
          links.set(link.Name, {
            Name: link.Name,
            Tsize: childNode.size,
            Hash: cidV1,
          })
        }
      }
    }
    // Process current
    var build = null
    const currentRelativePathname = `${currentDirPathname}/current.json`
    const pathname = path.resolve(currentRelativePathname)
    if (fs.existsSync(pathname)) {
      const current = fs.readFileSync(pathname, 'utf8')
      if (current === undefined || current == null) {
        throw new Error(`Unknown current: ${pathname}`)
      }
      build = JSON.parse(current)[0]._build
      const added = await api.add(
        {
          path: `/current.json`,
          content: current,
        },
        {
          chunker: 'rabin-262144-524288-1048576',
          cidVersion: 1,
          hashAlg: 'sha2-256',
          pin: false,
          rawLeaves: false,
          wrapWithDirectory: true,
          timeout: this.longTimeout,
        }
      )
      if (added === undefined || added == null) {
        throw new Error('IPFS returned an unknown result...')
      }
      const currentLink = links.get(build)
      if (currentLink !== undefined) {
        if (this.ipfsBundle.cidToCidV1(currentLink.Hash).toString() !== added.cid.toString()) {
          previousLinks.set(currentRelativePathname, `${this.publicGateway}/ipfs/${currentLink.Hash}`)
          console.log(`Update: ${currentRelativePathname}`)
        }
      } else {
        console.log(`New: ${currentRelativePathname}`)
      }
      links.set(build, {
        Name: build,
        Tsize: added.size,
        Hash: added.cid,
      })
    }
    if (previousLinks.size > 0) {
      const obj = Object.fromEntries(previousLinks)
      const added = await api.add(
        {
          path: `/previous.json`,
          content: beautify(obj, null, 2, 80),
        },
        {
          chunker: 'rabin-262144-524288-1048576',
          cidVersion: 1,
          hashAlg: 'sha2-256',
          pin: false,
          rawLeaves: false,
          wrapWithDirectory: false,
          timeout: this.longTimeout,
        }
      )
      if (added === undefined || added == null) {
        throw new Error('IPFS returned an unknown result...')
      }
      links.set('previous.json', {
        Name: 'previous.json',
        Tsize: added.size,
        Hash: added.cid,
      })
    }
    const newLinks = Array.from(links.values())
    newLinks.sort((a, b) => {
      return a.Name.localeCompare(b.Name)
    })
    if (newLinks.length > 0) {
      return await this.dagPut(api, newLinks)
    }
    return null
  }

  async processRawBuildNode (api) {
    // Raw build
    const buildPath = `./current/build.json`
    if (fs.existsSync(buildPath) === false) {
      throw new Error(`Unknown ${buildPath}`)
    }
    const build = JSON.parse(fs.readFileSync(buildPath))
    const { cid: buildCid } = this.ipfsBundle.getIpfsIdentifier(build.sourceUri)
    const rawBuild = await this.ipfsBundle.dagGet(api, buildCid, {
      localResolve: false,
      timeout: this.shortTimeout,
    })
    // Raw build node
    var currentRawBuildNode = null
    var currentRawBuildNodeCid = null
    var previousRawBuildCid = null
    if (build._currentRawBuild === undefined || build._currentRawBuild == null) {
      try {
        previousRawBuildCid = await this.ipfsBundle.nameResolve(api, this.rawBuildName, {
          recursive: true,
          timeout: this.shortTimeout,
        })
      } catch (error) {
        console.log('Unknown raw build node...')
      }
    } else {
      previousRawBuildCid = build._currentRawBuild
    }
    var { cid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousRawBuildCid)
    previousRawBuildCid = this.ipfsBundle.cidToCidV1(previousRawBuildCid)
    const rawBuildNode = await this.ipfsBundle.dagGet(api, previousRawBuildCid, {
      localResolve: false,
      timeout: this.shortTimeout,
    })
    const rawBuildNodeLinks = rawBuildNode.value.Links
    for (var i = 0; i < rawBuildNodeLinks.length; i++) {
      if (rawBuildNodeLinks[i].Name === 'current') {
        const cidV1 = this.ipfsBundle.cidToCidV1(rawBuildNodeLinks[i].Hash)
        currentRawBuildNode = await this.ipfsBundle.dagGet(api, cidV1, {
          localResolve: false,
          timeout: this.shortTimeout,
        })
        currentRawBuildNodeCid = cidV1
        break
      }
    }
    // Process
    var node = await this.processRawContent(api, currentRawBuildNode, rawBuild)
    if (node !== null) {
      const links = []
      if (currentRawBuildNodeCid == null || (currentRawBuildNodeCid !== null && currentRawBuildNodeCid.toString() !== node.cid.toString())) {
        if (previousRawBuildCid !== null) {
          const stat = await this.ipfsBundle.objectStat(api, previousRawBuildCid, this.shortTimeout)
          links.push({
            Name: 'previous',
            Tsize: stat.CumulativeSize,
            Hash: previousRawBuildCid,
          })
          build._previousRawBuild = `${this.gateway}/ipfs/${previousRawBuildCid}`
        }
        links.push({
          Name: 'current',
          Tsize: node.size,
          Hash: node.cid,
        })
        node = await this.dagPut(api, links)
        console.log(`*** Raw build node:
 ${this.gateway}/ipns/${this.rawBuildName}
 ${this.gateway}/ipfs/${node.cid} ***`)
        build._currentRawBuild = `${this.gateway}/ipfs/${node.cid}`
        fs.writeFileSync(`./current/build.json`, beautify(build, null, 2, 80), 'utf8')
      }
    }
    return node
  }
}
