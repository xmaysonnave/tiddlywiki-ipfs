/*\
title: $:/plugins/ipfs/ipfs-loader.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

\*/
'use strict'

const { Mutex } = require('async-mutex')

var IpfsLoader = function (ipfsBundle) {
  this.ipfsBundle = ipfsBundle
  this.mutex = new Mutex()
  this.name = 'ipfs-loader'
}

IpfsLoader.prototype.getLogger = function () {
  return this.ipfsBundle.getLogger()
}

// https://github.com/liriliri/eruda
IpfsLoader.prototype.loadErudaLibrary = async function () {
  if (typeof globalThis.eruda === 'undefined') {
    return await this.loadTiddlerLibrary('$:/library/eruda.min.js', 'eruda', true)
  }
  return globalThis.eruda
}

// https://github.com/ethers-io/ethers.js/
IpfsLoader.prototype.loadEthersLibrary = async function () {
  if (typeof globalThis.ethers === 'undefined') {
    return await this.loadTiddlerLibrary('$:/library/ethers.umd.min.js', 'ethers', true)
  }
  return globalThis.ethers
}

// https://github.com/ipfs/js-ipfs-http-client
IpfsLoader.prototype.loadIpfsHttpLibrary = async function () {
  if (typeof globalThis.IpfsHttpClient === 'undefined') {
    return await this.loadTiddlerLibrary('$:/library/ipfs-http-client.min.js', 'IpfsHttpClient', true)
  }
  return globalThis.IpfsHttpClient
}

// https://gist.github.com/ebidel/3201b36f59f26525eb606663f7b487d0
IpfsLoader.prototype.supportDynamicImport = function () {
  try {
    /*eslint no-new:"off",no-new-func:"off"*/
    new Function('import("")')
    return true
  } catch (error) {
    return false
  }
}

// https://www.srihash.org/
IpfsLoader.prototype.loadTiddlerLibrary = async function (title, obj, isModule) {
  if (globalThis[obj] !== undefined && globalThis[obj] !== null && Object.keys(globalThis[obj]).length !== 0) {
    return globalThis[obj]
  }
  const self = this
  const tiddler = $tw.wiki.getTiddler(title)
  if (tiddler === undefined || tiddler == null) {
    throw new Error(`Undefined Library: ${title}`)
  }
  const sourceUri = tiddler.fields._source_uri || tiddler.fields._canonical_uri
  const sourceSri = tiddler.fields._source_sri || tiddler.fields._canonical_sri
  await this.mutex.runExclusive(async () => {
    if (globalThis[obj] === undefined || globalThis[obj] == null || Object.keys(globalThis[obj]).length === 0) {
      const loaded = await self.loadLibrary(title, sourceUri, sourceSri, isModule)
      if (loaded !== undefined && loaded !== null && globalThis[obj] !== undefined && globalThis[obj] !== null && Object.keys(globalThis[obj]).length !== 0) {
        self.getLogger().info(
          `Loaded ${title}:
 ${sourceUri}`
        )
        return globalThis[obj]
      }
      throw new Error(`Unable to load Library: ${title}`)
    }
  })
}

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
IpfsLoader.prototype.loadLibrary = function (id, url, sri, isModule) {
  const self = this
  return new Promise((resolve, reject) => {
    const script = globalThis.document.createElement('script')
    const cleanup = () => {
      try {
        delete globalThis[id]
        script.onerror = null
        script.onload = null
        script.remove()
        URL.revokeObjectURL(script.src)
        script.src = ''
      } catch (error) {
        self.getLogger().error(error)
      }
    }
    script.onload = () => {
      resolve(globalThis[id])
      cleanup()
    }
    script.onerror = event => {
      reject(new Error(`[${event.target.status}] Failed to load: ${url}`))
      cleanup()
    }
    if (isModule) {
      script.type = 'module'
    } else {
      script.type = 'text/javascript'
    }
    script.id = id
    script.async = false
    if (sri) {
      script.integrity = sri
    }
    script.crossOrigin = 'anonymous'
    script.src = url
    // Load
    globalThis.document.head.appendChild(script)
  })
}

IpfsLoader.prototype.isJson = function (content) {
  if (content !== undefined && content !== null && typeof content === 'string') {
    try {
      JSON.parse(content)
      return true
    } catch (error) {
      // Ignore
    }
  }
  return false
}

IpfsLoader.prototype.fetchOptions = async function (url, timeout) {
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
      this.getLogger().error(`*** Options Timeout: ${url} ***`)
    } else {
      this.getLogger().error(`*** Options Error: ${error.message} ***`)
    }
  } finally {
    globalThis.clearTimeout(optionsId)
  }
  return options
}

