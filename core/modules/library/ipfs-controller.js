/*\
title: $:/plugins/ipfs/ipfs-controller.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Controller

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const EnsAction = require('$:/plugins/ipfs/ens-action.js').EnsAction
  const EnsWrapper = require('$:/plugins/ipfs/ens-wrapper.js').EnsWrapper

  const IpfsAction = require('$:/plugins/ipfs/ipfs-action.js').IpfsAction
  const IpfsBundle = require('$:/plugins/ipfs/ipfs-bundle.js').IpfsBundle
  const IpfsTiddler = require('$:/plugins/ipfs/ipfs-tiddler.js').IpfsTiddler
  const IpfsWrapper = require('$:/plugins/ipfs/ipfs-wrapper.js').IpfsWrapper

  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ipfs-controller'

  var IpfsController = function () {
    this.ipfsClients = new Map()
    this.pin = []
    this.unpin = []
  }

  IpfsController.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
    this.ensWrapper = new EnsWrapper(this.ipfsBundle.ensLibrary)
    this.ipfsWrapper = new IpfsWrapper(this.ipfsBundle)
    // Listener
    this.ensAction = new EnsAction()
    this.ipfsAction = new IpfsAction()
    this.ipfsTiddler = new IpfsTiddler()
    // Init
    this.ensAction.init()
    this.ipfsAction.init()
    this.ipfsTiddler.init()
    // Load sigUtil early if needed
    if ($tw.crypto.hasEncryptionPublicKey()) {
      this.loadEthSigUtilLibrary()
    }
    // Init once
    this.once = true
  }

  IpfsController.prototype.getLogger = function () {
    if (window.log !== undefined && window.log !== null) {
      const loggers = window.log.getLoggers()
      var log = loggers.eruda
      if (log !== undefined && log !== null) {
        return log
      }
      log = loggers.default
      if (log !== undefined && log !== null) {
        return log
      }
    }
    return console
  }

  IpfsController.prototype.loadToBase64 = async function (url, password) {
    return await this.ipfsBundle.loadToBase64(url, password)
  }

  IpfsController.prototype.loadToUtf8 = async function (url, password) {
    return await this.ipfsBundle.loadToUtf8(url, password)
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

  IpfsController.prototype.processContent = async function (tiddler, content, encoding) {
    if (content === undefined || content == null || content.trim() === '') {
      throw new Error('Unknown content...')
    }
    if (encoding === undefined || encoding == null || encoding.trim() === '') {
      throw new Error('Unknown encoding...')
    }
    var compress = $tw.wiki.getTiddler('$:/isCompressed')
    compress = compress !== undefined ? compress.fields.text === 'yes' : false
    compress = tiddler !== undefined && tiddler.fields._compress !== undefined && tiddler.fields._compress.trim() !== '' ? tiddler.fields._compress.trim() === 'yes' : compress
    var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
    encrypted = encrypted !== undefined ? encrypted.fields.text === 'yes' : false
    var password = tiddler !== undefined && tiddler.fields._password !== undefined && tiddler.fields._password.trim() !== '' ? tiddler.fields._password.trim() : null
    var publicKey =
      tiddler !== undefined && tiddler.fields._encryption_public_key !== undefined && tiddler.fields._encryption_public_key.trim() !== ''
        ? tiddler.fields._encryption_public_key.trim()
        : null
    var sign = $tw.wiki.getTiddler('$:/isSigned')
    sign = sign !== undefined ? sign.fields.text === 'yes' : false
    sign = tiddler !== undefined && tiddler.fields._sign !== undefined && tiddler.fields._sign.trim() !== '' ? tiddler.fields._sign.trim() === 'yes' : sign
    var hasPublicKey = publicKey || $tw.crypto.hasEncryptionPublicKey()
    if (encrypted || password || hasPublicKey) {
      try {
        if (hasPublicKey) {
          await this.loadEthSigUtilLibrary()
        }
        if (compress) {
          content = { compressed: this.deflate(content) }
          content.compressed = $tw.crypto.encrypt(content.compressed, password, publicKey)
          if (hasPublicKey && sign) {
            content.keccak256 = $tw.crypto.keccak256(content.compressed)
            content.signature = await this.personalSign(content.keccak256)
            content.signature = $tw.crypto.encrypt(content.signature, null, publicKey)
          }
          content = JSON.stringify(content)
          encoding = 'text'
        } else {
          // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/9
          if (encoding === 'base64') {
            content = atob(content)
          }
          if (hasPublicKey) {
            content = { encrypted: content }
            content.encrypted = $tw.crypto.encrypt(content.encrypted, null, publicKey)
            if (sign) {
              content.keccak256 = $tw.crypto.keccak256(content.encrypted)
              content.signature = await this.personalSign(content.keccak256)
              content.signature = $tw.crypto.encrypt(content.signature, null, publicKey)
            }
            content = JSON.stringify(content)
            encoding = 'text'
          } else {
            content = $tw.crypto.encrypt(content, password)
            encoding = 'text'
          }
        }
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, 'Failed to process encrypted content...')
        return null
      }
    } else {
      try {
        if (compress) {
          content = { compressed: this.deflate(content) }
          content = JSON.stringify(content)
          encoding = 'text'
        }
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, 'Failed to process content...')
        return null
      }
    }
    return {
      content: content,
      encoding: encoding,
    }
  }

  IpfsController.prototype.requestToPin = function (ipfsPath) {
    const self = this
    return new Promise((resolve, reject) => {
      if ($tw.utils.getIpfsPin() === false) {
        resolve(false)
      }
      ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? ipfsPath.toString().trim() : null
      if (ipfsPath == null) {
        resolve(false)
      }
      if (ipfsPath.indexOf(`/${ipnsKeyword}/`) !== -1) {
        self
          .resolveUrl(true, true, ipfsPath)
          .then(data => {
            const { cid } = data
            if (cid !== null) {
              resolve(self.addToPin(`/${ipfsKeyword}/${cid}`))
            } else {
              resolve(false)
            }
          })
          .catch(error => {
            reject(error)
          })
      } else {
        resolve(self.addToPin(ipfsPath))
      }
    })
  }

  IpfsController.prototype.addToPin = function (ipfsPath) {
    if (ipfsPath !== undefined && ipfsPath !== null) {
      var index = this.unpin.indexOf(ipfsPath)
      if (index !== -1) {
        this.unpin.splice(index, 1)
        $tw.ipfs.getLogger().info(
          `Cancel request to Unpin:
${ipfsPath}`
        )
        return false
      }
      if (this.pin.indexOf(ipfsPath) === -1) {
        this.pin.push(ipfsPath)
        $tw.ipfs.getLogger().info(
          `Request to Pin:
${ipfsPath}`
        )
        return true
      }
    }
    return false
  }

  IpfsController.prototype.requestToUnpin = function (ipfsPath) {
    const self = this
    return new Promise((resolve, reject) => {
      if ($tw.utils.getIpfsUnpin() === false) {
        resolve(false)
      }
      ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? ipfsPath.toString().trim() : null
      if (ipfsPath == null) {
        resolve(false)
      }
      if (ipfsPath.indexOf(`/${ipnsKeyword}/`) !== -1) {
        self
          .resolveUrl(true, true, ipfsPath)
          .then(data => {
            const { cid } = data
            if (cid !== null) {
              resolve(self.addToUnpin(`/${ipfsKeyword}/${cid}`))
            } else {
              resolve(false)
            }
          })
          .catch(error => {
            reject(error)
          })
      } else {
        resolve(self.addToUnpin(ipfsPath))
      }
    })
  }

  IpfsController.prototype.addToUnpin = function (ipfsPath) {
    if (ipfsPath !== undefined && ipfsPath !== null) {
      // Discard
      var index = this.pin.indexOf(ipfsPath)
      if (index !== -1) {
        this.pin.splice(index, 1)
        $tw.ipfs.getLogger().info(
          `Cancel request to Pin:
${ipfsPath}`
        )
        return false
      }
      // Add to unpin
      if (this.unpin.indexOf(ipfsPath) === -1) {
        this.unpin.push(ipfsPath)
        $tw.ipfs.getLogger().info(
          `Request to unpin:
${ipfsPath}`
        )
        return true
      }
    }
    return false
  }

  IpfsController.prototype.removeFromPinUnpin = function (ipfsPath) {
    if (ipfsPath !== undefined && ipfsPath !== null) {
      var index = this.pin.indexOf(ipfsPath)
      if (index !== -1) {
        this.pin.splice(index, 1)
        $tw.ipfs.getLogger().info(
          `Cancel request to Pin:
 ${ipfsPath}`
        )
      }
      index = this.unpin.indexOf(ipfsPath)
      if (index !== -1) {
        this.unpin.splice(index, 1)
        $tw.ipfs.getLogger().info(
          `Cancel request to Unpin:
 ${ipfsPath}`
        )
      }
    }
  }

  IpfsController.prototype.pinToIpfs = async function (ipfsPath, recursive) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.pinToIpfs(ipfs, ipfsPath, recursive)
  }

  IpfsController.prototype.unpinFromIpfs = async function (ipfsPath, recursive) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.unpinFromIpfs(ipfs, ipfsPath, recursive)
  }

  IpfsController.prototype.addAttachmentToIpfs = async function (content, encoding, ipfsPath) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.addAttachmentToIpfs(ipfs, content, encoding, ipfsPath)
  }

  IpfsController.prototype.addToIpfs = async function (content, encoding) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.addToIpfs(ipfs, content, encoding)
  }

  IpfsController.prototype.generateIpnsKey = async function (ipnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName)
  }

  IpfsController.prototype.removeIpnsKey = async function (ipnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsName)
  }

  IpfsController.prototype.renameIpnsName = async function (oldIpnsName, newIpnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.renameIpnsName(ipfs, oldIpnsName, newIpnsName)
  }

  IpfsController.prototype.resolveIpfsContainer = async function (url) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.resolveIpfsContainer(ipfs, url)
  }

  IpfsController.prototype.getIpnsIdentifier = async function (identifier, base, path, ipnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.getIpnsIdentifier(ipfs, identifier, base, path, ipnsName)
  }

  IpfsController.prototype.resolveIpnsKey = async function (ipnsKey) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey)
  }

  IpfsController.prototype.publishIpnsName = async function (cid, ipnsKey, ipnsName) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.publishIpnsName(cid, ipfs, ipnsKey, ipnsName)
  }

  IpfsController.prototype.isJson = function (content) {
    return this.ipfsBundle.isJson(content)
  }

  IpfsController.prototype.filenamify = function (name, options) {
    return this.ipfsBundle.filenamify(name, options)
  }

  IpfsController.prototype.getIpfsBaseUrl = function () {
    return this.ipfsBundle.getIpfsBaseUrl()
  }

  IpfsController.prototype.normalizeUrl = function (value, base) {
    return this.ipfsBundle.normalizeUrl(value, base)
  }

  IpfsController.prototype.getDocumentUrl = function () {
    return this.ipfsBundle.getDocumentUrl()
  }

  IpfsController.prototype.getIpfsDefaultApi = function () {
    return this.ipfsBundle.getIpfsDefaultApi()
  }

  IpfsController.prototype.getIpfsDefaultGateway = function () {
    return this.ipfsBundle.getIpfsDefaultGateway()
  }

  IpfsController.prototype.getIpfsApiUrl = function () {
    return this.ipfsBundle.getIpfsApiUrl()
  }

  IpfsController.prototype.getIpfsGatewayUrl = function () {
    return this.ipfsBundle.getIpfsGatewayUrl()
  }

  IpfsController.prototype.getUrl = function (url, base) {
    return this.ipfsBundle.getUrl(url, base)
  }

  IpfsController.prototype.resolveUrl = async function (resolveIpns, resolveEns, value, base, web3) {
    var cid = null
    var ipnsKey = null
    var ipnsName = null
    var normalizedUrl = null
    var resolvedUrl = null
    value = value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : null
    if (value == null) {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
        resolvedUrl: null,
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
        resolvedUrl: null,
      }
    }
    var { cid, ipnsIdentifier, path } = this.getIpfsIdentifier(normalizedUrl)
    if (ipnsIdentifier !== null) {
      var { cid, ipnsKey, ipnsName, normalizedUrl, resolvedUrl } = await this.resolveIpns(ipnsIdentifier, resolveIpns, base, path)
    } else if (cid == null && ipnsIdentifier == null && resolveEns && normalizedUrl.hostname.endsWith('.eth')) {
      var { cid, protocol, resolvedUrl } = await this.resolveEns(normalizedUrl.hostname, base, path, web3)
      if (protocol === ipnsKeyword) {
        var { cid, ipnsKey, ipnsName, resolvedUrl } = await this.resolveIpns(cid, resolveIpns, base, path)
      }
    }
    return {
      cid: cid,
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl,
      resolvedUrl: resolvedUrl !== null ? resolvedUrl : normalizedUrl,
    }
  }

  IpfsController.prototype.resolveIpns = async function (ipnsIdentifier, resolveIpns, base, path) {
    ipnsIdentifier = ipnsIdentifier !== undefined && ipnsIdentifier !== null && ipnsIdentifier.toString().trim() !== '' ? ipnsIdentifier.toString().trim() : null
    path = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : ''
    if (ipnsIdentifier == null) {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
        resolvedUrl: null,
      }
    }
    var cid = null
    var resolvedUrl = null
    var { ipnsKey, ipnsName, normalizedUrl } = await this.getIpnsIdentifier(ipnsIdentifier, base, path)
    if (resolveIpns) {
      $tw.ipfs.getLogger().info(
        `Resolving IPNS key:
${normalizedUrl}`
      )
      $tw.utils.alert(name, 'Resolving an IPNS key...')
      try {
        cid = await this.resolveIpnsKey(ipnsKey)
        if (cid !== null) {
          // Path
          const startPath = `/${ipnsKeyword}/${ipnsKey}`
          if (path.startsWith(startPath)) {
            path = path.slice(startPath.length)
          }
          path = `${startPath}${path}`
          resolvedUrl = this.normalizeUrl(path, base)
          $tw.ipfs.getLogger().info(
            `Successfully resolved IPNS key:
${resolvedUrl}`
          )
          $tw.utils.alert(name, 'Successfully resolved an IPNS key...')
        }
      } catch (error) {
        // Unable to resolve the key
        // It usually happen when the key is not initialized
        cid = null
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    }
    return {
      cid: cid,
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl,
      resolvedUrl: resolvedUrl,
    }
  }

  IpfsController.prototype.resolveEns = async function (ensDomain, base, path, web3) {
    ensDomain = ensDomain !== undefined && ensDomain !== null && ensDomain.toString().trim() !== '' ? ensDomain.toString().trim() : null
    if (ensDomain == null) {
      return {
        cid: null,
        protocol: null,
        resolvedUrl: null,
      }
    }
    path = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : ''
    if (web3 === undefined || web3 == null) {
      var { web3 } = await this.getWeb3Provider()
    }
    const { content, protocol } = await this.ensWrapper.getContentHash(ensDomain, web3)
    if (content == null || protocol == null) {
      return {
        cid: null,
        protocol: null,
        resolvedUrl: null,
      }
    }
    const url = this.normalizeUrl(`/${protocol}/${content}${path}`, base)
    $tw.ipfs.getLogger().info(
      `Successfully fetched ENS domain content: "${ensDomain}"
${url}`
    )
    return {
      cid: content,
      protocol: protocol,
      resolvedUrl: url,
    }
  }

  IpfsController.prototype.getIpfsClient = async function () {
    // Provider
    const ipfsProvider = $tw.utils.getIpfsProvider()
    // IPFS companion
    if (ipfsProvider === 'window') {
      const client = await this.ipfsWrapper.getWindowIpfsClient()
      return {
        ipfs: client.ipfs,
        provider: client.provider,
      }
    }
    // Default, try IPFS companion
    if (ipfsProvider === 'default') {
      try {
        const client = await this.ipfsWrapper.getWindowIpfsClient()
        return {
          ipfs: client.ipfs,
          provider: client.provider,
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
      $tw.ipfs.getLogger().info(`Reuse IPFS provider: "${client.provider}"`)
      // Done
      return {
        ipfs: client.ipfs,
        provider: client.provider,
      }
    }
    // Build a new HTTP client
    const policy = await this.ipfsWrapper.getHttpIpfsClient(url)
    const ipfs = policy.ipfs
    const provider = policy.provider
    // Store
    this.ipfsClients.set(url.toString(), { ipfs, provider })
    // Log
    $tw.ipfs.getLogger().info(`New IPFS provider: "${policy.provider}"`)
    // Done
    return {
      ipfs: ipfs,
      provider: provider,
    }
  }

  IpfsController.prototype.setContentHash = async function (ensDomain, identifier, web3, account) {
    if (account === undefined || account == null || web3 === undefined || web3 == null) {
      var { account, web3 } = await this.getEnabledWeb3Provider()
    }
    await this.ensWrapper.setContentHash(ensDomain, identifier, web3, account)
    const url = this.normalizeUrl(identifier)
    $tw.ipfs.getLogger().info(
      `Successfully set ENS domain content:
 ${url}
 to: "${ensDomain}"`
    )
    return true
  }

  IpfsController.prototype.getIpfsIdentifier = function (value) {
    return this.ipfsBundle.getIpfsIdentifier(value)
  }

  IpfsController.prototype.getCid = function (cid) {
    return this.ipfsBundle.getCid(cid)
  }

  IpfsController.prototype.cidToBase58CidV0 = function (cid, log) {
    return this.ipfsBundle.cidToBase58CidV0(cid, log)
  }

  IpfsController.prototype.cidToCidV1 = function (cid, protocol, log) {
    return this.ipfsBundle.cidToCidV1(cid, protocol, log)
  }

  IpfsController.prototype.cidToLibp2pKeyCidV1 = function (cid, multibaseName, log) {
    return this.ipfsBundle.cidToLibp2pKeyCidV1(cid, multibaseName, log)
  }

  IpfsController.prototype.isOwner = async function (domain, web3, account) {
    return await this.ipfsBundle.isOwner(domain, web3, account)
  }

  IpfsController.prototype.personalRecover = async function (message, signature) {
    return await this.ipfsBundle.personalRecover(message, signature)
  }

  IpfsController.prototype.personalSign = async function (message, provider) {
    return await this.ipfsBundle.personalSign(message, provider)
  }

  IpfsController.prototype.decrypt = async function (text, provider) {
    return await this.ipfsBundle.decrypt(text, provider)
  }

  IpfsController.prototype.getPublicEncryptionKey = async function (provider) {
    return await this.ipfsBundle.getPublicEncryptionKey(provider)
  }

  IpfsController.prototype.getEthereumProvider = async function () {
    return await this.ipfsBundle.getEthereumProvider()
  }

  IpfsController.prototype.getEnabledWeb3Provider = async function () {
    return await this.ipfsBundle.getEnabledWeb3Provider()
  }

  IpfsController.prototype.getWeb3Provider = async function () {
    return await this.ipfsBundle.getWeb3Provider()
  }

  IpfsController.prototype.getBlockExplorerRegistry = function () {
    return this.ipfsBundle.getBlockExplorerRegistry()
  }

  IpfsController.prototype.getNetworkRegistry = function () {
    return this.ipfsBundle.getNetworkRegistry()
  }

  IpfsController.prototype.getENSRegistry = function () {
    return this.ipfsBundle.getENSRegistry()
  }

  IpfsController.prototype.loadErudaLibrary = async function () {
    return await this.ipfsBundle.loadErudaLibrary()
  }

  IpfsController.prototype.loadEthSigUtilLibrary = async function () {
    return await this.ipfsBundle.loadEthSigUtilLibrary()
  }

  IpfsController.prototype.deflate = function (str) {
    return this.ipfsBundle.deflate(str)
  }

  IpfsController.prototype.inflate = function (b64) {
    return this.ipfsBundle.inflate(b64)
  }

  exports.IpfsController = IpfsController
})()
