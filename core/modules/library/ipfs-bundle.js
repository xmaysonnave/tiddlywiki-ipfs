/*\
title: $:/plugins/ipfs/ipfs-bundle.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Bundle

\*/
'use strict'

const CID = require('cids')
const EnsLibrary = require('./ipfs-bundle/ens-library.js').EnsLibrary
const EthereumLibrary = require('./ipfs-bundle/ethereum-library.js').EthereumLibrary
const IpfsLibrary = require('./ipfs-bundle/ipfs-library.js').IpfsLibrary
const IpfsLoader = require('./ipfs-bundle/ipfs-loader.js').IpfsLoader
const IpfsUrl = require('./ipfs-bundle/ipfs-url.js').IpfsUrl

const cidInspector = 'https://cid.ipfs.io/#'
const libp2pKey = 'libp2p-key'
const dagPb = 'dag-pb'

var IpfsBundle = function () {
  this.once = false
  /*eslint no-unused-vars:"off"*/
  this.name = 'ipfs-bundle'
}

IpfsBundle.prototype.getLogger = function () {
  if (globalThis.log !== undefined && globalThis.log !== null) {
    const loggers = globalThis.log.getLoggers()
    var eruda = loggers.eruda
    if (eruda) {
      return eruda
    }
    var ipfs = loggers.ipfs
    if (ipfs) {
      return ipfs
    }
  }
  return console
}

IpfsBundle.prototype.init = function () {
  // Init once
  if (this.once) {
    return
  }
  this.ipfsLoader = new IpfsLoader(this)
  this.ethereumLibrary = new EthereumLibrary(this)
  this.ethereumLibrary.init()
  this.ensLibrary = new EnsLibrary(this)
  this.ipfsLibrary = new IpfsLibrary(this)
  this.ipfsUrl = new IpfsUrl(this)
  // Init once
  this.once = true
}

IpfsBundle.prototype.filenamify = function (name, options) {
  return this.ipfsUrl.filenamify(name, options)
}

IpfsBundle.prototype.getBase = function (base) {
  return this.ipfsUrl.getBase(base)
}

IpfsBundle.prototype.getIpfsBaseUrl = function () {
  return this.ipfsUrl.getIpfsBaseUrl()
}

IpfsBundle.prototype.normalizeUrl = function (value, base) {
  return this.ipfsUrl.normalizeUrl(value, base)
}

IpfsBundle.prototype.getDocumentUrl = function () {
  return this.ipfsUrl.getDocumentUrl()
}

IpfsBundle.prototype.getIpfsDefaultApiUrl = function () {
  return this.ipfsUrl.getIpfsDefaultApiUrl()
}

IpfsBundle.prototype.getIpfsDefaultGatewayUrl = function () {
  return this.ipfsUrl.getIpfsDefaultGatewayUrl()
}

IpfsBundle.prototype.getIpfsDefaultApi = function () {
  return this.ipfsUrl.getIpfsDefaultApi()
}

IpfsBundle.prototype.getIpfsDefaultGateway = function () {
  return this.ipfsUrl.getIpfsDefaultGateway()
}

IpfsBundle.prototype.getIpfsApiUrl = function () {
  return this.ipfsUrl.getIpfsApiUrl()
}

IpfsBundle.prototype.getIpfsGatewayUrl = function () {
  return this.ipfsUrl.getIpfsGatewayUrl()
}

IpfsBundle.prototype.getUrl = function (url, base) {
  return this.ipfsUrl.getUrl(url, base)
}

IpfsBundle.prototype.getENSRegistry = function () {
  return this.ensLibrary.getENSRegistry()
}

IpfsBundle.prototype.getBlockExplorerRegistry = function () {
  return this.ethereumLibrary.getBlockExplorerRegistry()
}

IpfsBundle.prototype.getNetworkRegistry = function () {
  return this.ethereumLibrary.getNetworkRegistry()
}

