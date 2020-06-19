/*\
title: $:/plugins/ipfs/ipfs-controller.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Controller

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  const EnsWrapper = require('$:/plugins/ipfs/ens-wrapper.js').EnsWrapper
  const IpfsBundle = require('$:/plugins/ipfs/ipfs-bundle.js').IpfsBundle
  const IpfsWrapper = require('$:/plugins/ipfs/ipfs-wrapper.js').IpfsWrapper

  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ipfs-controller'

  var IpfsController = function () {
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
    this.ensWrapper = new EnsWrapper(this.ipfsBundle)
    this.ipfsUrl = this.ipfsBundle.ipfsUrl
    this.ipfsWrapper = new IpfsWrapper(this.ipfsBundle)
    this.ipfsClients = new Map()
    this.pin = []
    this.unpin = []
  }

  IpfsController.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  IpfsController.prototype.isCid = function (cid) {
    return this.ipfsBundle.isCid(cid)
  }

  IpfsController.prototype.load3Box = async function () {
    return await this.ensWrapper.load3Box()
  }

  IpfsController.prototype.loadToBase64 = async function (url) {
    return await this.ipfsBundle.loadToBase64(url)
  }

  IpfsController.prototype.loadToUtf8 = async function (url) {
    return await this.ipfsBundle.loadToUtf8(url)
  }

  IpfsController.prototype.Base64ToUint8Array = function (b64) {
    return this.ipfsBundle.Base64ToUint8Array(b64)
  }

  IpfsController.prototype.Uint8ArrayToBase64 = function (ua) {
    return this.ipfsBundle.Uint8ArrayToBase64(ua)
  }

  IpfsController.prototype.StringToUint8Array = function (string) {
    return this.ipfsBundle.StringToUint8Array(string)
  }

  IpfsController.prototype.Utf8ArrayToStr = function (array) {
    return this.ipfsBundle.Utf8ArrayToStr(array)
  }

  IpfsController.prototype.requestToPin = function (cid, ipnsKey, value) {
    const self = this
    return new Promise((resolve, reject) => {
      if (ipnsKey !== undefined && ipnsKey !== null) {
        self
          .resolveUrl(true, true, value)
          .then(data => {
            const { cid, resolvedUrl } = data
            if (resolvedUrl !== null && cid !== null) {
              resolve(self.addToPin(cid, resolvedUrl))
            } else {
              resolve(false)
            }
          })
          .catch(error => {
            reject(error)
          })
      } else if (cid !== undefined && cid !== null) {
        const normalizedUrl = self.normalizeUrl(`/${ipfsKeyword}/${cid}`)
        resolve(self.addToPin(cid, normalizedUrl))
      } else {
        resolve(false)
      }
    })
  }

  IpfsController.prototype.addToPin = function (cid, normalizedUrl) {
    if (cid !== undefined && cid !== null) {
      var index = this.unpin.indexOf(cid)
      if (index !== -1) {
        this.unpin.splice(index, 1)
        this.getLogger().info(`Cancel request to Unpin:\n ${normalizedUrl}`)
        return false
      }
      if (this.pin.indexOf(cid) === -1) {
        this.pin.push(cid)
        this.getLogger().info(`Request to Pin:\n ${normalizedUrl}`)
        return true
      }
    }
    return false
  }

  IpfsController.prototype.requestToUnpin = function (cid, ipnsKey, value) {
    const self = this
    return new Promise((resolve, reject) => {
      if ($tw.utils.getIpfsUnpin() === false) {
        resolve(false)
      }
      if (ipnsKey !== undefined && ipnsKey !== null) {
        self
          .resolveUrl(true, true, value)
          .then(data => {
            const { cid, resolvedUrl } = data
            if (resolvedUrl !== null && cid !== null) {
              resolve(self.addToUnpin(cid, resolvedUrl))
            } else {
              resolve(false)
            }
          })
          .catch(error => {
            reject(error)
          })
      } else if (cid !== undefined && cid !== null) {
        const normalizedUrl = self.normalizeUrl(`/${ipfsKeyword}/${cid}`)
        resolve(self.addToUnpin(cid, normalizedUrl))
      } else {
        resolve(false)
      }
    })
  }

  IpfsController.prototype.addToUnpin = function (cid, normalizedUrl) {
    if (cid !== undefined && cid !== null) {
      // Discard
      var index = this.pin.indexOf(cid)
      if (index !== -1) {
        this.pin.splice(index, 1)
        this.getLogger().info(`Cancel request to Pin:\n ${normalizedUrl}`)
        return false
      }
      // Add to unpin
      if (this.unpin.indexOf(cid) === -1) {
        this.unpin.push(cid)
        this.getLogger().info(`Request to unpin:\n ${normalizedUrl}`)
        return true
      }
    }
    return false
  }

  IpfsController.prototype.removeFromPinUnpin = function (cid, normalizedUrl) {
    if (cid !== undefined && cid !== null) {
      var index = this.pin.indexOf(cid)
      if (index !== -1) {
        this.pin.splice(index, 1)
        this.getLogger().info(`Cancel request to Pin:\n ${normalizedUrl}`)
      }
      var index = this.unpin.indexOf(cid)
      if (index !== -1) {
        this.unpin.splice(index, 1)
        this.getLogger().info(`Cancel request to Unpin:\n ${normalizedUrl}`)
      }
    }
  }

  IpfsController.prototype.pinToIpfs = async function (cid) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.pinToIpfs(ipfs, cid)
  }

  IpfsController.prototype.unpinFromIpfs = async function (cid) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.unpinFromIpfs(ipfs, cid)
  }

  IpfsController.prototype.addToIpfs = async function (content) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.addToIpfs(ipfs, content)
  }

  IpfsController.prototype.generateIpnsKey = async function (ipnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName)
  }

  IpfsController.prototype.removeIpnsKey = async function (ipnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsName)
  }

  IpfsController.prototype.renameIpnsName = async function (
    oldIpnsName,
    newIpnsName
  ) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.renameIpnsName(ipfs, oldIpnsName, newIpnsName)
  }

  IpfsController.prototype.decodeCid = function (pathname) {
    return this.ipfsBundle.decodeCid(pathname)
  }

  IpfsController.prototype.getIpnsIdentifiers = async function (
    identifier,
    ipnsName
  ) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.getIpnsIdentifiers(ipfs, identifier, ipnsName)
  }

  IpfsController.prototype.resolveIpnsKey = async function (ipnsKey) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey)
  }

  IpfsController.prototype.publishIpnsName = async function (
    cid,
    ipnsKey,
    ipnsName
  ) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.publishIpnsName(cid, ipfs, ipnsKey, ipnsName)
  }

  IpfsController.prototype.getIpfsBaseUrl = function () {
    return this.ipfsUrl.getIpfsBaseUrl()
  }

  IpfsController.prototype.normalizeUrl = function (value, base) {
    return this.ipfsUrl.normalizeUrl(value, base)
  }

  IpfsController.prototype.getDocumentUrl = function () {
    return this.ipfsUrl.getDocumentUrl()
  }

  IpfsController.prototype.getIpfsDefaultApi = function () {
    return this.ipfsUrl.getIpfsDefaultApi()
  }

  IpfsController.prototype.getIpfsDefaultGateway = function () {
    return this.ipfsUrl.getIpfsDefaultGateway()
  }

  IpfsController.prototype.getIpfsApiUrl = function () {
    return this.ipfsUrl.getIpfsApiUrl()
  }

  IpfsController.prototype.getIpfsGatewayUrl = function () {
    return this.ipfsUrl.getIpfsGatewayUrl()
  }

  IpfsController.prototype.resolveUrl = async function (
    resolveIpns,
    resolveEns,
    value,
    base
  ) {
    var cid = null
    var ipnsKey = null
    var ipnsName = null
    var normalizedUrl = null
    var resolvedUrl = null
    value =
      value === undefined || value == null || value.toString().trim() === ''
        ? null
        : value.toString().trim()
    if (value == null) {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
        resolvedUrl: null
      }
    }
    try {
      normalizedUrl = this.normalizeUrl(value, base)
    } catch (error) {
      // Ignore
    }
    if (normalizedUrl == null) {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
        resolvedUrl: null
      }
    }
    var { cid, ipnsIdentifier, protocol } = this.decodeCid(
      normalizedUrl.pathname
    )
    if (
      protocol !== null &&
      protocol === ipnsKeyword &&
      ipnsIdentifier !== null
    ) {
      var { ipnsKey, ipnsName, normalizedUrl } = await this.getIpnsIdentifiers(
        ipnsIdentifier
      )
      if (resolveIpns) {
        this.getLogger().info(`Resolving IPNS key:\n ${normalizedUrl}`)
        $tw.utils.alert(name, 'Resolving an IPNS key...')
        try {
          cid = await this.resolveIpnsKey(ipnsKey)
          if (cid !== null) {
            resolvedUrl = this.normalizeUrl(`/${ipfsKeyword}/${cid}`, base)
            this.getLogger().info(
              `Successfully resolved IPNS key:\n ${normalizedUrl}`
            )
            $tw.utils.alert(name, 'Successfully resolved an IPNS key...')
          }
        } catch (error) {
          // Unable to resolve the key
          // It usually happen when the key is not initialized
          cid = null
          this.getLogger().error(error)
          $tw.utils.alert(name, error.message)
        }
      }
    } else if (resolveEns && normalizedUrl.hostname.endsWith('.eth')) {
      var { content: cid, resolvedUrl } = await this.resolveEns(
        normalizedUrl.hostname
      )
    } else {
      resolvedUrl = normalizedUrl
    }
    return {
      cid: cid,
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl,
      resolvedUrl: resolvedUrl
    }
  }

  IpfsController.prototype.getUrl = function (url, base) {
    return this.ipfsUrl.getUrl(
      url,
      base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
    )
  }

  IpfsController.prototype.isJson = function (content) {
    return this.ipfsBundle.isJson(content)
  }

  IpfsController.prototype.getIpfsClient = async function () {
    // Provider
    const ipfsProvider = $tw.utils.getIpfsProvider()
    // IPFS companion
    if (ipfsProvider === 'window') {
      const client = await this.ipfsWrapper.getWindowIpfsClient()
      return {
        ipfs: client.ipfs,
        provider: client.provider
      }
    }
    // Default, try IPFS companion
    if (ipfsProvider === 'default') {
      try {
        const client = await this.ipfsWrapper.getWindowIpfsClient()
        return {
          ipfs: client.ipfs,
          provider: client.provider
        }
      } catch (error) {
        // Ignore, fallback to HTTP
      }
    }
    // Current API URL
    const url = this.getIpfsApiUrl()
    // Check
    if (url === undefined || url == null || url.toString().trim() === '') {
      throw new Error('Undefined IPFS API URL...')
    }
    // HTTP Client
    const client = this.ipfsClients.get(url.toString())
    if (client !== undefined) {
      // Log
      this.getLogger().info(`Reuse IPFS provider: "${client.provider}"`)
      // Done
      return {
        ipfs: client.ipfs,
        provider: client.provider
      }
    }
    // Build a new HTTP client
    const policy = await this.ipfsWrapper.getHttpIpfsClient(url)
    const ipfs = policy.ipfs
    const provider = policy.provider
    // Store
    this.ipfsClients.set(url.toString(), { ipfs, provider })
    // Log
    this.getLogger().info(`New IPFS provider: "${policy.provider}"`)
    // Done
    return {
      ipfs: ipfs,
      provider: provider
    }
  }

  IpfsController.prototype.resolveEns = async function (ensDomain) {
    const { web3 } = await this.getWeb3Provider()
    const { content, protocol } = await this.ensWrapper.getContentHash(
      ensDomain,
      web3
    )
    if (content !== null && protocol !== null) {
      const url = this.normalizeUrl(`/${protocol}/${content}`)
      this.getLogger().info(
        `Successfully fetched ENS domain content: "${ensDomain}"\n ${url}`
      )
      return {
        content: content,
        protocol: protocol,
        resolvedUrl: url
      }
    }
    return {
      content: null,
      protocol: null,
      resolvedUrl: null
    }
  }

  IpfsController.prototype.setEns = async function (ensDomain, cid) {
    const { web3, account } = await this.getEnabledWeb3Provider()
    const { cidV0 } = await this.ensWrapper.setContentHash(
      ensDomain,
      cid,
      web3,
      account
    )
    if (cidV0 !== null) {
      const url = this.normalizeUrl(`/ipfs/${cidV0}`)
      this.getLogger().info(
        `Successfully set ENS domain content:\n ${url} \n to: "${ensDomain}"`
      )
      return true
    }
    return false
  }

  IpfsController.prototype.getEthereumProvider = function () {
    return this.ensWrapper.getEthereumProvider()
  }

  IpfsController.prototype.getEnabledWeb3Provider = async function () {
    return await this.ensWrapper.getEnabledWeb3Provider()
  }

  IpfsController.prototype.getWeb3Provider = async function () {
    return await this.ensWrapper.getWeb3Provider()
  }

  IpfsController.prototype.getChainId = function () {
    return this.ensWrapper.getChainId()
  }

  exports.IpfsController = IpfsController
})()
