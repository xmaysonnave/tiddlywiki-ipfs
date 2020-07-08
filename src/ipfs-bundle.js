/*\
title: $:/plugins/ipfs/ipfs-bundle.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Bundle

\*/
import CID from 'cids'
import root from 'window-or-global'
import EnsLibrary from './ens-library'
import EthereumLibrary from './ethereum-library'
import IpfsLibrary from './ipfs-library'
import IpfsLoader from './ipfs-loader'
import IpfsUrl from './ipfs-url'
;(function () {
  'use strict'

  const cidAnalyser = 'https://cid.ipfs.io/#'

  /*eslint no-unused-vars:"off"*/
  const name = 'ipfs-bundle'

  var IpfsBundle = function () {
    this.once = false
  }

  IpfsBundle.prototype.getLogger = function () {
    if (root.logger !== undefined && root.logger !== null) {
      return root.logger
    }
    return console
  }

  IpfsBundle.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    this.ipfsLoader = new IpfsLoader(this)
    this.ethereumLibrary = new EthereumLibrary(this.ipfsLoader)
    this.ethereumLibrary.init()
    this.ensLibrary = new EnsLibrary(this.ethereumLibrary)
    this.ipfsLibrary = new IpfsLibrary(this)
    this.ipfsUrl = new IpfsUrl()
    // Init once
    this.once = true
  }

  IpfsBundle.prototype.getENSRegistry = function () {
    return this.ensLibrary.getENSRegistry()
  }

  IpfsBundle.prototype.getEtherscanRegistry = function () {
    return this.ethereumLibrary.getEtherscanRegistry()
  }

  IpfsBundle.prototype.getNetworkRegistry = function () {
    return this.ethereumLibrary.getNetworkRegistry()
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
    const etherscan = this.getEtherscanRegistry()
    const network = this.getNetworkRegistry()
    const provider = await this.getEthereumProvider()
    try {
      var {
        account,
        chainId,
        web3
      } = await this.ethereumLibrary.getEnabledWeb3Provider(provider)
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
 Account: ${etherscan[chainId]}/address/${account}`
    )
    return {
      account: account,
      chainId: chainId,
      provider: provider,
      web3: web3
    }
  }

  IpfsBundle.prototype.getWeb3Provider = async function () {
    var chainId = null
    var web3 = null
    const network = this.getNetworkRegistry()
    const provider = await this.getEthereumProvider()
    try {
      var { web3, chainId } = await this.ethereumLibrary.getWeb3Provider(
        provider
      )
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
      web3: web3
    }
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
  /*eslint no-useless-escape:"off"*/
  var Base64Binary = {
    _keyStr:
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
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
    }
  }

  IpfsBundle.prototype.isJson = function (content) {
    return this.ipfsLoader.isJson(content)
  }

  IpfsBundle.prototype.loadToBase64 = async function (url) {
    return await this.ipfsLoader.loadToBase64(url)
  }

  IpfsBundle.prototype.loadToUtf8 = async function (url) {
    return await this.ipfsLoader.loadToUtf8(url)
  }

  IpfsBundle.prototype.decodeCid = function (pathname) {
    // Check
    if (
      pathname === undefined ||
      pathname == null ||
      pathname.trim() === '' ||
      pathname.trim() === '/'
    ) {
      return {
        cid: null,
        ipnsIdentifier: null,
        protocol: null
      }
    }
    var identifier = null
    var protocol = null
    // Parse
    const members = pathname.trim().split('/')
    for (var i = 0; i < members.length; i++) {
      // Ignore
      if (members[i].trim() === '') {
        continue
      }
      // First non empty member
      if (protocol == null) {
        protocol = members[i]
        continue
      }
      // Second non empty member
      if (identifier == null) {
        identifier = members[i]
        break
      }
      // Nothing to process
      break
    }
    // Check
    if (protocol == null || identifier == null) {
      return {
        cid: null,
        ipnsIdentifier: null,
        protocol: null
      }
    }
    // Check protocol
    if (protocol !== 'ipfs' && protocol !== 'ipns') {
      return {
        cid: null,
        ipnsIdentifier: null,
        protocol: null
      }
    }
    // Check
    var cid = null
    var ipnsIdentifier = null
    if (protocol === 'ipns') {
      ipnsIdentifier = identifier
    } else if (this.isCid(identifier)) {
      cid = identifier
    }
    // All good
    return {
      cid: cid,
      ipnsIdentifier: ipnsIdentifier,
      protocol: protocol
    }
  }

  IpfsBundle.prototype.isCid = function (cid) {
    try {
      const newCid = new CID(cid)
      return CID.isCID(newCid)
    } catch (error) {
      return false
    }
  }

  IpfsBundle.prototype.cidV1ToCidV0 = function (cidv1) {
    var cidv0 = new CID(cidv1)
    if (cidv0.codec !== 'dag-pb') {
      throw new Error(
        `This "cid" is not "dag-pb" encoded: ${cidAnalyser}${cidv0}`
      )
    }
    if (cidv0.version === 1) {
      cidv0 = cidv0.toV0()
      // Log
      this.getLogger().info(
        `Converted:
 "cidv1" (Base32): ${cidAnalyser}${cidv1}
 to "cidv0" (Base58): ${cidAnalyser}${cidv0}`
      )
    } else {
      // Log
      this.getLogger().info(
        `"cidv0" (Base58):
 ${cidAnalyser}${cidv0}`
      )
    }
    return cidv0.toString()
  }

  IpfsBundle.prototype.cidV0ToCidV1 = function (cidv0) {
    var cidv1 = new CID(cidv0)
    if (cidv1.codec !== 'dag-pb') {
      throw new Error(
        `This "cid" is not "dag-pb" encoded: ${cidAnalyser}${cidv1}`
      )
    }
    if (cidv1.version === 0) {
      cidv1 = cidv1.toV1()
      this.getLogger().info(
        `Converted:
 "cidv0" (Base58): ${cidAnalyser}${cidv0}
 to "cidv1" (Base32): ${cidAnalyser}${cidv1}`
      )
    } else {
      // Log
      this.getLogger().info(
        `"cidv1" (Base32):
 ${cidAnalyser}${cidv1}`
      )
    }
    return cidv1.toString()
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
          out += String.fromCharCode(
            ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
          )
          break
      }
    }
    return out
  }

  module.exports = {
    IpfsBundle
  }
})()
