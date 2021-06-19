#!/usr/bin/env node
'use strict'

const CID = require('cids')
const dotenv = require('dotenv')
const fromString = require('uint8arrays').fromString
const fs = require('fs')
const path = require('path')
const IpfsUtils = require('bin/ipfs-utils.js')

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 * https://github.com/ipld/specs/blob/master/block-layer/codecs/dag-pb.md
 **/

module.exports = class Updater {
  dagDirectory = fromString('\u0008\u0001')
  emptyDirectoryCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')

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
    this.build = null
    this.production = null
    this.productionChild = null
    this.productionRaw = null
    this.productionRawChild = null
    this.productionRawCurrent = null
    this.currentRaw = null
    this.currentRawCid = null
  }

  async updateProduction () {
    console.log(`*** Updater: ${this.ipfsUtils.apiUrl} ***`)
    this.productionChild = []
    this.productionRawChild = []
    const api = this.ipfsUtils.getApiClient()
    // load build
    const { build, production, productionRaw, currentRaw, currentRawCid } = await this.ipfsUtils.loadBuild(api)
    this.build = build
    this.production = production
    this.productionRaw = productionRaw
    this.currentRaw = currentRaw
    this.currentRawCid = currentRawCid
    try {
      await this.processProductionRaw()
      await this.processProduction()
      // Cleanup
      delete this.build.productionRaw
      if (this.build.removeChild !== undefined && this.build.removeChild !== null && this.build.removeChild.length === 0) {
        delete this.build.removeChild
      }
      // Add build
      const productionBuild = await await this.ipfsUtils.addContent(api, '/build.json', this.build)
      // Add current
      this.productionRaw = await this.ipfsUtils.dagPut(api, [
        {
          Name: 'current',
          Tsize: this.productionRawCurrent.size,
          Hash: this.productionRawCurrent.cid,
        },
        {
          Name: 'build.json',
          Tsize: productionBuild.size,
          Hash: productionBuild.cid,
        },
      ])
      this.build.productionRaw = `${this.ipfsUtils.publicGateway}/ipfs/${this.productionRaw.cid}`
      fs.writeFileSync(`./current/build.json`, this.ipfsUtils.getJson(this.build), 'utf8')
      var msgProductionRaw = 'Current production raw:'
      if (productionRaw == null) {
        msgProductionRaw = `New production raw:`
      } else if (productionRaw.toString() !== this.productionRaw.cid.toString()) {
        msgProductionRaw = `Updated production raw:`
      }
      var msgProduction = 'Current production:'
      if (production == null) {
        msgProduction = `New production:`
      } else if (this.production == null || production.toString() !== this.production.cid.toString()) {
        msgProduction = `Updated production:`
      }
      if (this.production !== undefined && this.production !== null && this.production.cid) {
        console.log(` ${msgProduction} ${this.ipfsUtils.gateway}/ipfs/${this.production.cid}`)
      }
      if (this.productionRaw !== undefined && this.productionRaw !== null && this.productionRaw.cid) {
        console.log(` ${msgProductionRaw} ${this.ipfsUtils.gateway}/ipfs/${this.productionRaw.cid} ***`)
      }
    } catch (error) {
      console.log(error)
    }
  }

  async processProductionRaw () {
    const { ipfsCid: buildCid } = this.ipfsBundle.getIpfsIdentifier(this.build.sourceUri)
    const api = this.ipfsUtils.getApiClient()
    var buildDag = null
    try {
      buildDag = await this.ipfsBundle.dagGet(api, buildCid, {
        localResolve: false,
        timeout: this.ipfsUtils.shortTimeout,
      })
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'IPFSUnknownResult') {
        throw new Error(`Unknown ${this.build.sourceUri}`)
      } else {
        throw error
      }
    }
    console.log(`*** Resolved: ${this.ipfsUtils.apiUrl}
 ${this.ipfsUtils.gateway}/ipfs/${buildCid}`)
    // Process
    this.productionRawCurrent = await this.processRawContent(this.currentRaw, buildDag)
    if (this.currentRawCid !== null && this.productionRawCurrent !== null && this.currentRawCid.toString() !== this.productionRawCurrent.cid.toString()) {
      this.build.previousProduction = `${this.ipfsUtils.publicGateway}/ipfs/${this.production}`
      this.build.previousProductionRaw = `${this.ipfsUtils.publicGateway}/ipfs/${this.productionRaw}`
    }
    this.build.productionRawChild = this.productionRawChild
  }

  async processProduction () {
    if (this.productionRawCurrent !== undefined && this.productionRawCurrent !== null) {
      const api = this.ipfsUtils.getApiClient()
      const currentRaw = await this.ipfsBundle.dagGet(api, this.productionRawCurrent.cid, {
        localResolve: false,
        timeout: this.ipfsUtils.shortTimeout,
      })
      this.production = await this.processProductionContent(currentRaw)
      if (this.production !== null) {
        this.build.production = `${this.ipfsUtils.publicGateway}/ipfs/${this.production.cid}`
        this.build.productionChild = this.productionChild
      }
    }
  }

  async processProductionContent (current, parentPath) {
    if (current === undefined || current == null) {
      return null
    }
    parentPath = parentPath !== undefined && parentPath !== null && parentPath.trim() !== '' ? parentPath.trim() : '.'
    const builds = []
    const links = new Map()
    const versions = new Map()
    // Process directories
    for (var i = 0; i < current.value.Links.length; i++) {
      var childCurrent = null
      const link = current.value.Links[i]
      const contentPath = parentPath.trim() !== '' ? `${parentPath}/${link.Name}` : `${link.Name}`
      try {
        childCurrent = await this.ipfsBundle.dagGet(this.ipfsUtils.getApiClient(), link.Hash, {
          localResolve: false,
          timeout: this.ipfsUtils.shortTimeout,
        })
        if (childCurrent === undefined || childCurrent == null) {
          console.log(`*** Discard production: ${link.Name}
 ${this.ipfsUtils.gateway}/ipfs/${link.Hash} ***`)
          continue
        }
      } catch (error) {
        console.log(`*** Discard production: ${link.Name}
 ${this.ipfsUtils.gateway}/ipfs/${link.Hash} ***`)
        continue
      }
      if (this.ipfsBundle.isDirectory(childCurrent.value.Data)) {
        const childNode = await this.processProductionContent(childCurrent, contentPath)
        if (childNode !== undefined && childNode !== null) {
          const { build, builds: childBuilds, cid, size, version } = childNode
          links.set(link.Name, {
            Name: link.Name,
            Tsize: size,
            Hash: cid,
          })
          if (childBuilds !== null) {
            const dagNode = await this.ipfsBundle.dagGet(this.ipfsUtils.getApiClient(), cid, {
              localResolve: false,
              timeout: this.ipfsUtils.shortTimeout,
            })
            if (dagNode !== undefined && dagNode !== null && dagNode.value !== undefined && dagNode.value !== null) {
              for (var j = 0; j < dagNode.value.Links.length; j++) {
                this.productionChild.push({
                  name: `${parentPath}/${link.Name}`,
                  path: `/ipfs/${cid}/${dagNode.value.Links[j].Name}`,
                })
              }
            }
          }
          if (version !== null) {
            builds.push(build)
            if (version.match('build')) {
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
                links.set('latest-release', {
                  Name: 'latest-release',
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
    var currentBuild = null
    const rawBuildNodeLinks = current.value.Links
    for (var i = 0; i < rawBuildNodeLinks.length; i++) {
      if (rawBuildNodeLinks[i].Name === 'current.json') {
        const data = await this.ipfsUtils.loadFromIpfs(`${this.ipfsUtils.publicGateway}/ipfs/${rawBuildNodeLinks[i].Hash}`, this.ipfsUtils.shortTimeout)
        if (data !== undefined && data !== null) {
          var { content: currentBuild } = data
          currentBuild = JSON.parse(this.ipfsBundle.Utf8ArrayToStr(currentBuild))
        }
        break
      }
    }
    if (currentBuild !== null) {
      var ipfsUri = null
      try {
        var { ipfsCid: cid, ipnsIdentifier, ipfsPath } = this.ipfsBundle.getIpfsIdentifier(currentBuild.buildUri)
        var normalizedIpfsPath = null
        if (ipnsIdentifier !== null) {
          normalizedIpfsPath = `/ipns/${ipnsIdentifier}${ipfsPath}`
        } else {
          normalizedIpfsPath = `/ipfs/${cid}${ipfsPath}`
        }
        ipfsUri = `${this.ipfsUtils.gateway}${normalizedIpfsPath}`
        var { cid } = await this.ipfsBundle.dagResolve(this.ipfsUtils.getApiClient(), normalizedIpfsPath, this.ipfsUtils.shortTimeout)
        const stat = await this.ipfsBundle.objectStat(this.ipfsUtils.getApiClient(), cid, this.ipfsUtils.shortTimeout)
        if (stat !== undefined && stat !== null) {
          return {
            build: currentBuild.build,
            builds: null,
            cid: this.ipfsBundle.cidToCidV1(cid),
            size: stat.CumulativeSize,
            version: currentBuild.version,
          }
        } else {
          console.log(`*** Discard build: ${parentPath}
 ${ipfsUri} ***`)
        }
      } catch (error) {
        console.log(`*** Discard build: ${parentPath}
 error: ${error.message}
 ${ipfsUri} ***`)
      }
    }
    var newLinks = Array.from(links.values())
    // Reverse sort
    newLinks.sort((a, b) => {
      return b.Name.localeCompare(a.Name)
    })
    if (newLinks.length > 0) {
      const node = await this.ipfsUtils.dagPut(this.ipfsUtils.getApiClient(), newLinks)
      return {
        build: currentBuild !== null ? currentBuild.build : null,
        builds: builds.length > 0 ? builds : null,
        cid: this.ipfsBundle.cidToCidV1(node.cid),
        size: node.size,
        version: currentBuild !== null ? currentBuild.version : null,
      }
    }
    return null
  }

  async processRawContent (currentRaw, build, parentPath) {
    parentPath = parentPath !== undefined && parentPath !== null && parentPath.trim() !== '' ? parentPath.trim() : '.'
    const api = this.ipfsUtils.getApiClient()
    const links = new Map()
    const deletedLinks = new Map()
    const previousLinks = new Map()
    if (currentRaw !== undefined && currentRaw !== null) {
      for (var i = 0; i < currentRaw.value.Links.length; i++) {
        // deleted
        if (this.build.removeChild !== undefined && this.build.removeChild !== null) {
          const contentPath = currentRaw.value.Links[i].Name !== '' ? `${parentPath}/${currentRaw.value.Links[i].Name}` : parentPath
          if (this.build.removeChild.indexOf(contentPath) !== -1) {
            this.build.removeChild.splice(this.build.removeChild.indexOf(contentPath), 1)
            deletedLinks.set(contentPath, `/ipfs/${currentRaw.value.Links[i].Hash}`)
            console.log(`*** Deleted production raw ${contentPath}:
 ${this.ipfsUtils.gateway}/ipfs/${currentRaw.value.Links[i].Hash} ***`)
            continue
          }
        }
        const cidV1 = this.ipfsBundle.cidToCidV1(currentRaw.value.Links[i].Hash)
        links.set(currentRaw.value.Links[i].Name, {
          Hash: new CID(cidV1),
          Name: currentRaw.value.Links[i].Name,
          Tsize: currentRaw.value.Links[i].Tsize,
        })
      }
    }
    // Process child directories
    if (build !== undefined && build !== null) {
      for (var i = 0; i < build.value.Links.length; i++) {
        const link = build.value.Links[i]
        const contentPath = `${parentPath}/${link.Name}`
        const childBuild = await this.ipfsBundle.dagGet(api, link.Hash, {
          localResolve: false,
          timeout: this.ipfsUtils.shortTimeout,
        })
        if (this.ipfsBundle.isDirectory(childBuild.value.Data)) {
          var childCurrent = null
          var currentLink = links.get(link.Name)
          if (currentLink !== undefined) {
            childCurrent = await this.ipfsBundle.dagGet(api, currentLink.Hash, {
              localResolve: false,
              timeout: this.ipfsUtils.shortTimeout,
            })
          }
          const childNode = await this.processRawContent(childCurrent, childBuild, contentPath)
          if (childNode !== undefined && childNode !== null) {
            var currentLink = links.get(link.Name)
            if (currentLink !== undefined) {
              if (this.ipfsBundle.cidToCidV1(currentLink.Hash).toString() !== childNode.cid.toString()) {
                previousLinks.set(contentPath, `/ipfs/${currentLink.Hash}`)
                console.log(` Updated production raw: ${this.ipfsUtils.gateway}/ipfs/${childNode.cid}`)
              }
            } else {
              console.log(` New production raw: ${this.ipfsUtils.gateway}/ipfs/${childNode.cid}`)
            }
            links.set(link.Name, {
              Name: link.Name,
              Tsize: childNode.size,
              Hash: childNode.cid,
            })
            const dagNode = await this.ipfsBundle.dagGet(api, childNode.cid, {
              localResolve: false,
              timeout: this.ipfsUtils.shortTimeout,
            })
            if (dagNode !== undefined && dagNode !== null && dagNode.value !== undefined && dagNode.value !== null) {
              if (dagNode.value.Links.length > 0 && dagNode.value.Links[0].Name !== 'current.json') {
                for (var j = 0; j < dagNode.value.Links.length; j++) {
                  this.productionRawChild.push({
                    name: `${parentPath}/${link.Name}`,
                    path: `/ipfs/${childNode.cid}/${dagNode.value.Links[j].Name}`,
                  })
                }
              }
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
          timeout: this.ipfsUtils.longTimeout,
        }
      )
      if (added === undefined || added == null) {
        throw new Error('IPFS returned an unknown result...')
      }
      const currentLink = links.get(current.build)
      if (currentLink !== undefined) {
        if (this.ipfsBundle.cidToCidV1(currentLink.Hash).toString() !== added.cid.toString()) {
          previousLinks.set(currentPath, `${this.ipfsUtils.publicGateway}/ipfs/${currentLink.Hash}`)
          console.log(` Update current: ${this.ipfsUtils.gateway}/ipfs/${added.cid}`)
        }
      } else {
        console.log(` New current: ${this.ipfsUtils.gateway}/ipfs/${added.cid}`)
      }
      links.set(current.build, {
        Name: current.build,
        Tsize: added.size,
        Hash: added.cid,
      })
    }
    if (deletedLinks.size > 0) {
      const deleted = await this.ipfsUtils.addContent(api, '/deleted.json', Object.fromEntries(deletedLinks))
      links.set('deleted.json', {
        Name: 'deleted.json',
        Tsize: deleted.size,
        Hash: deleted.cid,
      })
    }
    if (previousLinks.size > 0) {
      const remotePrevious = await this.ipfsUtils.addContent(api, '/previous.json', Object.fromEntries(previousLinks))
      links.set('previous.json', {
        Name: 'previous.json',
        Tsize: remotePrevious.size,
        Hash: remotePrevious.cid,
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
}