IpfsBundle.prototype.loadErudaLibrary = async function () {
  try {
    if (typeof globalThis.eruda === 'undefined') {
      await this.ipfsLoader.loadErudaLibrary()
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  if (typeof globalThis.eruda === 'undefined') {
    throw new Error('Unavailable Eruda library...')
  }
}

IpfsBundle.prototype.loadEthSigUtilLibrary = async function () {
  try {
    if (typeof globalThis.sigUtil === 'undefined') {
      await this.ipfsLoader.loadEthSigUtilLibrary()
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  if (typeof globalThis.sigUtil === 'undefined') {
    throw new Error('Unavailable eth-sig-util library...')
  }
}

IpfsBundle.prototype.loadEthersJsLibrary = async function () {
  try {
    if (typeof globalThis.ethers === 'undefined') {
      await this.ipfsLoader.loadEtherJsLibrary()
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  if (typeof globalThis.ethers === 'undefined') {
    throw new Error('Unavailable Ethereum library...')
  }
}

IpfsBundle.prototype.loadIpfsHttpLibrary = async function () {
  try {
    if (typeof globalThis.IpfsHttpClient === 'undefined') {
      await this.ipfsLoader.loadIpfsHttpLibrary()
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  if (typeof globalThis.IpfsHttpClient === 'undefined') {
    throw new Error('Unavailable IPFS HTTP Client library...')
  }
}

IpfsBundle.prototype.getPublicEncryptionKey = async function (provider) {
  try {
    return await this.ethereumLibrary.getPublicEncryptionKey(provider)
  } catch (error) {
    if (error.name === 'RejectedUserRequest') {
      throw error
    }
    this.getLogger().error(error)
    throw new Error('Unable to retrieve an Ethereum Public Encryption Key...')
  }
}

IpfsBundle.prototype.personalRecover = async function (message, signature) {
  return await this.ethereumLibrary.personalRecover(message, signature)
}

IpfsBundle.prototype.personalSign = async function (message, provider) {
  try {
    return await this.ethereumLibrary.personalSign(message, provider)
  } catch (error) {
    if (error.name === 'RejectedUserRequest') {
      throw error
    }
    this.getLogger().error(error)
    throw new Error('Unable to sign content...')
  }
}

IpfsBundle.prototype.decrypt = async function (text, provider) {
  try {
    return await this.ethereumLibrary.decrypt(text, provider)
  } catch (error) {
    if (error.name === 'RejectedUserRequest') {
      throw error
    }
    this.getLogger().error(error)
    throw new Error('Unable to decrypt content...')
  }
}

IpfsBundle.prototype.getBlockExplorerRegistry = function () {
  return this.ethereumLibrary.getBlockExplorerRegistry()
}

IpfsBundle.prototype.getEnabledWeb3Provider = async function (provider) {
  return await this.ethereumLibrary.getEnabledWeb3Provider(provider)
}

IpfsBundle.prototype.getWeb3Provider = async function (provider) {
  return await this.ethereumLibrary.getWeb3Provider(provider)
}

IpfsBundle.prototype.isOwner = async function (domain, web3, account) {
  return await this.ensLibrary.isOwner(domain, web3, account)
}

/*
 * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
 * https://eips.ethereum.org/EIPS/eip-1193
 * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
 */
IpfsBundle.prototype.getEthereumProvider = async function () {
  return await this.ethereumLibrary.getEthereumProvider()
}

IpfsBundle.prototype.getEnabledWeb3Provider = async function () {
  var account = null
  var chainId = null
  var web3 = null
  const explorer = this.getBlockExplorerRegistry()
  const network = this.getNetworkRegistry()
  const provider = await this.getEthereumProvider()
  try {
    var { account, chainId, web3 } = await this.ethereumLibrary.getEnabledWeb3Provider(provider)
  } catch (error) {
    if (error.name === 'RejectedUserRequest') {
      throw error
    }
    this.getLogger().error(error)
    throw new Error('Unable to retrieve an enabled Ethereum Provider...')
  }
  // Log
  this.getLogger().info(
    `New Enabled Web3 provider:
Chain: ${network[chainId]}
Account: ${explorer[chainId]}/address/${account}`
  )
  return {
    account: account,
    chainId: chainId,
    provider: provider,
    web3: web3,
  }
}

IpfsBundle.prototype.getWeb3Provider = async function () {
  var chainId = null
  var web3 = null
  const network = this.getNetworkRegistry()
  const provider = await this.getEthereumProvider()
  try {
    var { web3, chainId } = await this.ethereumLibrary.getWeb3Provider(provider)
  } catch (error) {
    this.getLogger().error(error)
    throw new Error('Unable to retrieve an Ethereum Provider...')
  }
  // Log
  this.getLogger().info(
    `New Web3 provider:
${network[chainId]}`
  )
  return {
    chainId: chainId,
    provider: provider,
    web3: web3,
  }
}

IpfsBundle.prototype.decode = function (b64) {
  return Base64Binary.decode(b64)
}

// https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer/21797381
// https://github.com/danguer/blog-examples/blob/master/js/base64-binary.js
/*
 * Copyright (c) 2011, Daniel Guerrero
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 *
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */
var Base64Binary = {
  _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
  /* will return a  Uint8Array type */
  decodeArrayBuffer: function (input) {
    var bytes = (input.length / 4) * 3
    var ab = new ArrayBuffer(bytes)
    this.decode(input, ab)
    return ab
  },
  removePaddingChars: function (input) {
    var lkey = this._keyStr.indexOf(input.charAt(input.length - 1))
    if (lkey === 64) {
      return input.substring(0, input.length - 1)
    }
    return input
  },
  decode: function (input, ab) {
    //get last chars to see if are valid
    input = this.removePaddingChars(input)
    input = this.removePaddingChars(input)
    var bytes = parseInt((input.length / 4) * 3, 10)
    var ua
    var chr1, chr2, chr3
    var enc1, enc2, enc3, enc4
    var i = 0
    var j = 0
    if (ab) ua = new Uint8Array(ab)
    else ua = new Uint8Array(bytes)
    /*eslint no-useless-escape:"off"*/
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '')
    for (i = 0; i < bytes; i += 3) {
      //get the 3 octects in 4 ascii chars
      enc1 = this._keyStr.indexOf(input.charAt(j++))
      enc2 = this._keyStr.indexOf(input.charAt(j++))
      enc3 = this._keyStr.indexOf(input.charAt(j++))
      enc4 = this._keyStr.indexOf(input.charAt(j++))
      chr1 = (enc1 << 2) | (enc2 >> 4)
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
      chr3 = ((enc3 & 3) << 6) | enc4
      ua[i] = chr1
      if (enc3 !== 64) ua[i + 1] = chr2
      if (enc4 !== 64) ua[i + 2] = chr3
    }
    return ua
  },
}

IpfsBundle.prototype.isJson = function (content) {
  return this.ipfsLoader.isJson(content)
}

IpfsBundle.prototype.loadToBase64 = async function (url, password) {
  return await this.ipfsLoader.loadToBase64(url, password)
}

IpfsBundle.prototype.loadToUtf8 = async function (url, password) {
  return await this.ipfsLoader.loadToUtf8(url, password)
}

IpfsBundle.prototype.analyzePinType = function (type) {
  return this.ipfsLibrary.analyzePinType(type)
}

IpfsBundle.prototype.addAll = async function (client, source, options) {
  return await this.ipfsLibrary.addAll(client, source, options)
}

IpfsBundle.prototype.hasPin = async function (client, key, type, ipfsPath) {
  return await this.ipfsLibrary.hasPin(client, key, type, ipfsPath)
}

IpfsBundle.prototype.dagResolve = async function (client, ipfsPath, timeout) {
  return await this.ipfsLibrary.dagResolve(client, ipfsPath, timeout)
}

IpfsBundle.prototype.filesStat = async function (client, ipfsPath, timeout) {
  return await this.ipfsLibrary.filesStat(client, ipfsPath, timeout)
}

IpfsBundle.prototype.isDirectory = async function (client, cid, timeout) {
  return await this.ipfsLibrary.isDirectory(client, cid, timeout)
}

IpfsBundle.prototype.ls = async function (client, ipfsPath) {
  return await this.ipfsLibrary.ls(client, ipfsPath)
}

IpfsBundle.prototype.objectData = async function (client, cid, recursive) {
  return await this.ipfsLibrary.objectData(client, cid, recursive)
}

IpfsBundle.prototype.objectStat = async function (client, cid, recursive) {
  return await this.ipfsLibrary.objectStat(client, cid, recursive)
}

IpfsBundle.prototype.pinRm = async function (client, cid, recursive) {
  return await this.ipfsLibrary.pinRm(client, cid, recursive)
}

IpfsBundle.prototype.resolveIpfs = async function (client, value, timeout) {
  if (value === undefined || value == null || value.toString().trim() === '') {
    return {
      cid: null,
      remainderPath: '',
    }
  }
  if (value instanceof URL === false) {
    try {
      value = this.getUrl(value)
    } catch (error) {
      return {
        cid: null,
        remainderPath: '',
      }
    }
  }
  // Pathname
  var ipfsPath = null
  var { cid, ipnsIdentifier, path } = this.decodePathname(value.pathname)
  if (cid !== null) {
    ipfsPath = `/ipfs/${cid}${path}`
  } else if (ipnsIdentifier !== null) {
    ipfsPath = `/ipns/${ipnsIdentifier}${path}`
  }
  if (ipfsPath !== null) {
    var { cid, remainderPath } = await this.dagResolve(client, ipfsPath, timeout)
    return {
      cid: cid,
      remainderPath: remainderPath,
    }
  }
  // Hostname
  var { cid, ipnsIdentifier, path } = this.decodeHostname(value.hostname)
  if (cid !== null) {
    ipfsPath = `/ipfs/${cid}${path}`
  } else if (ipnsIdentifier !== null) {
    ipfsPath = `/ipns/${ipnsIdentifier}${path}`
  }
  if (ipfsPath !== null) {
    var { cid, remainderPath } = await this.dagResolve(client, ipfsPath, timeout)
    return {
      cid: cid,
      remainderPath: remainderPath,
    }
  }
  return {
    cid: null,
    remainderPath: '',
  }
}

IpfsBundle.prototype.resolveIpfsContainer = async function (client, value, timeout) {
  if (value === undefined || value == null || value.toString().trim() === '') {
    return null
  }
  if (value instanceof URL === false) {
    try {
      value = this.getUrl(value)
    } catch (error) {
      return null
    }
  }
  const self = this
  const resolveContainer = async function (client, ipfsPath, base, timeout) {
    try {
      const currentUrl = self.getUrl(ipfsPath, base)
      const { cid } = await self.resolveIpfs(client, currentUrl, timeout)
      if (cid == null) {
        return null
      }
      if (await self.isDirectory(client, cid, timeout)) {
        return `/ipfs/${cid}`
      }
      var nextPath = ''
      const members = value.pathname.split('/')
      for (var i = 0; i < members.length; i++) {
        if (members[i].trim() === '') {
          continue
        }
        if (i !== members.length - 1) {
          nextPath = `${nextPath}/${members[i]}`
        }
      }
      const nextUrl = self.getUrl(nextPath, base)
      ipfsPath = await self.resolveIpfsContainer(client, nextUrl, timeout)
      if (ipfsPath == null) {
        ipfsPath = `/ipfs/${cid}`
      }
      return ipfsPath
    } catch (error) {
      self.getLogger().error(error)
    }
    return ipfsPath
      .split('/')
      .slice(0, -1)
      .join('/') // get dir of filepath
  }
  const base = this.getUrl(`${value.protocol}//${value.host}`)
  // Pathname
  var ipfsPath = null
  var { cid: innerCid, ipnsIdentifier, path } = this.decodePathname(value.pathname)
  if (innerCid !== null) {
    ipfsPath = `/ipfs/${innerCid}${path}`
  } else if (ipnsIdentifier !== null) {
    ipfsPath = `/ipns/${ipnsIdentifier}${path}`
  }
  if (ipfsPath !== null) {
    return await resolveContainer(client, ipfsPath, base, timeout)
  }
  // Hostname
  var { cid: innerCid, ipnsIdentifier, path } = this.decodeHostname(value.hostname)
  if (innerCid !== null) {
    ipfsPath = `/ipfs/${innerCid}${path}`
  } else if (ipnsIdentifier !== null) {
    ipfsPath = `/ipns/${ipnsIdentifier}${path}`
  }
  if (ipfsPath !== null) {
    return await resolveContainer(client, ipfsPath, base, timeout)
  }
  return null
}

IpfsBundle.prototype.getIpfsIdentifier = function (value) {
  if (value === undefined || value == null) {
    return {
      cid: null,
      ipnsIdentifier: null,
      path: null,
    }
  }
  var cid = null
  var hostname = null
  var ipnsIdentifier = null
  var path = null
  var url = null
  if (value instanceof URL === false) {
    try {
      url = this.getUrl(value)
    } catch (error) {
      url = null
    }
  } else {
    url = value
  }
  if (url !== null) {
    var { cid, hostname, ipnsIdentifier, path } = this.decodeUrl(url)
  } else {
    var { cid, hostname, ipnsIdentifier, path } = this.decodeHostname(value)
    if (cid == null && ipnsIdentifier == null) {
      var { cid, ipnsIdentifier, path } = this.decodePathname(value)
    }
  }
  return {
    cid: cid,
    hostname: hostname,
    ipnsIdentifier: ipnsIdentifier,
    path: path,
  }
}

IpfsBundle.prototype.decodeUrl = function (url) {
  url = url !== undefined && url !== null && url.toString().trim() !== '' ? url : null
  if (url instanceof URL === false) {
    return {
      cid: null,
      hostname: null,
      ipnsIdentifier: null,
      path: null,
    }
  }
  var cid = null
  var hostname = null
  var ipnsIdentifier = null
  var protocol = null
  var path = `${url.pathname}${url.search}${url.hash}`
  if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
    if (url.hostname !== undefined && url.hostname !== null && url.hostname.trim() !== '') {
      if (url.protocol === 'ipns:') {
        ipnsIdentifier = url.hostname
        protocol = 'ipns'
      } else if (url.protocol === 'ipfs:' && this.getCid(url.hostname) !== null) {
        cid = url.hostname
        protocol = 'ipfs'
      }
    } else if (url.pathname !== undefined && url.pathname !== null && url.pathname.trim() !== '') {
      var pathname
      if (url.pathname.startsWith('//')) {
        pathname = `/${protocol}/${url.pathname.slice(2)}${url.search}${url.hash}`
      } else {
        pathname = `/${protocol}/${url.pathname}${url.search}${url.hash}`
      }
      var { cid, ipnsIdentifier, path } = this.decodePathname(pathname)
    }
    return {
      cid: cid,
      hostname: null,
      ipnsIdentifier: ipnsIdentifier,
      path: path,
    }
  }
  var { cid, hostname, ipnsIdentifier } = this.decodeHostname(url.hostname)
  if (cid == null && ipnsIdentifier == null) {
    var { cid, ipnsIdentifier, path: innerPath } = this.decodePathname(url.pathname)
    if (innerPath !== null) {
      path = `${innerPath}${url.search}${url.hash}`
    }
  }
  return {
    cid: cid,
    hostname: hostname,
    ipnsIdentifier: ipnsIdentifier,
    path: path,
  }
}

IpfsBundle.prototype.decodePathname = function (pathname) {
  pathname = pathname !== undefined && pathname !== null && pathname.trim() !== '' ? pathname.trim() : null
  if (pathname == null || pathname === '/') {
    return {
      cid: null,
      ipnsIdentifier: null,
      path: pathname,
    }
  }
  var identifier = null
  var protocol = null
  var path = ''
  // Parse
  const members = pathname.trim().split('/')
  for (var i = 0; i < members.length; i++) {
    if (members[i].trim() === '') {
      continue
    }
    if (protocol == null) {
      protocol = members[i]
      continue
    }
    if (identifier == null) {
      identifier = members[i]
      continue
    }
    path = `${path}/${members[i]}`
  }
  if (pathname.slice(-1) === '/') {
    path = `${path}/`
  }
  if (protocol == null || identifier == null) {
    return {
      cid: null,
      ipnsIdentifier: null,
      path: pathname,
    }
  }
  var cid = null
  var ipnsIdentifier = null
  if (protocol === 'ipns' || protocol === 'ipns:') {
    ipnsIdentifier = identifier
  } else if ((protocol === 'ipfs' || protocol === 'ipfs:') && this.getCid(identifier) !== null) {
    cid = identifier
  } else {
    protocol = null
  }
  return {
    cid: cid,
    ipnsIdentifier: ipnsIdentifier,
    path: protocol !== null ? path : pathname,
  }
}

IpfsBundle.prototype.decodeHostname = function (hostname) {
  hostname = hostname !== undefined && hostname !== null && hostname.trim() !== '' ? hostname.trim() : null
  if (hostname == null) {
    return {
      cid: null,
      hostname: null,
      ipnsIdentifier: null,
      path: '/',
    }
  }
  var domain = null
  var identifier = null
  var protocol = null
  var path = '/'
  // Parse
  const members = hostname.trim().split('.')
  for (var i = 0; i < members.length; i++) {
    if (members[i].trim() === '') {
      continue
    }
    if (identifier == null) {
      identifier = members[i]
      continue
    }
    if (protocol == null) {
      protocol = members[i]
      continue
    }
    const search = members[i].split('/', 1)
    if (search[0] !== members[i]) {
      if (domain) {
        domain = `${domain}.${search[0]}`
      } else {
        domain = search[0]
      }
      path = search[1]
    } else {
      if (domain) {
        domain = `${domain}.${members[i]}`
      } else {
        domain = members[i]
      }
    }
  }
  if (identifier == null || protocol == null) {
    return {
      cid: null,
      hostname: null,
      ipnsIdentifier: null,
      path: '/',
    }
  }
  var cid = null
  var ipnsIdentifier = null
  if (protocol === 'ipns' || protocol === 'ipns:') {
    ipnsIdentifier = identifier
  } else if ((protocol === 'ipfs' || protocol === 'ipfs:') && this.getCid(identifier) !== null) {
    cid = identifier
  }
  if (cid == null && ipnsIdentifier == null) {
    if (domain == null) {
      domain = `${identifier}.${protocol}`
    } else {
      domain = `${identifier}.${protocol}.${domain}`
    }
  }
  return {
    cid: cid,
    hostname: domain,
    ipnsIdentifier: ipnsIdentifier,
    path: path !== undefined && path !== null ? path : '/',
  }
}

IpfsBundle.prototype.getCid = function (cid) {
  try {
    const newCid = new CID(cid)
    if (CID.isCID(newCid)) {
      return newCid
    }
  } catch (error) {
    // Ignore
  }
  return null
}

IpfsBundle.prototype.cidToBase58CidV0 = function (cid, log) {
  return this.convertCidToBase58CidV0(cid, log)
}

IpfsBundle.prototype.convertCidToBase58CidV0 = function (cid, log) {
  cid = new CID(cid.toString())
  const { codec: cidCodec } = cid.toJSON()
  if (cid.version === 1) {
    const converted = new CID(0, dagPb, cid.multihash, 'base58btc')
    // Log
    if (log) {
      const { codec: convertedCodec } = converted.toJSON()
      this.getLogger().info(
        `Converted:
'${cidCodec}' "cidv1" (${cid.multibaseName}): ${cidInspector}${cid}
to '${convertedCodec}' "cidv0" (base58btc): ${cidInspector}${converted}`
      )
    }
    return converted
  }
  // Convert
  if (cidCodec !== dagPb || cid.multibaseName !== 'base58btc') {
    cid = this.convertCidToCid(cid, 0, dagPb, 'base58btc', log)
  }
  return cid
}

IpfsBundle.prototype.cidToCidV1 = function (cid, protocol, log) {
  return this.convertCidToCidV1(cid, protocol, log)
}

IpfsBundle.prototype.convertCidToCidV1 = function (cid, protocol, log) {
  cid = new CID(cid.toString())
  const { codec: cidCodec } = cid.toJSON()
  var codec = protocol !== undefined && protocol !== null ? (protocol === 'ipns' ? libp2pKey : dagPb) : dagPb
  var multibaseName = codec === libp2pKey ? 'base36' : 'base32'
  // Convert
  if (cid.version === 0) {
    const converted = new CID(1, codec, cid.multihash, multibaseName)
    if (log) {
      this.getLogger().info(
        `Converted:
'${cidCodec}' "cidv0" (${cid.multibaseName}): ${cidInspector}${cid}
to '${codec}' "cidv1" (${multibaseName}): ${cidInspector}${converted}`
      )
    }
    return converted
  }
  // Convert
  if (cidCodec !== codec || cid.multibaseName !== multibaseName) {
    cid = this.convertCidToCid(cid, 1, codec, multibaseName, log)
  }
  return cid
}

IpfsBundle.prototype.cidToLibp2pKeyCidV1 = function (cid, multibaseName, log) {
  return this.convertCidToCid(cid, 1, 'libp2p-key', multibaseName, log)
}

IpfsBundle.prototype.convertCidToCid = function (cid, version, codec, multibaseName, log) {
  cid = new CID(cid.toString())
  const { codec: cidCodec, version: cidVersion } = cid.toJSON()
  if (cid.version === version && cidCodec === codec && cid.multibaseName === multibaseName) {
    return cid
  }
  const converted = new CID(version, codec, cid.multihash, multibaseName)
  if (log) {
    const { codec: convertedCodec, version: convertedVersion } = converted.toJSON()
    this.getLogger().info(
      `Converted:
'${cidCodec}' "cidv${cidVersion}" (${cid.multibaseName}): ${cidInspector}${cid}
to '${convertedCodec}' "cidv${convertedVersion}" (${multibaseName}): ${cidInspector}${converted}`
    )
  }
  return converted
}

IpfsBundle.prototype.Base64ToUint8Array = function (b64) {
  return Base64Binary.decode(b64)
}

// https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
IpfsBundle.prototype.Uint8ArrayToBase64 = function (uint8) {
  var CHUNK_SIZE = 0x8000 //arbitrary number
  var index = 0
  var length = uint8.length
  var str = ''
  var slice
  while (index < length) {
    slice = uint8.subarray(index, Math.min(index + CHUNK_SIZE, length))
    str += String.fromCharCode.apply(null, slice)
    index += CHUNK_SIZE
  }
  return btoa(str)
}

// String to uint array
IpfsBundle.prototype.StringToUint8Array = function (string) {
  var escstr = encodeURIComponent(string)
  var binstr = escstr.replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1)
  })
  var ua = new Uint8Array(binstr.length)
  Array.prototype.forEach.call(binstr, function (ch, i) {
    ua[i] = ch.charCodeAt(0)
  })
  return ua
}

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
/*
 * utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
IpfsBundle.prototype.Utf8ArrayToStr = function (array) {
  var c, char2, char3
  var out = ''
  var len = array.length
  var i = 0
  while (i < len) {
    c = array[i++]
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c)
        break
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++]
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f))
        break
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++]
        char3 = array[i++]
        out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0))
        break
    }
  }
  return out
}

IpfsBundle.prototype.deflate = function (str) {
  var tStart = new Date()
  var ua = globalThis.pako.deflate(str, { raw: false })
  var b64 = this.Uint8ArrayToBase64(ua)
  var tStop = new Date() - tStart
  var ratio = Math.floor((b64.length * 100) / str.length)
  this.getLogger().info(`Deflate: ${tStop}ms, In: ${str.length} bytes, Out: ${b64.length} bytes, Ratio: ${ratio}%`)
  return b64
}

IpfsBundle.prototype.inflate = function (b64) {
  var tStart = new Date()
  var ua = this.decode(b64)
  var str = globalThis.pako.inflate(ua, { to: 'string' })
  var tStop = new Date() - tStart
  var ratio = Math.floor((str.length * 100) / b64.length)
  this.getLogger().info(`Inflate: ${tStop}ms, In: ${b64.length} bytes, Out: ${str.length} bytes, Ratio: ${ratio}%`)
  return str
}

exports.IpfsBundle = IpfsBundle
