#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const CID = require('cids')
const dotenv = require('dotenv')
const fromString = require('uint8arrays').fromString
const fs = require('fs')
const { create: IpfsHttpClient } = require('ipfs-http-client')
const path = require('path')
const IpfsUtils = require('bin/ipfs-utils.js')

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = class Updater {
  shortTimeout = 8000
  longTimeout = 4 * 60 * this.shortTimeout
  dagDirectory = fromString('\u0008\u0001')
  emptyDirectoryCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')

  // bluelight.link
  IPNS_CID_RAW_BUILD = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'
  IPNS_CID_BUILD = 'k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl'

  constructor (load) {
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
    this.ipfsUtils = new IpfsUtils()
    this.ipfsBundle = this.ipfsUtils.ipfsBundle
    this.rawBuildCid = process.env.IPNS_CID_RAW_BUILD ? `${process.env.IPNS_CID_RAW_BUILD}` : this.IPNS_CID_RAW_BUILD
    this.buildCid = process.env.IPNS_CID_BUILD ? `${process.env.IPNS_CID_BUILD}` : this.IPNS_CID_BUILD
    this.load = load !== undefined && load !== null ? load : process.env.LOAD ? process.env.LOAD === 'true' || process.env.LOAD === true : true
    this.apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    this.gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}` : 'https://dweb.link'
    this.publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? `${process.env.IPFS_PUBLIC_GATEWAY}` : null
    if (this.publicGateway == null) {
      this.publicGateway = this.gateway
    }
  }

  async manageUnpin (api, key, recursive) {
    var key = new CID(key)
    recursive = recursive ? recursive === 'true' || recursive === true : true
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

  async production () {
    console.log(`*** Update Production:
 api: ${this.apiUrl}
 public production: ${this.publicGateway}/ipns/${this.buildCid}
 public raw: ${this.publicGateway}/ipns/${this.rawBuildCid}
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
    var rawBuildNode = null
    try {
      rawBuildNode = await this.processRawBuildNode(api)
      if (rawBuildNode !== null) {
        await this.processProductionBuildNode(api)
      }
      console.log(`*** Updated Production:
 api: ${this.apiUrl}
 public production: ${this.publicGateway}/ipns/${this.buildCid}
 public raw: ${this.publicGateway}/ipns/${this.rawBuildCid}
 production: ${this.gateway}/ipns/${this.buildCid}
 raw: ${this.gateway}/ipns/${this.rawBuildCid} ***`)
    } catch (error) {
      console.log(error)
    }
  }

  async processProductionContent (api, rawBuildNode, parentPath) {
    parentPath = parentPath !== undefined && parentPath !== null && parentPath.trim() !== '' ? parentPath : ''
    const links = new Map()
    const versions = new Map()
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
        console.log(`*** Unknown raw:
 ${nodeUri} ***`)
        continue
      }
      if (this.ipfsBundle.isDirectory(childRawBuildNode.value.Data)) {
        const result = await this.processProductionContent(api, childRawBuildNode, `${parentPath}/${link.Name}`)
        if (result !== null && result.cid !== undefined && result.cid !== null) {
          const { cid, size, version } = result
          links.set(link.Name, {
            Name: link.Name,
            Tsize: size,
            Hash: cid,
          })
          if (version !== null) {
            if (version.match('build') || version.match('release')) {
              const previous = links.get('latest-build')
              if (previous === undefined || version.localeCompare(versions.get(previous.Hash)) > 0) {
                links.set('latest-build', {
                  Name: 'latest-build',
                  Tsize: size,
                  Hash: cid,
                })
                versions.set(cid, version)
              }
            }
            if (version.match('pre-release')) {
              const previous = links.get('latest-pre-release')
              if (previous === undefined || version.localeCompare(versions.get(previous.Hash)) > 0) {
                links.set('latest-pre-release', {
                  Name: 'latest-pre-release',
                  Tsize: size,
                  Hash: cid,
                })
                versions.set(cid, version)
              }
            } else if (version.match('release')) {
              const previous = links.get('latest-release')
              if (previous === undefined || version.localeCompare(versions.get(previous.Hash)) > 0) {
                links.set('release', {
                  Name: 'release',
                  Tsize: size,
                  Hash: cid,
                })
                versions.set(cid, version)
              }
            }
          }
        }
      }
    }
    // Process current
    var current = null
    const rawBuildNodeLinks = rawBuildNode.value.Links
    for (var i = 0; i < rawBuildNodeLinks.length; i++) {
      if (rawBuildNodeLinks[i].Name === 'current.json') {
        const nodeUri = `${this.publicGateway}/ipfs/${rawBuildNodeLinks[i].Hash}`
        console.log(`*** Fetch current:
 ${nodeUri} ***`)
        const data = await this.ipfsUtils.loadFromIpfs(nodeUri, this.shortTimeout)
        if (data !== undefined && data !== null) {
          var { content: current } = data
          current = JSON.parse(this.ipfsBundle.Utf8ArrayToStr(current))
        }
        break
      }
    }
    if (current !== null) {
      try {
        var { ipfsCid: cid, ipnsIdentifier, ipfsPath } = this.ipfsBundle.getIpfsIdentifier(current.buildUri)
        var ipfsUri = null
        if (ipnsIdentifier !== null) {
          ipfsPath = `/ipns/${ipnsIdentifier}${ipfsPath}`
          ipfsUri = `ipns://${ipnsIdentifier}${ipfsPath}`
        } else {
          ipfsPath = `/ipfs/${cid}${ipfsPath}`
          ipfsUri = `ipfs://${cid}${ipfsPath}`
        }
        var { cid } = await this.ipfsBundle.dagResolve(api, ipfsPath, this.shortTimeout)
        const stat = await this.ipfsBundle.objectStat(api, cid, this.shortTimeout)
        if (stat !== undefined && stat !== null) {
          return {
            cid: this.ipfsBundle.cidToCidV1(cid),
            size: stat.CumulativeSize,
            version: current.version,
          }
        } else {
          console.log(`*** Discard build: ${parentPath}/${current.build}
 ${ipfsUri} ***`)
        }
      } catch (error) {
        console.log(`*** Discard build: ${parentPath}
 ${error.message} ***`)
      }
    }
    var newLinks = Array.from(links.values())
    // Reverse sort
    newLinks.sort((a, b) => {
      return b.Name.localeCompare(a.Name)
    })
    if (newLinks.length > 0) {
      const node = await this.ipfsUtils.dagPut(api, newLinks)
      if (this.load) {
        const nodeUri = `${this.gateway}/ipfs/${node.cid}`
        console.log(`*** Fetch Production node:
${nodeUri} ***`)
        this.ipfsUtils.loadFromIpfs(nodeUri)
      }
      return {
        cid: this.ipfsBundle.cidToCidV1(node.cid),
        size: node.size,
        version: current !== null ? current.version : null,
      }
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
    if (build.currentRawBuild === undefined || build.currentRawBuild == null) {
      try {
        var { cid: currentRawBuildCid } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.rawBuildCid}`, this.shortTimeout)
      } catch (error) {
        const nodeUri = `${this.gateway}/ipns/${this.rawBuildCid}`
        console.log(`*** Unknown raw:
 ${nodeUri} ***`)
      }
    } else {
      currentRawBuildCid = build.currentRawBuild
    }
    var currentRawBuild = null
    if (currentRawBuildCid !== null) {
      var { ipfsCid: currentRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(currentRawBuildCid)
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
            currentRawBuild = await this.ipfsBundle.dagGet(api, this.ipfsBundle.cidToCidV1(rawBuildNodeLinks[i].Hash), {
              localResolve: false,
              timeout: this.shortTimeout,
            })
            break
          }
        }
      }
    }
    // Process
    const node = await this.processProductionContent(api, currentRawBuild)
    if (node !== null) {
      // build node
      var currentBuildCid = null
      if (build.currentBuild === undefined || build.currentBuild == null) {
        try {
          var { cid: currentBuildCid } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.buildCid}`, this.shortTimeout)
        } catch (error) {
          console.log('Unknown Production...')
        }
      } else {
        currentBuildCid = build.currentBuild
      }
      if (currentBuildCid !== null) {
        var { ipfsCid: currentBuildCid } = this.ipfsBundle.getIpfsIdentifier(currentBuildCid)
        currentBuildCid = this.ipfsBundle.cidToCidV1(currentBuildCid)
      }
      build.currentBuild = `${this.publicGateway}/ipfs/${node.cid}`
      var msg = '*** Fetched'
      if (currentBuildCid == null || (currentBuildCid !== null && currentBuildCid.toString() !== node.cid.toString())) {
        if (currentBuildCid == null) {
          msg = `${msg} new`
        } else {
          build.previousBuild = `${this.publicGateway}/ipfs/${currentBuildCid}`
          msg = `${msg} updated`
        }
      } else {
        msg = `${msg} current`
      }
      fs.writeFileSync(`./current/build.json`, beautify(build, null, 2, 80), 'utf8')
      if (this.load) {
        const nodeUri = `${this.gateway}/ipfs/${node.cid}`
        console.log(`${msg} Production:
 ${nodeUri} ***`)
        this.ipfsUtils.loadFromIpfs(nodeUri)
      }
    }
    return node
  }

  async processRawContent (api, rawBuildNode, rawBuild, parentPath) {
    parentPath = parentPath !== undefined && parentPath !== null ? parentPath : null
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
    if (rawBuild !== undefined && rawBuild !== null) {
      for (var i = 0; i < rawBuild.value.Links.length; i++) {
        const link = rawBuild.value.Links[i]
        const contentPath = parentPath !== null && parentPath.trim() !== '' ? `${parentPath}/${link.Name}` : `${link.Name}`
        const childRawBuild = await this.ipfsBundle.dagGet(api, link.Hash, {
          localResolve: false,
          timeout: this.shortTimeout,
        })
        if (this.ipfsBundle.isDirectory(childRawBuild.value.Data)) {
          // child raw build node
          var childRawBuildNode = null
          const childLink = links.get(link.Name)
          if (childLink !== undefined) {
            childRawBuildNode = await this.ipfsBundle.dagGet(api, childLink.Hash, {
              localResolve: false,
              timeout: this.shortTimeout,
            })
          }
          const childNode = await this.processRawContent(api, childRawBuildNode, childRawBuild, contentPath)
          if (childNode !== null) {
            const currentLink = links.get(link.Name)
            if (currentLink !== undefined) {
              if (this.ipfsBundle.cidToCidV1(currentLink.Hash).toString() !== childNode.cid.toString()) {
                previousLinks.set(contentPath, `${this.publicGateway}/ipfs/${currentLink.Hash}`)
                console.log(`Update: ${link.Name}`)
              }
            } else {
              console.log(`New: ${link.Name}`)
            }
            links.set(link.Name, {
              Name: link.Name,
              Tsize: childNode.size,
              Hash: childNode.cid,
            })
            if (this.load) {
              const rawNodeUri = `${this.gateway}/ipfs/${childNode.cid}`
              console.log(`*** Fetch Raw node:
 ${rawNodeUri} ***`)
              this.ipfsUtils.loadFromIpfs(rawNodeUri)
            }
          }
        }
      }
    }
    // Process current
    var current = null
    const currentPath = `${parentPath}/current.json`
    const pathname = path.resolve(`./current/${currentPath}`)
    if (fs.existsSync(pathname)) {
      const currentContent = fs.readFileSync(pathname, 'utf8')
      if (currentContent === undefined || currentContent == null) {
        throw new Error(`Unknown current: ${pathname}`)
      }
      current = JSON.parse(currentContent)
      const added = await api.add(
        {
          path: `/current.json`,
          content: currentContent,
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
      const currentLink = links.get(current.build)
      if (currentLink !== undefined) {
        if (this.ipfsBundle.cidToCidV1(currentLink.Hash).toString() !== added.cid.toString()) {
          previousLinks.set(currentPath, `${this.publicGateway}/ipfs/${currentLink.Hash}`)
          console.log(`Update: ${currentPath}`)
        }
      } else {
        console.log(`New: ${currentPath}`)
      }
      links.set(current.build, {
        Name: current.build,
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
    // Reverse sort
    newLinks.sort((a, b) => {
      return b.Name.localeCompare(a.Name)
    })
    if (newLinks.length > 0) {
      return await this.ipfsUtils.dagPut(api, newLinks)
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
    const { ipfsCid: buildCid } = this.ipfsBundle.getIpfsIdentifier(build.sourceUri)
    var rawBuild = null
    try {
      rawBuild = await this.ipfsBundle.dagGet(api, buildCid, {
        localResolve: false,
        timeout: this.shortTimeout,
      })
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'IPFSUnknownResult') {
        throw new Error(`Unknown ${build.sourceUri}`)
      } else {
        throw error
      }
    }
    // Raw build node
    var currentRawBuild = null
    var currentRawBuildCid = null
    var previousRawBuildCid = null
    if (build.currentRawBuild === undefined || build.currentRawBuild == null) {
      try {
        var { cid: previousRawBuildCid } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.rawBuildCid}`, this.shortTimeout)
      } catch (error) {
        console.log('Unknown Raw...')
      }
    } else {
      previousRawBuildCid = build.currentRawBuild
    }
    if (previousRawBuildCid !== null) {
      var { ipfsCid: previousRawBuildCid } = this.ipfsBundle.getIpfsIdentifier(previousRawBuildCid)
      previousRawBuildCid = this.ipfsBundle.cidToCidV1(previousRawBuildCid)
      var rawBuildNode = null
      try {
        rawBuildNode = await this.ipfsBundle.dagGet(api, previousRawBuildCid, {
          localResolve: false,
          timeout: this.shortTimeout,
        })
      } catch (error) {
        previousRawBuildCid = null
        console.log('Unknown Raw...')
      }
      if (rawBuildNode !== null) {
        const rawBuildNodeLinks = rawBuildNode.value.Links
        for (var i = 0; i < rawBuildNodeLinks.length; i++) {
          if (rawBuildNodeLinks[i].Name === 'current') {
            try {
              const cidV1 = this.ipfsBundle.cidToCidV1(rawBuildNodeLinks[i].Hash)
              currentRawBuild = await this.ipfsBundle.dagGet(api, cidV1, {
                localResolve: false,
                timeout: this.shortTimeout,
              })
              currentRawBuildCid = cidV1
            } catch (error) {
              // Ignore
            }
            break
          }
        }
      }
    }
    // Process
    var node = await this.processRawContent(api, currentRawBuild, rawBuild)
    if (node !== undefined && node !== null) {
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
          this.ipfsUtils.loadFromIpfs(rawNodeUri)
        }
        node = await this.ipfsUtils.dagPut(api, links)
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
        this.ipfsUtils.loadFromIpfs(rawNodeUri)
      }
    }
    return node
  }
}
