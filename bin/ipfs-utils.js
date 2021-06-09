#!/usr/bin/env node
'use strict'

const fetch = require('node-fetch')

const IpfsBundle = require('core/modules/library/ipfs-bundle.js').IpfsBundle

const shortTimeout = 6000
const longTimeout = 4 * 60 * shortTimeout

module.exports = class IpfsUtils {
  constructor () {
    this.ipfsBundle = new IpfsBundle()
    this.ipfsBundle.init()
  }

  async dagPut (api, links, timeout) {
    const dagNode = {
      Data: this.ipfsBundle.StringToUint8Array('\u0008\u0001'),
      Links: [],
    }
    if (links !== undefined && links !== null) {
      dagNode.Links = links
    }
    timeout = timeout !== undefined && timeout !== null ? timeout : longTimeout
    const options = {
      format: 'dag-pb',
      hashAlg: 'sha2-256',
      pin: false,
      timeout: timeout,
    }
    return await this.ipfsBundle.dagPut(api, dagNode, options)
  }

  async loadFromIpfs (url, timeout) {
    if (url instanceof URL === false) {
      url = new URL(url)
    }
    timeout = timeout !== undefined && timeout !== null ? timeout : longTimeout
    try {
      const responseController = new AbortController()
      const responseId = setTimeout(() => responseController.abort(), timeout)
      // https://fetch.spec.whatwg.org/#cors-safelisted-method
      // https://fetch.spec.whatwg.org/#cors-safelisted-request-header
      var params = {
        method: 'get',
        mode: 'cors',
        signal: responseController.signal,
      }
      var response = await fetch(url, params)
      globalThis.clearTimeout(responseId)
      if (response === undefined || response == null || response.ok === false) {
        throw new Error(`Unexpected response ${response.statusText}`)
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
        console.error(`*** Timeout exceeded: ${timeout} ms ***`)
      } else {
        console.error(`*** Fetch error: ${error.message} ***`)
      }
    }
    return null
  }
}
