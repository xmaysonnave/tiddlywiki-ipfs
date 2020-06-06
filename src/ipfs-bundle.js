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
import IpfsLibrary from './ipfs-library'
import IpfsLoader from './ipfs-loader'
import IpfsUrl from './ipfs-url'
import BoxLibrary from './box-library'
;(function () {
  /*jslint node: true, browser: true*/
  'use strict'

  const cidAnalyser = 'https://cid.ipfs.io/#'

  const name = 'ipfs-bundle'

  var IpfsBundle = function () {
    this.once = false
  }

  IpfsBundle.prototype.getLogger = function () {
    return root.log.getLogger(name)
  }

  IpfsBundle.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    this.ipfsLoader = new IpfsLoader(this)
    this.ensLibrary = new EnsLibrary(this.ipfsLoader)
    this.ipfsLibrary = new IpfsLibrary(this)
    this.ipfsUrl = new IpfsUrl()
    this.boxLibrary = new BoxLibrary(this.ipfsLoader)
    // Init once
    this.once = true
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
        `Converted:\n "cidv1" (Base32): ${cidAnalyser}${cidv1} \n to "cidv0" (Base58): ${cidAnalyser}${cidv0}`
      )
    } else {
      // Log
      this.getLogger().info(`"cidv0" (Base58):\n ${cidAnalyser}${cidv0}`)
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
        `Converted:\n "cidv0" (Base58): ${cidAnalyser}${cidv0} \n to "cidv1" (Base32): ${cidAnalyser}${cidv1}`
      )
    } else {
      // Log
      this.getLogger().info(`"cidv1" (Base32):\n ${cidAnalyser}${cidv1}`)
    }
    return cidv1.toString()
  }

  IpfsBundle.prototype.Base64ToUint8Array = function (base64) {
    var raw = atob(base64)
    var ua = new Uint8Array(raw.length)
    for (var i = 0; i < raw.length; i++) {
      ua[i] = raw.charCodeAt(i)
    }
    return ua
  }

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
