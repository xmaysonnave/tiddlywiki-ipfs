/*\
title: $:/plugins/ipfs/ipfs-loader.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

\*/
'use strict'

const Mutex = require('async-mutex').Mutex

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
    await this.loadTiddlerLibrary('$:/ipfs/library/eruda', 'eruda')
  }
}

// https://github.com/ethers-io/ethers.js/
IpfsLoader.prototype.loadEtherJsLibrary = async function () {
  if (typeof globalThis.ethers === 'undefined') {
    await this.loadTiddlerLibrary('$:/ipfs/library/ethers', 'ethers')
  }
}

// https://github.com/xmaysonnave/eth-sig-util
IpfsLoader.prototype.loadEthSigUtilLibrary = async function () {
  if (typeof globalThis.sigUtil === 'undefined') {
    await this.loadTiddlerLibrary('$:/ipfs/library/eth-sig-util', 'sigUtil')
  }
}

// https://github.com/ipfs/js-ipfs-http-client
IpfsLoader.prototype.loadIpfsHttpLibrary = async function () {
  if (typeof globalThis.IpfsHttpClient === 'undefined') {
    await this.loadTiddlerLibrary('$:/ipfs/library/ipfs-http-client', 'IpfsHttpClient')
  }
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
IpfsLoader.prototype.loadTiddlerLibrary = async function (title, obj) {
  if (globalThis[obj] !== undefined && globalThis[obj] !== null) {
    return
  }
  const self = this
  const tiddler = $tw.wiki.getTiddler(title)
  if (tiddler === undefined || tiddler == null) {
    throw new Error(`Undefined Library: ${title}`)
  }
  const sourceUri = tiddler.fields._source_uri
  const sourceSri = tiddler.fields._source_sri
  const isModule = tiddler.fields._module === 'yes'
  await this.mutex.runExclusive(async () => {
    if (globalThis[obj] === undefined || globalThis[obj] == null) {
      const loaded = await self.loadLibrary(title, sourceUri, sourceSri, isModule)
      if (loaded !== undefined && loaded !== null && globalThis[obj] !== undefined && globalThis[obj] !== null) {
        self.getLogger().info(
          `Loaded ${title}:
 ${sourceUri}`
        )
        return
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
    script.onerror = () => {
      reject(new Error(`Failed to load: ${url}`))
      cleanup()
    }
    if (isModule) {
      script.type = 'module'
    } else {
      script.type = 'text/javascript'
    }
    script.id = id
    script.async = false
    script.defer = 'defer'
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

IpfsLoader.prototype.fetchUint8Array = async function (url) {
  var options = null
  const optionsController = new AbortController()
  const optionsId = globalThis.setTimeout(() => optionsController.abort(), $tw.utils.getLongTimeout())
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
  var fetchHeaders = {
    'Accept-Encoding': 'identity;q=0", *;q=0',
  }
  try {
    const params = {
      method: 'options',
      signal: optionsController.signal,
    }
    options = await fetch(url, params)
    if (options === undefined || options == null || options.ok === false) {
      throw new Error(`Unexpected response ${options.statusText}`)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      this.getLogger().error(`*** Timeout exceeded: ${$tw.utils.getLongTimeout()} ms ***`)
    } else {
      this.getLogger().error(`*** Options error: ${error.message} ***`)
    }
  }
  globalThis.clearTimeout(optionsId)
  try {
    const responseController = new AbortController()
    const responseId = globalThis.setTimeout(() => responseController.abort(), $tw.utils.getLongTimeout())
    // https://fetch.spec.whatwg.org/#cors-safelisted-method
    // https://fetch.spec.whatwg.org/#cors-safelisted-request-header
    const params = {
      headers: fetchHeaders,
      method: 'get',
      mode: 'cors',
      signal: responseController.signal,
    }
    var newUrl = null
    if (options && options.ok && options.url) {
      newUrl = new URL(options.url)
    }
    if (options && options.ok && newUrl == null && options.headers.get('Location') !== undefined) {
      newUrl = new URL(options.headers.get('Location'))
    }
    if (newUrl == null) {
      newUrl = url
    }
    const response = await fetch(newUrl, params)
    globalThis.clearTimeout(responseId)
    if (response === undefined || response == null || response.ok === false) {
      throw new Error(`Unexpected response ${response.statusText}`)
    }
    if ($tw.browser && !$tw.node) {
      const ab = await response.arrayBuffer()
      const ua = new Uint8Array(ab)
      this.getLogger().info(
        `[${response.status}] Loaded:
 ${response.url}`
      )
      return ua
    }
    return await response.buffer()
  } catch (error) {
    if (error.name === 'AbortError') {
      this.getLogger().error(`*** Timeout exceeded: ${$tw.utils.getLongTimeout()} ms ***`)
    } else {
      this.getLogger().error(`*** [${error.message}] ${$tw.language.getString('NetworkError/Fetch')} ***`)
    }
  }
  throw new Error(`${$tw.language.getString('NetworkError/Fetch')}`)
}

IpfsLoader.prototype.xhrToJson = async function (url) {
  return await this.httpRequest(url, 'post', 'json')
}

IpfsLoader.prototype.xhrToUint8Array = async function (url) {
  return await this.httpRequest(url, 'get', 'arraybuffer')
}

IpfsLoader.prototype.httpRequest = function (url, method, responseType) {
  const self = this
  const xhr = new XMLHttpRequest()
  return new Promise(function (resolve, reject) {
    xhr.responseType = responseType
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status !== 0) {
        if (xhr.status >= 300) {
          reject(new Error($tw.language.getString('NetworkError/Fetch')))
          return
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
          resolve(result)
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
      xhr.send()
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
IpfsLoader.prototype.loadToBase64 = async function (url, password) {
  url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
  const ua = await this.fetchUint8Array(url)
  if (ua === undefined || ua == null || ua.length === undefined || ua.length === 0) {
    return ''
  }
  var content = this.ipfsBundle.Utf8ArrayToStr(ua)
  if (content.match(/^{"compressed":/)) {
    const json = JSON.parse(content)
    if (json.compressed.match(/^{"iv":/)) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await $tw.boot.decryptFromPasswordPrompt(json.compressed)
      } else {
        content = $tw.crypto.decrypt(json.compressed, password)
      }
      content = this.ipfsBundle.inflate(content)
    } else if (json.compressed.match(/^{"version":/)) {
      if (json.signature) {
        const signature = await this.ipfsBundle.decrypt(json.signature)
        await this.checkMessage(json.compressed, json.keccak256, signature)
      }
      content = await this.ipfsBundle.decrypt(json.compressed)
      content = this.ipfsBundle.inflate(content)
    } else {
      content = this.ipfsBundle.inflate(json.compressed)
    }
  } else if (content.match(/^{"encrypted":/)) {
    const json = JSON.parse(content)
    if (json.signature) {
      const signature = await this.ipfsBundle.decrypt(json.signature)
      await this.checkMessage(json.encrypted, json.keccak256, signature)
    }
    content = await this.ipfsBundle.decrypt(json.encrypted)
    content = btoa(content)
  } else if (content.match(/^{"iv":/)) {
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
 * Load to UTF-8
 */
IpfsLoader.prototype.loadToUtf8 = async function (url, password) {
  url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
  const ua = await this.fetchUint8Array(url)
  if (ua === undefined || ua == null || ua.length === undefined || ua.length === 0) {
    return ''
  }
  var content = this.ipfsBundle.Utf8ArrayToStr(ua)
  if (content.match(/^{"compressed":/)) {
    const compressedStoreArea = $tw.utils.extractCompressedStoreArea(content)
    if (compressedStoreArea) {
      content = compressedStoreArea
    }
    const json = JSON.parse(content)
    if (json.compressed.match(/^{"iv":/)) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await $tw.boot.decryptFromPasswordPrompt(json.compressed)
      } else {
        content = $tw.crypto.decrypt(json.compressed, password)
      }
      content = this.ipfsBundle.inflate(content)
    } else if (json.compressed.match(/^{"version":/)) {
      if (json.signature) {
        const signature = await this.ipfsBundle.decrypt(json.signature)
        await this.checkMessage(json.compressed, json.keccak256, signature)
      }
      content = await this.ipfsBundle.decrypt(json.compressed)
      content = this.ipfsBundle.inflate(content)
    } else {
      content = this.ipfsBundle.inflate(json.compressed)
    }
  } else if (content.match(/^{"encrypted":/)) {
    const encryptedStoreArea = $tw.utils.extractEncryptedStoreArea(content)
    if (encryptedStoreArea) {
      content = encryptedStoreArea
    }
    const json = JSON.parse(content)
    if (json.signature) {
      const signature = await this.ipfsBundle.decrypt(json.signature)
      await this.checkMessage(json.encrypted, json.keccak256, signature)
    }
    content = await this.ipfsBundle.decrypt(json.encrypted)
  } else if (content.match(/^{"iv":/)) {
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

exports.IpfsLoader = IpfsLoader
