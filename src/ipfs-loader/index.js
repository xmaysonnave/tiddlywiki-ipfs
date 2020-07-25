import root from 'window-or-global'
import { URL } from 'whatwg-url'
;(function () {
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ipfs-loader'

  var IpfsLoader = function (ipfsBundle) {
    this.ipfsBundle = ipfsBundle
  }

  IpfsLoader.prototype.getLogger = function () {
    if (root.logger !== undefined && root.logger !== null) {
      return root.logger
    }
    return console
  }

  // https://www.srihash.org/
  IpfsLoader.prototype.loadTiddlerLibrary = async function (
    title,
    obj,
    module
  ) {
    if (root[obj] === undefined) {
      const tiddler = $tw.wiki.getTiddler(title)
      if (tiddler) {
        const sourceUri = tiddler.getFieldString('_source_uri')
        const sourceSri = tiddler.getFieldString('_source_sri')
        const loaded = await this.loadLibrary(
          title,
          sourceUri,
          sourceSri,
          module
        )
        if (loaded !== undefined && root[obj] !== undefined) {
          this.getLogger().info(
            `Loaded ${title}:
 ${sourceUri}`
          )
          return
        }
        throw new Error(`Unable to load Library: ${title}`)
      }
      throw new Error(`Undefined Library: ${title}`)
    }
  }

  // https://github.com/liriliri/eruda
  IpfsLoader.prototype.loadErudaLibrary = async function () {
    if (typeof root.eruda === 'undefined') {
      await this.loadTiddlerLibrary('$:/ipfs/library/eruda', 'eruda', true)
    }
  }

  // https://github.com/ethers-io/ethers.js/
  IpfsLoader.prototype.loadEtherJsLibrary = async function () {
    if (typeof root.ethers === 'undefined') {
      await this.loadTiddlerLibrary('$:/ipfs/library/ethers', 'ethers', true)
    }
  }

  // https://github.com/ipfs/js-ipfs-http-client
  IpfsLoader.prototype.loadIpfsHttpLibrary = async function () {
    if (typeof root.IpfsHttpClient === 'undefined') {
      await this.loadTiddlerLibrary(
        '$:/ipfs/library/ipfs-http-client',
        'IpfsHttpClient',
        true
      )
    }
  }

  /*eslint no-new:"off",no-new-func:"off"*/
  IpfsLoader.prototype.supportDynamicImport = function () {
    try {
      new Function('import("")')
      return true
    } catch (error) {
      return false
    }
  }

  // https://observablehq.com/@bryangingechen/dynamic-import-polyfill
  IpfsLoader.prototype.loadLibrary = function (id, url, sri, asModule) {
    // Dynamic import
    // if (this.supportDynamicImport()) {
    //   try {
    //     return new Function(`return import("${url}")`)();
    //   } catch (error) {
    //     // Ignore
    //   }
    // }
    const self = this
    return new Promise((resolve, reject) => {
      // Process
      const script = root.document.createElement('script')
      // Functions
      const cleanup = () => {
        try {
          delete root[id]
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
        resolve(root[id])
        cleanup()
      }
      script.onerror = () => {
        reject(new Error(`Failed to load: ${url}`))
        cleanup()
      }
      // Attributes
      if (asModule) {
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
      // URL
      script.src = url
      // Load
      root.document.head.appendChild(script)
    })
  }

  IpfsLoader.prototype.isJson = function (content) {
    if (
      content !== undefined &&
      content !== null &&
      typeof content === 'string'
    ) {
      try {
        JSON.parse(content)
        return true
      } catch (error) {
        // Ignore
      }
    }
    return false
  }

  IpfsLoader.prototype.xhrToJson = async function (url) {
    return await this.httpGet(url, 'post', 'json')
  }

  IpfsLoader.prototype.xhrToUint8Array = function (url) {
    return this.httpGet(url, 'get', 'arraybuffer')
  }

  IpfsLoader.prototype.httpGet = function (url, method, responseType) {
    const self = this
    const xhr = new XMLHttpRequest()
    return new Promise(function (resolve, reject) {
      xhr.responseType = responseType
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status !== 0) {
          if (xhr.status >= 300) {
            reject(
              new Error($tw.language.getString('NetworkError/XMLHttpRequest'))
            )
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
 ${url}`
            )
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }
      }
      xhr.onerror = function () {
        reject(new Error($tw.language.getString('NetworkError/XMLHttpRequest')))
      }
      try {
        xhr.open(method, url, true)
        xhr.send()
      } catch (error) {
        reject(error)
      }
    })
  }

  /*
   * Load to Base64
   */
  IpfsLoader.prototype.loadToBase64 = async function (url, password) {
    if (url === undefined || url == null || url.toString().trim() === '') {
      throw new Error('Undefined URL...')
    }
    if (url instanceof URL) {
      url = url.href
    }
    password =
      password === undefined || password == null || password.trim() === ''
        ? null
        : password.trim()
    const ua = await this.xhrToUint8Array(url)
    if (ua.length === 0) {
      return ''
    }
    var data = this.ipfsBundle.Utf8ArrayToStr(ua)
    if (data.startsWith('{"pako":')) {
      const json = JSON.parse(data)
      if (json.pako.startsWith('{"iv":')) {
        if (password == null && $tw.crypto.hasPassword() === false) {
          data = await this.decryptFromPasswordPrompt(json.pako)
        } else {
          data = $tw.crypto.decrypt(json.pako, password)
        }
        data = $tw.compress.inflate(data)
      } else if (json.pako.startsWith('{"version":')) {
        data = await $tw.ipfs.decrypt(json.pako)
        data = $tw.compress.inflate(data)
      } else {
        data = $tw.compress.inflate(json.pako)
      }
    } else if (data.startsWith('{"iv":')) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        data = await this.decryptFromPasswordPrompt(data)
      } else {
        data = $tw.crypto.decrypt(data, password)
      }
      data = btoa(data)
    } else if (data.startsWith('{"version":')) {
      data = await $tw.ipfs.decrypt(data)
      data = btoa(data)
    } else {
      data = this.ipfsBundle.Uint8ArrayToBase64(ua)
    }
    return data
  }

  /*
   * Load to UTF-8
   */
  IpfsLoader.prototype.loadToUtf8 = async function (url, password) {
    if (url === undefined || url == null || url.toString().trim() === '') {
      throw new Error('Undefined URL...')
    }
    if (url instanceof URL) {
      url = url.href
    }
    password =
      password === undefined || password == null || password.trim() === ''
        ? null
        : password.trim()
    var ua = await this.xhrToUint8Array(url)
    if (ua.length === 0) {
      return ''
    }
    var data = this.ipfsBundle.Utf8ArrayToStr(ua)
    if (data.startsWith('{"pako":')) {
      const json = JSON.parse(data)
      if (json.pako.startsWith('{"iv":')) {
        if (password == null && $tw.crypto.hasPassword() === false) {
          data = await this.decryptFromPasswordPrompt(json.pako)
        } else {
          data = $tw.crypto.decrypt(json.pako, password)
        }
        data = $tw.compress.inflate(data)
      } else if (json.pako.startsWith('{"version":')) {
        data = await $tw.ipfs.decrypt(json.pako)
        data = $tw.compress.inflate(data)
      } else {
        data = $tw.compress.inflate(json.pako)
      }
    } else if (data.startsWith('{"iv":')) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        data = await this.decryptFromPasswordPrompt(data)
      } else {
        data = $tw.crypto.decrypt(data, password)
      }
    } else if (data.startsWith('{"version":')) {
      data = await $tw.ipfs.decrypt(data)
    }
    return data
  }

  IpfsLoader.prototype.decryptFromPasswordPrompt = function (encrypted) {
    return new Promise((resolve, reject) => {
      $tw.passwordPrompt.createPrompt({
        serviceName: 'Enter a password to decrypt the imported content!!',
        noUserName: true,
        canCancel: true,
        submitText: 'Decrypt',
        callback: function (data) {
          if (!data) {
            return false
          }
          // Decrypt
          try {
            const content = $tw.crypto.decrypt(encrypted, data.password)
            resolve(content)
            return true
          } catch (error) {
            reject(error)
          }
          return false
        }
      })
    })
  }

  module.exports = IpfsLoader
})()
