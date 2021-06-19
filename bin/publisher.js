#!/usr/bin/env node
'use strict'

const CID = require('cids')
const dotenv = require('dotenv')
const fromString = require('uint8arrays').fromString
const fs = require('fs')
const IpfsUtils = require('bin/ipfs-utils.js')

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 * https://github.com/ipld/specs/blob/master/block-layer/codecs/dag-pb.md
 **/

module.exports = class Publisher {
  dagDirectory = fromString('\u0008\u0001')
  emptyDirectoryCid = new CID('bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354')

  constructor (dir, pin) {
    this.dotEnv = dotenv.config()
    if (this.dotEnv.error) {
      throw this.dotEnv.error
    }
    require('events').EventEmitter.defaultMaxListeners = Infinity
    this.rawBuildKey = process.env.IPNS_PRODUCTION_RAW_KEY ? process.env.IPNS_PRODUCTION_RAW_KEY : null
    if (this.rawBuildKey == null) {
      throw Error('Undefined raw build IPNS key')
    }
    this.buildKey = process.env.IPNS_PRODUCTION_KEY ? process.env.IPNS_PRODUCTION_KEY : null
    if (this.buildKey == null) {
      throw Error('Undefined build IPNS key')
    }
    this.ipfsUtils = new IpfsUtils()
    this.ipfsBundle = this.ipfsUtils.ipfsBundle
    this.dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : '.'
    this.pin = pin !== undefined && pin !== null ? pin : process.env.PIN ? process.env.PIN === 'true' || process.env.PIN === true : true
    this.productionRawChild = null
  }

  async managePin (api, key, recursive) {
    var key = new CID(key)
    var cid = null
    try {
      for await (var { cid } of api.pin.ls({ paths: [key], timeout: this.ipfsUtils.shortTimeout })) {
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
          timeout: this.ipfsUtils.longTimeout,
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
      for await (var { cid } of api.pin.ls({ paths: [key], timeout: this.ipfsUtils.shortTimeout })) {
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
          timeout: this.ipfsUtils.longTimeout,
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
      var { cid } = await this.ipfsBundle.dagResolve(api, `/ipns/${ipnsCid}`, this.ipfsUtils.shortTimeout)
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
    console.log(`*** Reset Production: ${this.ipfsUtils.apiUrl}
 production: ${this.ipfsUtils.gateway}/ipns/${this.ipfsUtils.IPNS_PRODUCTION}
 production raw: ${this.ipfsUtils.gateway}/ipns/${this.ipfsUtils.IPNS_PRODUCTION_RAW} ***`)
    const api = this.ipfsUtils.getApiClient()
    const previousProductionRawCid = await this.resolveIPNS(api, this.ipfsUtils.IPNS_PRODUCTION_RAW)
    if (previousProductionRawCid !== null && previousProductionRawCid.toString() !== this.emptyDirectoryCid.toString()) {
      console.log(`*** Unpin previous Production Raw:
 ${this.ipfsUtils.gateway}/ipfs/${previousProductionRawCid} ***`)
      await this.manageUnpin(api, previousProductionRawCid, true)
      console.log(`*** Publish empty directory to Production Raw:
 ${this.ipfsUtils.gateway}/ipfs/${this.emptyDirectoryCid} ***`)
      await this.ipfsBundle.namePublish(api, this.rawBuildKey, this.emptyDirectoryCid, {
        resolve: false,
        key: this.rawBuildKey,
        allowOffline: false,
        timeout: this.ipfsUtils.longTimeout,
      })
    }
    const previousProductionCid = await this.resolveIPNS(api, this.ipfsUtils.IPNS_PRODUCTION)
    if (previousProductionCid !== null && previousProductionCid.toString() !== this.emptyDirectoryCid.toString()) {
      console.log(`*** Unpin previous Production:
 ${this.ipfsUtils.gateway}/ipfs/${previousProductionCid} ***`)
      await this.manageUnpin(api, previousProductionCid, true)
      console.log(`*** Publish empty directory to Production:
 ${this.ipfsUtils.gateway}/ipfs/${this.emptyDirectoryCid} ***`)
      await this.ipfsBundle.namePublish(api, this.buildKey, this.emptyDirectoryCid, {
        resolve: false,
        key: this.buildKey,
        allowOffline: false,
        timeout: this.ipfsUtils.longTimeout,
      })
    }
  }

  async checkParentPin (api, cid, purge, ipfsPath) {
    var dag = null
    try {
      dag = await this.ipfsBundle.dagGet(api, cid, {
        localResolve: false,
        timeout: this.ipfsUtils.shortTimeout,
      })
      if (dag === undefined || dag == null) {
        throw new Error(`Unkwown dag: ${cid}`)
      }
    } catch (error) {
      throw new Error(`Unkwown dag: ${cid}`)
    }
    if (ipfsPath) {
      console.log(`*** Parent Check:
 ${this.ipfsUtils.gateway}/ipfs/${cid}
 ipfsPath: ${ipfsPath} ***`)
    } else {
      console.log(`*** Parent Check:
 ${this.ipfsUtils.gateway}/ipfs/${cid} ***`)
    }
    var pinSet = await this.ipfsBundle.getPin(api, cid, null, ipfsPath, this.ipfsUtils.shortTimeout)
    // Process
    for (var i = 0; i < pinSet.length; i++) {
      console.log(`*** Pin: ${pinSet[i].cid}, type: ${pinSet[i].type}${pinSet[i].parentCid ? ',\n parent: ' + pinSet[i].parentCid + ' ***' : ' ***'}`)
      if (pinSet[i].parentCid !== undefined && pinSet[i].parentCid !== null) {
        try {
          await this.checkParentPin(api, pinSet[i].parentCid, purge)
        } catch (error) {
          console.log(`*** Unable to resolve dag...
 ${this.ipfsUtils.gateway}/ipfs/${pinSet[i].parentCid}
 ${error.message} ***`)
          continue
        }
      }
      if (purge) {
        var processed = false
        if (pinSet[i].type === 'recursive') {
          processed = await this.manageUnpin(api, pinSet[i].cid, true)
        } else {
          processed = await this.manageUnpin(api, pinSet[i].cid, false)
        }
        if (processed) {
          console.log(`*** Unpined, type: ${pinSet[i].type},
 ${this.ipfsUtils.gateway}/ipfs/${pinSet[i].cid} ***`)
        }
      }
    }
  }

  async checkProductionRaw (api, currentRaw, purge, parentPath) {
    parentPath = parentPath !== undefined && parentPath !== null && parentPath.trim() !== '' ? parentPath.trim() : '.'
    const links = new Map()
    const deletedLinks = new Map()
    for (var i = 0; i < currentRaw.value.Links.length; i++) {
      // deleted
      if (this.build.removeChild !== undefined && this.build.removeChild !== null) {
        const contentPath = currentRaw.value.Links[i].Name !== '' ? `${parentPath}/${currentRaw.value.Links[i].Name}` : parentPath
        if (this.build.removeChild.indexOf(contentPath) !== -1) {
          this.build.removeChild.splice(this.build.removeChild.indexOf(contentPath), 1)
          deletedLinks.set(contentPath, `/ipfs/${currentRaw.value.Links[i].Hash}`)
          console.log(`*** Deleted ${contentPath}:
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
    // Process child directories
    for (var i = 0; i < currentRaw.value.Links.length; i++) {
      var childCurrentRaw = null
      const link = currentRaw.value.Links[i]
      const contentPath = link.Name !== '' ? `${parentPath}/${link.Name}` : parentPath
      try {
        childCurrentRaw = await this.ipfsBundle.dagGet(api, link.Hash, {
          localResolve: false,
          timeout: this.ipfsUtils.shortTimeout,
        })
        if (childCurrentRaw === undefined || childCurrentRaw == null) {
          console.log(`*** Discard production raw: ${link.Name}
 ${this.ipfsUtils.gateway}/ipfs/${link.Hash} ***`)
          continue
        }
      } catch (error) {
        console.log(`*** Discard production raw: ${link.Name}
 ${this.ipfsUtils.gateway}/ipfs/${link.Hash} ***`)
        continue
      }
      if (this.ipfsBundle.isDirectory(childCurrentRaw.value.Data)) {
        const childNode = await this.checkProductionRaw(api, childCurrentRaw, purge, contentPath)
        if (childNode !== undefined && childNode !== null) {
          const { cid, size } = childNode
          if (cid !== undefined && cid !== null) {
            links.set(link.Name, {
              Name: link.Name,
              Tsize: size,
              Hash: cid,
            })
            const dagNode = await this.ipfsBundle.dagGet(api, cid, {
              localResolve: false,
              timeout: this.ipfsUtils.shortTimeout,
            })
            if (dagNode !== undefined && dagNode !== null && dagNode.value !== undefined && dagNode.value !== null) {
              if (dagNode.value.Links.length > 0 && dagNode.value.Links[0].Name !== 'current.json') {
                for (var j = 0; j < dagNode.value.Links.length; j++) {
                  this.productionRawChild.push({
                    name: `${parentPath}/${link.Name}`,
                    path: `/ipfs/${cid}/${dagNode.value.Links[j].Name}`,
                  })
                }
              }
            }
          }
        }
      }
    }
    // Process current
    var currentBuild = null
    for (var i = 0; i < currentRaw.value.Links.length; i++) {
      const link = currentRaw.value.Links[i]
      if (link.Name === 'current.json') {
        const data = await this.ipfsUtils.loadFromIpfs(`${this.ipfsUtils.publicGateway}/ipfs/${link.Hash}`, this.ipfsUtils.shortTimeout)
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
        var { cid } = await this.ipfsBundle.dagResolve(api, normalizedIpfsPath, this.ipfsUtils.shortTimeout)
        const stat = await this.ipfsBundle.objectStat(api, cid, this.ipfsUtils.shortTimeout)
        if (stat !== undefined && stat !== null) {
          return {
            cid: this.ipfsBundle.cidToCidV1(cid),
            size: stat.CumulativeSize,
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
    if (deletedLinks.size > 0) {
      const deleted = await this.ipfsUtils.addContent(api, '/deleted.json', Object.fromEntries(deletedLinks))
      links.set('deleted.json', {
        Name: 'deleted.json',
        Tsize: deleted.size,
        Hash: deleted.cid,
      })
    }
    var newLinks = Array.from(links.values())
    // Reverse sort
    newLinks.sort((a, b) => {
      return b.Name.localeCompare(a.Name)
    })
    if (newLinks.length > 0) {
      const node = await this.ipfsUtils.dagPut(api, newLinks)
      return {
        cid: this.ipfsBundle.cidToCidV1(node.cid),
        size: node.size,
      }
    }
    return null
  }

  async check (purge, ipfsPath) {
    purge = purge !== undefined && purge !== null ? purge === 'true' || purge === true : false
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : null
    const api = this.ipfsUtils.getApiClient()
    if (ipfsPath == null) {
      const { productionRaw } = await this.ipfsUtils.loadBuild(api)
      ipfsPath = `/ipfs/${productionRaw}`
    }
    console.log(`*** ${purge ? 'Purge' : 'Check'}: ${this.ipfsUtils.apiUrl}${',\n path: ' + this.ipfsUtils.gateway + ipfsPath} ***`)
    try {
      var { ipfsCid, ipfsPath } = this.ipfsBundle.getIpfsIdentifier(ipfsPath)
      var dag = await this.ipfsBundle.dagResolve(api, ipfsCid, this.ipfsUtils.shortTimeout)
      if (dag === undefined || dag == null) {
        throw new Error('Unknown dag...')
      }
      await this.checkParentPin(api, dag.cid, purge, ipfsPath)
    } catch (error) {
      console.log(`*** Unable to resolve dag...
 ${this.ipfsUtils.gateway}/ipfs/${dag.cid}
 ${error.message} ***`)
    }
  }

  async checkProduction (purge) {
    purge = purge !== undefined && purge !== null ? purge === 'true' || purge === true : false
    console.log(`*** ${purge ? 'Purge' : 'Check'} Production: ${this.ipfsUtils.apiUrl} ***`)
    var msgProduction = 'Current:'
    var msgProductionRaw = 'Current:'
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
      if (this.currentRaw !== undefined && this.currentRaw !== null) {
        this.productionRawCurrent = await this.checkProductionRaw(api, this.currentRaw, purge)
      }
      if (purge) {
        if (this.currentRaw !== undefined && this.currentRaw !== null) {
          if (this.productionRawCurrent !== null && this.currentRawCid.toString() !== this.productionRawCurrent.cid.toString()) {
            this.build.previousProductionRaw = `${this.ipfsUtils.publicGateway}/ipfs/${this.productionRaw}`
          }
        }
        this.build.productionRawChild = this.productionRawChild
        // Cleanup
        delete this.build.productionRaw
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
        // Check
        try {
          await this.checkParentPin(api, this.productionRaw.cid, purge)
        } catch (error) {
          console.log(`*** Unable to resolve production raw dag...
 ${this.ipfsUtils.gateway}/ipfs/${this.productionRaw.cid}
 ${error.message} ***`)
        }
        if (this.production !== undefined && this.production !== null) {
          try {
            await this.checkParentPin(api, this.production, purge)
          } catch (error) {
            console.log(`*** Unable to resolve production dag...
 ${this.ipfsUtils.gateway}/ipfs/${this.production.cid}
 ${error.message} ***`)
          }
        }
        // Save
        this.build.productionRaw = `${this.ipfsUtils.publicGateway}/ipfs/${this.productionRaw.cid}`
        fs.writeFileSync(`./current/build.json`, this.ipfsUtils.getJson(this.build), 'utf8')
        if (productionRaw == null) {
          msgProductionRaw = `New:`
        } else if (productionRaw.toString() !== this.productionRaw.cid.toString()) {
          msgProductionRaw = `Updated:`
        }
        if (production == null) {
          msgProduction = `New:`
        } else if (this.production == null || production.toString() !== this.production.toString()) {
          msgProduction = `Updated:`
        }
      }
    } catch (error) {
      console.log(error)
    }
    console.log(`*** ${purge ? 'Purged' : 'Checked'}: ${this.ipfsUtils.apiUrl}
 ${msgProduction} production: ${this.ipfsUtils.gateway}/ipfs/${this.production.cid ? this.production.cid : this.production}
 ${msgProductionRaw} production raw: ${this.ipfsUtils.gateway}/ipfs/${this.productionRaw.cid ? this.productionRaw.cid : this.productionRaw} ***`)
  }

  async publishProduction () {
    console.log(`*** Publish Production: ${this.ipfsUtils.apiUrl}
 production: ${this.ipfsUtils.gateway}/ipns/${this.ipfsUtils.IPNS_PRODUCTION}
 production raw: ${this.ipfsUtils.gateway}/ipns/${this.ipfsUtils.IPNS_PRODUCTION_RAW} ***`)
    const api = this.ipfsUtils.getApiClient()
    // load build
    const localBuildPath = './current/build.json'
    if (fs.existsSync(localBuildPath) === false) {
      throw new Error(`Unknown ${localBuildPath}`)
    }
    this.build = JSON.parse(fs.readFileSync(localBuildPath))
    // current raw and production build node
    if (this.build.productionRaw === undefined || this.build.productionRaw == null) {
      throw new Error('Unknown Production Raw')
    }
    const { ipfsCid: productionRawCid } = this.ipfsBundle.getIpfsIdentifier(this.build.productionRaw)
    if (this.build.production === undefined || this.build.production == null) {
      throw new Error('Unknown Production')
    }
    const { ipfsCid: productionCid } = this.ipfsBundle.getIpfsIdentifier(this.build.production)
    var previousProductionRawCid = null
    if (this.build.previousProductionRaw !== undefined && this.build.previousProductionRaw !== null) {
      var { ipfsCid: previousProductionRawCid } = this.ipfsBundle.getIpfsIdentifier(this.build.previousProductionRaw)
    }
    var previousProductionCid = null
    if (this.build.previousProduction !== undefined && this.build.previousProduction !== null) {
      var { ipfsCid: previousProductionCid } = this.ipfsBundle.getIpfsIdentifier(this.build.previousProduction)
    }
    // Remote raw build node
    if (previousProductionRawCid !== null && previousProductionRawCid.toString() !== this.emptyDirectoryCid.toString()) {
      console.log(`*** Unpin previous Production Raw:
 ${this.ipfsUtils.gateway}/ipfs/${previousProductionRawCid} ***`)
      await this.manageUnpin(api, previousProductionRawCid, true)
    }
    console.log(`*** Pin Production Raw:
 ${this.ipfsUtils.gateway}/ipfs/${productionRawCid} ***`)
    await this.managePin(api, productionRawCid, true)
    console.log(`*** Publish Production Raw:
 ${this.ipfsUtils.gateway}/ipfs/${productionRawCid} ***`)
    await this.ipfsBundle.namePublish(api, this.rawBuildKey, productionRawCid, {
      resolve: false,
      key: this.rawBuildKey,
      allowOffline: false,
      timeout: this.ipfsUtils.longTimeout,
    })
    if (previousProductionCid !== null && previousProductionCid.toString() !== this.emptyDirectoryCid.toString()) {
      console.log(`*** Unpin previous Production:
 ${this.ipfsUtils.gateway}/ipfs/${previousProductionCid} ***`)
      await this.manageUnpin(api, previousProductionCid, true)
    }
    console.log(`*** Pin Production:
 ${this.ipfsUtils.gateway}/ipfs/${productionCid} ***`)
    await this.managePin(api, productionCid, true)
    console.log(`*** Publish Production:
 ${this.ipfsUtils.gateway}/ipfs/${productionCid} ***`)
    await this.ipfsBundle.namePublish(api, this.buildKey, productionCid, {
      resolve: false,
      key: this.buildKey,
      allowOffline: false,
      timeout: this.ipfsUtils.longTimeout,
    })
  }
}