IpfsLoader.prototype.fetchUint8Array = async function (url, timeout) {
  url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : $tw.utils.getLongTimeout()
  const responseController = new AbortController()
  const responseId = globalThis.setTimeout(() => responseController.abort(), timeout)
  try {
    // https://fetch.spec.whatwg.org/#cors-safelisted-method
    // https://fetch.spec.whatwg.org/#cors-safelisted-request-header
    const params = {
      method: 'get',
      mode: 'cors',
      signal: responseController.signal,
    }
    const response = await fetch(url, params)
    if (response.ok === false) {
      throw new Error(`Unexpected response: [${response.status}], [${response.statusText}], ${url}`)
    }
    const location = response.headers.get('Location') || null
    if ($tw.browser && !$tw.node) {
      const ab = await response.arrayBuffer()
      const ua = new Uint8Array(ab)
      var type = response.headers.get('Content-Type')
      if (type) {
        const types = type.split(';')
        if (types.length > 0) {
          type = types[0].trim()
        }
      }
      this.getLogger().info(
        `#ipfs-loader# Fetched, status: [${response.status}], type: ${type}, size: ${ua.length}:
 ${response.url}`
      )
      return {
        content: ua,
        location: location,
        type: type,
      }
    }
    const buffer = await response.buffer()
    var type = response.headers.get('Content-Type')
    if (type) {
      const types = type.split(';')
      if (types.length > 0) {
        type = types[0].trim()
      }
    }
    $tw.boot.getLogger().info(
      `#ipfs-loader# Fetched, status: [${response.status}], type: ${type}, size: ${buffer.length}:
 ${response.url}`
    )
    return {
      content: buffer,
      location: location,
      type: type,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      this.getLogger().error(`*** Fetch Timeout: ${url} ***`)
    } else {
      this.getLogger().error(`*** Fetch Error: ${error.message} ***`)
    }
  } finally {
    globalThis.clearTimeout(responseId)
  }
  throw new Error(`${$tw.language.getString('NetworkError/Fetch')}`)
}

IpfsLoader.prototype.xhrToJson = async function (url) {
  return await this.httpRequest(url, 'POST', 'json')
}

IpfsLoader.prototype.xhrToUint8Array = async function (url) {
  return await this.httpRequest(url, 'GET', 'arraybuffer')
}

IpfsLoader.prototype.httpRequest = function (url, method, responseType) {
  const self = this
  const xhr = new XMLHttpRequest()
  return new Promise(function (resolve, reject) {
    xhr.responseType = responseType
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status !== 0) {
        if (xhr.status >= 300) {
          throw new Error(`[${xhr.status}] ${$tw.language.getString('NetworkError/Fetch')}`)
        }
        try {
          var result = null
          if (responseType === 'arraybuffer') {
            result = new Uint8Array(this.response)
          } else {
            result = this.response
          }
          self.getLogger().info(
            `[${xhr.status}] Loaded:
 ${xhr.responseURL}`
          )
          const data = {
            content: result,
            type: xhr.getResponseHeader('Content-Type'),
          }
          resolve(data)
        } catch (error) {
          reject(error)
        }
      }
    }
    xhr.onerror = function () {
      reject(new Error($tw.language.getString('NetworkError/Fetch')))
    }
    try {
      xhr.open(method, url, true)
      xhr.send(null)
    } catch (error) {
      reject(error)
    }
  })
}

IpfsLoader.prototype.checkMessage = async function (message, keccak256, signature) {
  message = message !== undefined && message !== null && message.trim() !== '' ? message.trim() : null
  if (message == null) {
    throw new Error('Undefined encrypted content...')
  }
  if (keccak256) {
    const hash = $tw.crypto.keccak256(message)
    if (keccak256 !== hash) {
      throw new Error('Tampered encrypted content, signature do not match...')
    }
  }
  if (signature) {
    try {
      const recovered = await this.ipfsBundle.personalRecover(keccak256, signature)
      this.getLogger().info(`Signed from: https://app.ens.domains/address/${recovered}`)
      $tw.utils.alert(
        this.name,
        `Signed from: <a class="tc-tiddlylink-external" rel="noopener noreferrer" target="_blank" href="https://app.ens.domains/address/${recovered}">${recovered}</a>`
      )
    } catch (error) {
      if (error.name === 'UnrecoverableSignature') {
        throw new Error(`Tampered encrypted content. ${error.message}`)
      }
      throw error
    }
  }
}

/**
 * Load to Base64
 */
