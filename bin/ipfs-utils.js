#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const { create: IpfsHttpClient } = require('ipfs-http-client')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fs = require('fs')

const IpfsBundle = require('core/modules/library/ipfs-bundle.js').IpfsBundle

module.exports = class IpfsUtils {
  shortTimeout = 4000
  longTimeout = 4 * 60 * this.shortTimeout
  // bluelight.link
  DEFAULT_IPNS_PRODUCTION_RAW = 'k51qzi5uqu5dh9giahc358e235iqoncw9lpyc6vrn1aqguruj2nncupmbv9355'
  DEFAULT_IPNS_PRODUCTION = 'k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl'

  constructor () {
    this.dotEnv = dotenv.config()
    if (this.dotEnv.error) {
      throw this.dotEnv.error
    }
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
    this.IPNS_PRODUCTION_RAW = process.env.IPNS_PRODUCTION_RAW ? process.env.IPNS_PRODUCTION_RAW : this.DEFAULT_IPNS_PRODUCTION_RAW
    this.IPNS_PRODUCTION = process.env.IPNS_PRODUCTION ? process.env.IPNS_PRODUCTION : this.DEFAULT_IPNS_PRODUCTION
    this.apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
    this.protocol = this.apiUrl.protocol.slice(0, -1)
    this.port = this.apiUrl.port
    if (this.port === undefined || this.port == null || this.port.trim() === '') {
      this.port = 443
      if (this.protocol === 'http') {
        this.port = 80
      }
    }
    this.gateway = process.env.IPFS_GATEWAY ? process.env.IPFS_GATEWAY : 'https://dweb.link'
    this.publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? process.env.IPFS_PUBLIC_GATEWAY : null
    if (this.publicGateway == null) {
      this.publicGateway = this.gateway
    }
  }

  async loadBuild (api) {
    // load build
    const localBuildPath = './current/build.json'
    if (fs.existsSync(localBuildPath) === false) {
      throw new Error(`Unknown ${localBuildPath}`)
    }
    const build = JSON.parse(fs.readFileSync(localBuildPath))
    // production raw
    var productionRaw = null
    console.log(` ipns production raw: ${this.gateway}/ipns/${this.IPNS_PRODUCTION_RAW}`)
    if (build.productionRaw === undefined || build.productionRaw == null) {
      try {
        var { cid: productionRaw } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.IPNS_PRODUCTION_RAW}`, this.shortTimeout)
      } catch (error) {
        // Ignore
      }
      if (productionRaw !== undefined && productionRaw !== null) {
        console.log(` remote production raw: ${this.gateway}/ipfs/${productionRaw}`)
      }
    } else {
      var { ipfsCid: productionRaw } = this.ipfsBundle.getIpfsIdentifier(build.productionRaw)
      if (productionRaw !== undefined && productionRaw !== null) {
        console.log(` local production raw: ${this.gateway}/ipfs/${productionRaw}`)
      }
    }
    var currentRaw = null
    var currentRawCid = null
    var currentRawSize = null
    const data = await this.getRemoteCurrent(api, productionRaw)
    if (data !== undefined && data !== null) {
      var { cid, dag, size } = data
      currentRaw = dag
      currentRawCid = cid.toString()
      currentRawSize = size
    }
    // production
    var production = null
    console.log(` ipns production: ${this.gateway}/ipns/${this.IPNS_PRODUCTION}`)
    if (build.production === undefined || build.production == null) {
      try {
        var { cid: production } = await this.ipfsBundle.dagResolve(api, `/ipns/${this.IPNS_PRODUCTION}`, this.shortTimeout)
      } catch (error) {
        // Ignore
      }
      if (production !== undefined && production !== null) {
        console.log(` remote production: ${this.gateway}/ipfs/${production}`)
      }
    } else {
      var { ipfsCid: production } = this.ipfsBundle.getIpfsIdentifier(build.production)
      if (production !== undefined && production !== null) {
        console.log(` local production: ${this.gateway}/ipfs/${production}`)
      }
    }
    return {
      build: build,
      production: production,
      productionRaw: productionRaw,
      currentRaw: currentRaw,
      currentRawCid: currentRawCid,
      currentRawSize: currentRawSize,
    }
  }

  getApiClient (timeout, url) {
    var headers = {}
    timeout = timeout !== undefined && timeout !== null ? timeout : this.shortTimeout
    url = url !== undefined && url !== null && url.toString().trim() !== '' ? url : this.apiUrl
    var protocol = url.protocol.slice(0, -1)
    var port = url.port
    if (port === undefined || port == null || port.trim() === '') {
      port = 443
      if (protocol === 'http') {
        port = 80
      }
    }
    if (process && process.env.INFURA_PROJECT_ID && process.env.INFURA_PROJECT_SECRET && process.env.INFURA_ENDPOINT) {
      if (url.toString().startsWith(process.env.INFURA_ENDPOINT)) {
        var basic = `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`
        basic = Buffer.from(basic).toString('base64')
        headers = {
          Authorization: `Basic ${basic}`,
        }
      }
    }
    const api = new IpfsHttpClient({
      headers: headers,
      protocol: this.protocol,
      host: this.apiUrl.hostname,
      port: this.port,
      timeout: timeout,
    })
    return api
  }

  async getRemoteCurrent (api, cid) {
    var dag = null
    try {
      dag = await this.ipfsBundle.dagGet(api, cid, {
        localResolve: false,
        timeout: this.shortTimeout,
      })
    } catch (error) {
      return null
    }
    if (dag !== null) {
      const links = dag.value.Links
      for (var i = 0; i < links.length; i++) {
        if (links[i].Name === 'current') {
          try {
            const cidV1 = this.ipfsBundle.cidToCidV1(links[i].Hash)
            const dag = await this.ipfsBundle.dagGet(api, cidV1, {
              localResolve: false,
              timeout: this.shortTimeout,
            })
            const stat = await this.ipfsBundle.objectStat(api, cidV1, this.shortTimeout)
            return {
              cid: cidV1,
              dag: dag,
              size: stat.CumulativeSize,
            }
          } catch (error) {
            console.log(error)
          }
          break
        }
      }
    }
    return null
  }

  // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
  getJson (content) {
    const sorted = Object.entries(content)
      .sort((a, b) => a[1] - b[1])
      .reduce(
        (_sortedObj, [k, v]) => ({
          ..._sortedObj,
          [k]: v,
        }),
        {}
      )
    return beautify(sorted, null, 2, 80)
  }

  async addContent (api, ipfsPath, content) {
    const added = await api.add(
      {
        path: ipfsPath,
        content: this.getJson(content),
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
    return added
  }

  async dagPut (api, links, timeout) {
    const dagNode = {
      Data: this.ipfsBundle.StringToUint8Array('\u0008\u0001'),
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

  async fetchOptions (url, timeout) {
    url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
    if (url == null) {
      throw new Error('Undefined URL...')
    }
    timeout = timeout !== undefined && timeout !== null ? timeout : $tw.utils.getLongTimeout()
    var options = null
    const optionsController = new AbortController()
    const optionsId = globalThis.setTimeout(() => optionsController.abort(), timeout)
    try {
      const params = {
        method: 'options',
        signal: optionsController.signal,
      }
      options = await fetch(url, params)
      if (options.ok === false) {
        throw new Error(`Unexpected response: [${options.status}], [${options.statusText}], ${url}`)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`*** Options Timeout: ${url} ***`)
      } else {
        console.error(`*** Options Error: ${error.message} ***`)
      }
    } finally {
      globalThis.clearTimeout(optionsId)
    }
    return options
  }

  async loadFromIpfs (url, timeout) {
    if (url instanceof URL === false) {
      url = new URL(url)
    }
    timeout = timeout !== undefined && timeout !== null ? timeout : this.longTimeout
    const options = await this.fetchOptions(url, timeout)
    try {
      const responseController = new AbortController()
      const responseId = setTimeout(() => responseController.abort(), timeout)
      var newUrl = url
      if (options !== null && options.ok) {
        if (options.url !== undefined && options.url !== null) {
          newUrl = new URL(options.url)
        }
        var location = options.headers.get('Location')
        if (newUrl !== null && location !== undefined && location !== null) {
          newUrl = new URL(location)
        }
      }
      // https://fetch.spec.whatwg.org/#cors-safelisted-method
      // https://fetch.spec.whatwg.org/#cors-safelisted-request-header
      var params = {
        method: 'get',
        mode: 'cors',
        signal: responseController.signal,
      }
      var response = await fetch(url, params)
      globalThis.clearTimeout(responseId)
      if (response.ok === false) {
        throw new Error(`Unexpected response: [${response.status}], [${response.statusText}], ${url}`)
      }
      const buffer = await response.buffer()
      var type = response.headers.get('Content-Type')
      if (type) {
        const types = type.split(';')
        if (types.length > 0) {
          type = types[0].trim()
        }
      }
      return {
        content: buffer,
        status: response.status,
        type: type,
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`*** Fetch Timeout: ${url} ***`)
      } else {
        console.error(`*** Fetch Error: ${error.message} ***`)
      }
    }
    return null
  }
}
