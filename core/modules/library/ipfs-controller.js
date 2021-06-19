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

  const { EnsAction } = require('$:/plugins/ipfs/ens-action.js')
  const { EnsWrapper } = require('$:/plugins/ipfs/ens-wrapper.js')

  const { IpfsAction } = require('$:/plugins/ipfs/ipfs-action.js')
  const { IpfsBundle } = require('$:/plugins/ipfs/ipfs-bundle.js')
  const { IpfsTiddler } = require('$:/plugins/ipfs/ipfs-tiddler.js')
  const { IpfsWrapper } = require('$:/plugins/ipfs/ipfs-wrapper.js')

  /*eslint no-unused-vars:"off"*/
  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const shortTimeout = 4000
  /*eslint no-unused-vars:"off"*/
  const longTimeout = 4 * 60 * shortTimeout

  const name = 'ipfs-controller'

  var IpfsController = function () {
    this.pin = new Map()
    this.unpin = new Map()
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
    // Init once
    this.once = true
  }

  IpfsController.prototype.getEruda = async function () {
    return await this.ipfsBundle.getEruda()
  }

  IpfsController.prototype.getEthers = async function () {
    return await this.ipfsBundle.getEthers()
  }

  IpfsController.prototype.getIpfsHttpClient = async function () {
    return await this.ipfsBundle.getIpfsHttpClient()
  }

  IpfsController.prototype.requireEruda = function () {
    return require('$:/library/eruda.min.js')
  }

  IpfsController.prototype.requireEthers = function () {
    return require('$:/library/ethers.umd.min.js')
  }

  IpfsController.prototype.requireIpfsHttpClient = function () {
    return require('$:/library/ipfs-http-client.min.js')
  }

  IpfsController.prototype.getLogger = function () {
    const log = globalThis.log !== undefined && globalThis.log !== null ? globalThis.log : null
    if (log !== null) {
      const loggers = log.getLoggers()
      const eruda = loggers.eruda
      if (eruda !== undefined && eruda !== null) {
        return eruda
      }
      const ipfs = loggers.ipfs
      if (ipfs !== undefined && ipfs !== null) {
        return ipfs
      }
    }
    return console
  }

  IpfsController.prototype.handleImportFile = async function (info) {
    return await this.ipfsTiddler.handleImportFile(info)
  }

  IpfsController.prototype.objectStat = async function (cid, timeout) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsBundle.objectStat(ipfs, cid, timeout)
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

  IpfsController.prototype.fetchOptions = async function (url, timeout) {
    return await this.ipfsBundle.fetchOptions(url, timeout)
  }

  IpfsController.prototype.fetchUint8Array = async function (url, timeout) {
    return await this.ipfsBundle.fetchUint8Array(url, timeout)
  }

  IpfsController.prototype.processContent = async function (tiddler, content, encoding, type) {
    if (content === undefined || content == null) {
      throw new Error('Unknown content...')
    }
    encoding = encoding !== undefined && encoding !== null && encoding.trim() !== '' ? encoding.trim() : null
    if (encoding == null) {
      throw new Error('Unknown encoding...')
    }
    type = type !== undefined && type !== null && type.trim() !== '' ? type.trim() : null
    if (type == null) {
      throw new Error('Unknown type...')
    }
    var compress = $tw.wiki.getTiddler('$:/isCompressed')
    compress = compress !== undefined && compress !== null ? compress.fields.text === 'yes' : false
    if (encoding === 'base64' || type === 'image/svg+xml') {
      compress = false
    }
    compress =
      tiddler !== undefined && tiddler !== null && tiddler.fields._compress !== undefined && tiddler.fields._compress !== null
        ? tiddler.fields._compress.trim() === 'yes'
        : compress
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
        if (compress) {
          content = { compressed: this.deflate(content) }
          content.compressed = $tw.crypto.encrypt(content.compressed, password, publicKey)
          if (hasPublicKey && sign) {
            content.keccak256 = $tw.crypto.keccak256(content.compressed)
            content.signature = await this.personalSign(content.keccak256)
            content.signature = $tw.crypto.encrypt(content.signature, null, publicKey)
          }
          content = JSON.stringify(content)
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
          } else {
            content = $tw.crypto.encrypt(content, password)
          }
        }
        content = $tw.ipfs.StringToUint8Array(content)
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
          content = $tw.ipfs.StringToUint8Array(content)
        } else {
          if (encoding === 'base64') {
            content = $tw.ipfs.Base64ToUint8Array(content)
          } else {
            content = $tw.ipfs.StringToUint8Array(content)
          }
        }
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, 'Failed to process content...')
        return null
      }
    }
    return content
  }

  IpfsController.prototype.addToPin = function (ipfsObject) {
    var { ipfsPath, recursive } = ipfsObject
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? decodeURI(ipfsPath.toString().trim()) : null
    if (ipfsPath !== null) {
      var value = this.unpin.get(ipfsPath)
      if (value !== undefined) {
        this.unpin.delete(ipfsPath)
        $tw.ipfs.getLogger().info(
          `Cancel request to Unpin:
${ipfsPath}`
        )
        return false
      }
      if (this.pin.get(ipfsPath) === undefined) {
        this.pin.set(ipfsPath, { recursive: recursive })
        $tw.ipfs.getLogger().info(
          `Request to Pin:
${ipfsPath}`
        )
        return true
      }
    }
    return false
  }

  IpfsController.prototype.addToUnpin = function (ipfsObject) {
    var { ipfsPath, recursive } = ipfsObject
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? decodeURI(ipfsPath.toString().trim()) : null
    if (ipfsPath !== null) {
      // Discard
      var value = this.pin.get(ipfsPath)
      if (value !== undefined) {
        this.pin.delete(ipfsPath)
        $tw.ipfs.getLogger().info(
          `Cancel request to Pin:
${ipfsPath}`
        )
        return false
      }
      // Add to unpin
      if (this.unpin.get(ipfsPath) === undefined) {
        this.unpin.set(ipfsPath, { recursive: recursive })
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
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? decodeURI(ipfsPath.toString().trim()) : null
    if (ipfsPath !== null) {
      var value = this.pin.get(ipfsPath)
      if (value !== undefined) {
        this.pin.delete(ipfsPath)
        $tw.ipfs.getLogger().info(
          `Cancel request to Pin:
 ${ipfsPath}`
        )
      }
      value = this.unpin.get(ipfsPath)
      if (value !== undefined) {
        this.unpin.delete(ipfsPath)
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

  IpfsController.prototype.dagPut = async function (links, timeout) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.dagPut(ipfs, links, timeout)
  }

  IpfsController.prototype.addContentToIpfs = async function (upload, wrapWithDirectory) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.addContentToIpfs(ipfs, upload, wrapWithDirectory)
  }

  IpfsController.prototype.generateIpnsCid = async function (ipnsKey) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.generateIpnsCid(ipfs, ipnsKey)
  }

  IpfsController.prototype.removeIpnsKey = async function (ipnsKey) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsKey)
  }

  IpfsController.prototype.renameIpnsKey = async function (oldIpnsKey, newIpnsKey) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.renameIpnsKey(ipfs, oldIpnsKey, newIpnsKey)
  }

  IpfsController.prototype.resolveIpfs = async function (value, timeout) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.resolveIpfs(ipfs, value, timeout)
  }

  IpfsController.prototype.resolveIpfsContainer = async function (value, timeout) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.resolveIpfsContainer(ipfs, value, timeout)
  }

  IpfsController.prototype.getIpnsIdentifier = async function (identifier, resolveIpnsKey, base, path, ipnsKey) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.getIpnsIdentifier(ipfs, identifier, resolveIpnsKey, base, path, ipnsKey)
  }

  IpfsController.prototype.fetchDagNode = async function (cid, timeout) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.fetchDagNode(ipfs, cid, timeout)
  }

  IpfsController.prototype.resolveIpnsKey = async function (ipnsKey, timeout) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey, timeout)
  }

  IpfsController.prototype.publishIpnsKey = async function (ipfsCid, ipnsCid, ipnsKey, options) {
    const { ipfs } = await this.getIpfsClient()
    return await this.ipfsWrapper.publishIpnsKey(ipfs, ipfsCid, ipnsCid, ipnsKey, options)
  }

  IpfsController.prototype.isJson = function (content) {
    return this.ipfsBundle.isJson(content)
  }

  IpfsController.prototype.filenamify = function (name, options) {
    return this.ipfsBundle.filenamify(name, options)
  }

  IpfsController.prototype.getPublicGatewayUrl = function () {
    return this.ipfsBundle.getPublicGatewayUrl()
  }

  IpfsController.prototype.getBase = function (base) {
    return this.ipfsBundle.getBase(base)
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

  IpfsController.prototype.getDefaultApi = function () {
    return this.ipfsBundle.getDefaultApi()
  }

  IpfsController.prototype.getDefaultGateway = function () {
    return this.ipfsBundle.getDefaultGateway()
  }

  IpfsController.prototype.getApiUrl = function () {
    return this.ipfsBundle.getApiUrl()
  }

  IpfsController.prototype.getGatewayUrl = function () {
    return this.ipfsBundle.getGatewayUrl()
  }

  IpfsController.prototype.getUrl = function (url, base) {
    return this.ipfsBundle.getUrl(url, base)
  }

  IpfsController.prototype.resolveUrl = async function (value, resolveIpns, resolveIpnsKey, resolveEns, base, web3) {
    var ipfsCid = null
    var ipnsCid = null
    var ipnsKey = null
    var normalizedUrl = null
    var resolvedUrl = null
    value = value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : null
    if (value == null) {
      return {
        ipfsCid: null,
        ipnsCid: null,
        ipnsKey: null,
        normalizedUrl: null,
        resolvedUrl: null,
      }
    }
    base = base !== undefined && base !== null && base.toString().trim() !== '' ? base.toString().trim() : null
    try {
      normalizedUrl = this.normalizeUrl(value, base)
    } catch (error) {
      // Ignore
    }
    if (normalizedUrl == null) {
      return {
        ipfsCid: null,
        ipnsCid: null,
        ipnsKey: null,
        normalizedUrl: null,
        resolvedUrl: null,
      }
    }
    var { ipfsCid, ipnsIdentifier, ipfsPath } = this.getIpfsIdentifier(normalizedUrl)
    if (ipnsIdentifier !== null) {
      var { ipfsCid, ipnsCid, ipnsKey, normalizedUrl, resolvedUrl } = await this.resolveIpns(ipnsIdentifier, resolveIpns, resolveIpnsKey, base, ipfsPath)
    } else if (resolveEns && ipfsCid == null && ipnsIdentifier == null && (normalizedUrl.hostname.endsWith('.eth') || normalizedUrl.hostname.endsWith('.eth.link'))) {
      var { identifier, protocol, normalizedUrl, resolvedUrl } = await this.resolveEns(normalizedUrl.hostname, base, ipfsPath, web3)
      if (protocol === ipnsKeyword) {
        var { ipfsCid, ipnsCid, ipnsKey, normalizedUrl, resolvedUrl } = await this.resolveIpns(identifier, resolveIpns, resolveIpnsKey, base, ipfsPath)
      }
    }
    return {
      ipfsCid: ipfsCid,
      ipnsCid: ipnsCid,
      ipnsKey: ipnsKey,
      normalizedUrl: normalizedUrl,
      resolvedUrl: resolvedUrl !== null ? resolvedUrl : normalizedUrl,
    }
  }

  IpfsController.prototype.resolveIpns = async function (identifier, resolveIpfsCid, resolveIpnsKey, base, path) {
    identifier = identifier !== undefined && identifier !== null && identifier.toString().trim() !== '' ? identifier.toString().trim() : null
    path = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : ''
    if (identifier == null) {
      return {
        ipfsCid: null,
        ipnsCid: null,
        ipnsKey: null,
        normalizedUrl: null,
        resolvedUrl: null,
      }
    }
    var ipfsCid = null
    var resolvedUrl = null
    var { ipnsKey, ipnsCid, normalizedUrl } = await this.getIpnsIdentifier(identifier, resolveIpnsKey, base, path)
    if (ipnsCid !== null && resolveIpfsCid) {
      var { cid: ipfsCid, remainderPath } = await this.resolveIpfs(normalizedUrl.pathname)
      if (ipfsCid !== null) {
        var credential = ''
        var { base } = this.ipfsBundle.getBase(normalizedUrl)
        if (normalizedUrl.username && normalizedUrl.password) {
          credential = `${normalizedUrl.username}:${normalizedUrl.password}@`
        }
        resolvedUrl = this.getUrl(`${base.protocol}//${credential}${base.host}/ipfs/${ipfsCid}${remainderPath}${normalizedUrl.search}${normalizedUrl.hash}`)
        if (normalizedUrl.toString() !== resolvedUrl.toString()) {
          $tw.ipfs.getLogger().info(
            `Resolved IPNS:
 ${normalizedUrl}
 ${resolvedUrl}`
          )
        } else {
          $tw.ipfs.getLogger().info(
            `Resolved IPNS:
 ${resolvedUrl}`
          )
        }
      }
    }
    return {
      ipfsCid: ipfsCid,
      ipnsCid: ipnsCid,
      ipnsKey: ipnsKey,
      normalizedUrl: normalizedUrl,
      resolvedUrl: resolvedUrl !== undefined && resolvedUrl !== null ? resolvedUrl : normalizedUrl,
    }
  }

  IpfsController.prototype.resolveEns = async function (ensDomain, base, path, web3) {
    ensDomain = ensDomain !== undefined && ensDomain !== null && ensDomain.toString().trim() !== '' ? ensDomain.toString().trim() : null
    if (ensDomain == null) {
      return {
        identifier: null,
        protocol: null,
        resolvedUrl: null,
      }
    }
    if (ensDomain.endsWith('.eth.link')) {
      ensDomain = ensDomain.substring(0, ensDomain.indexOf('.link'))
    }
    path = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : ''
    if (web3 === undefined || web3 == null) {
      var { web3 } = await this.getWeb3Provider()
    }
    const { content, protocol } = await this.ensWrapper.getContentHash(ensDomain, web3)
    if (content == null || protocol == null) {
      return {
        identifier: null,
        protocol: null,
        resolvedUrl: null,
      }
    }
    const url = this.normalizeUrl(`/${protocol}/${content}${path}`, base)
    $tw.ipfs.getLogger().info(
      `Fetched ENS domain content: "${ensDomain}"
${url}`
    )
    return {
      identifier: content,
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
    const url = this.getApiUrl()
    const { ipfs, provider } = await this.ipfsWrapper.getHttpIpfsClient(url)
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
      `Set ENS domain content:
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

  IpfsController.prototype.isEnsOwner = async function (domain, web3, account) {
    return await this.ipfsBundle.isEnsOwner(domain, web3, account)
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

  IpfsController.prototype.deflate = function (str) {
    return this.ipfsBundle.deflate(str)
  }

  IpfsController.prototype.inflate = function (b64) {
    return this.ipfsBundle.inflate(b64)
  }

  exports.IpfsController = IpfsController
})()