IpfsLoader.prototype.loadContentToBase64 = async function (ua, password) {
  var parse = function (content) {
    var json = null
    try {
      json = JSON.parse(content)
    } catch (error) {
      // ignore
    }
    return json
  }
  ua = ua !== undefined && ua !== null && ua.length !== undefined && ua.length !== 0 ? ua : null
  if (ua == null) {
    return ''
  }
  password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
  var content = this.ipfsBundle.Utf8ArrayToStr(ua)
  var json = parse(content)
  if (json !== null && json.compressed !== undefined) {
    const encrypted = parse(json.compressed)
    if (encrypted !== null && encrypted.iv) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await $tw.boot.decryptFromPasswordPrompt(json.compressed)
      } else {
        content = $tw.crypto.decrypt(json.compressed, password)
      }
      content = this.ipfsBundle.inflate(content)
    } else if (encrypted !== null && encrypted.version) {
      if (json.signature) {
        const signature = await this.ipfsBundle.decrypt(json.signature)
        await this.checkMessage(json.compressed, json.keccak256, signature)
      }
      content = await this.ipfsBundle.decrypt(json.compressed)
      content = this.ipfsBundle.inflate(content)
    } else {
      content = this.ipfsBundle.inflate(json.compressed)
    }
  } else if (json !== null && json.encrypted !== undefined) {
    const json = JSON.parse(content)
    if (json.signature) {
      const signature = await this.ipfsBundle.decrypt(json.signature)
      await this.checkMessage(json.encrypted, json.keccak256, signature)
    }
    content = await this.ipfsBundle.decrypt(json.encrypted)
    content = btoa(content)
  } else if (json !== null && json.iv !== undefined) {
    if (password == null && $tw.crypto.hasPassword() === false) {
      content = await $tw.boot.decryptFromPasswordPrompt(content)
    } else {
      content = $tw.crypto.decrypt(content, password)
    }
    content = btoa(content)
  } else {
    content = this.ipfsBundle.Uint8ArrayToBase64(ua)
  }
  return content
}

/**
 * Load to Base64
 */
IpfsLoader.prototype.loadToBase64 = async function (url, password) {
  url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
  var content = null
  var type = null
  if (url.toString().startsWith('file:') || url.toString().startsWith('blob:')) {
    var { content, type } = await this.xhrToUint8Array(url)
  } else {
    var { content, type } = await this.fetchUint8Array(url)
  }
  if (content === undefined || content == null || content.length === undefined || content.length === 0) {
    return {
      content: '',
      type: type,
    }
  }
  content = await this.loadContentToBase64(content, password)
  return {
    content: content,
    type: type,
  }
}

/**
 * Load to UTF-8
 */
IpfsLoader.prototype.loadContentToUtf8 = async function (ua, password) {
  var parse = function (content) {
    var json = null
    try {
      json = JSON.parse(content)
    } catch (error) {
      // ignore
    }
    return json
  }
  ua = ua !== undefined && ua !== null && ua.length !== undefined && ua.length !== 0 ? ua : null
  if (ua == null) {
    return ''
  }
  password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
  var content = this.ipfsBundle.Utf8ArrayToStr(ua)
  var json = parse(content)
  if (json !== null && json.compressed !== undefined) {
    const encrypted = parse(json.compressed)
    if (encrypted !== null && encrypted.iv !== undefined) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await $tw.boot.decryptFromPasswordPrompt(json.compressed)
      } else {
        content = $tw.crypto.decrypt(json.compressed, password)
      }
      content = this.ipfsBundle.inflate(content)
    } else if (encrypted !== null && encrypted.compressed !== undefined) {
      if (json.signature) {
        const signature = await this.ipfsBundle.decrypt(json.signature)
        await this.checkMessage(json.compressed, json.keccak256, signature)
      }
      content = await this.ipfsBundle.decrypt(json.compressed)
      content = this.ipfsBundle.inflate(content)
    } else {
      content = this.ipfsBundle.inflate(json.compressed)
    }
  } else if (json !== null && json.encrypted !== undefined) {
    if (json.signature) {
      const signature = await this.ipfsBundle.decrypt(json.signature)
      await this.checkMessage(json.encrypted, json.keccak256, signature)
    }
    content = await this.ipfsBundle.decrypt(json.encrypted)
  } else if (json !== null && json.iv !== undefined) {
    const encryptedStoreArea = $tw.utils.extractEncryptedStoreArea(content)
    if (encryptedStoreArea) {
      content = encryptedStoreArea
    }
    if (password == null && $tw.crypto.hasPassword() === false) {
      content = await $tw.boot.decryptFromPasswordPrompt(content)
    } else {
      content = $tw.crypto.decrypt(content, password)
    }
  }
  return content
}

/**
 * Load to UTF-8
 */
IpfsLoader.prototype.loadToUtf8 = async function (url, password) {
  url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
  var content = null
  var type = null
  if (url.toString().startsWith('file:') || url.toString().startsWith('blob:')) {
    var { content, type } = await this.xhrToUint8Array(url)
  } else {
    var { content, type } = await this.fetchUint8Array(url)
  }
  if (content === undefined || content == null || content.length === undefined || content.length === 0) {
    return {
      content: '',
      type: type,
    }
  }
  content = await this.loadContentToUtf8(content, password)
  return {
    content: content,
    type: type,
  }
}

exports.IpfsLoader = IpfsLoader
