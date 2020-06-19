import root from 'window-or-global'
;(function () {
  /*jslint node: true, browser: true */
  'use strict'

  /*eslint no-unused-vars: "off"*/
  const name = 'ipfs-loader'

  const erudaUrl = 'https://cdn.jsdelivr.net/npm/eruda@2.3.3/eruda.min.js'
  const erudaSri =
    'sha384-O4NQOgwNPEet1/xZmB7hYYb/vMdpWyVJcqL+47zpRWuXtRlhwnEoNM/w3/C3HCoP'

  const ethersUrl =
    'https://cdn.jsdelivr.net/npm/ethers@5.0.2/dist/ethers.umd.min.js'
  const ethersSri =
    'sha384-XR63rSjgEtGAUiPqyr3lc6BAyN9JgrFKLrbnivkRp+xv3fE5XexgjsVM0x11x+9o'

  const ipfsHttpClientUrl =
    'https://cdn.jsdelivr.net/npm/ipfs-http-client@44.2.0/dist/index.min.js'
  const ipfsHttpClientSri =
    'sha384-3sSgHRREOld0O9S98mtIiJPvjhwVGtvmzRz4UjPcvACW4EnZasEpDONBWcsRF4y2'

  const threeBox = 'https://cdn.jsdelivr.net/npm/3box@1.20.0/dist/3box.min.js'
  const threeBoxSri =
    'sha384-VzJu0TkEIXQxpZoop25QZD9aggaqMVFzWA6GxwdwOjSG/D+4/BaEn8xHmz5otHP7'

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
  // https://github.com/liriliri/eruda
  IpfsLoader.prototype.loadErudaLibrary = async function () {
    if (typeof root.eruda === 'undefined') {
      var sourceUri = erudaUrl
      var sourceSri = erudaSri
      var title = '$:/ipfs/library/eruda'
      var tiddler = $tw.wiki.getTiddler(title)
      if (tiddler) {
        sourceUri = tiddler.getFieldString('_source_uri')
        sourceSri = tiddler.getFieldString('_source_sri')
      }
      await this.loadLibrary(title, sourceUri, sourceSri, true)
      if (typeof root.eruda !== 'undefined') {
        this.getLogger().info(`Loaded ${title}:\n ${sourceUri}`)
      }
    }
  }

  // https://www.srihash.org/
  // https://github.com/ethers-io/ethers.js/
  IpfsLoader.prototype.loadEtherJsLibrary = async function () {
    if (typeof root.ethers === 'undefined') {
      var sourceUri = ethersUrl
      var sourceSri = ethersSri
      var title = '$:/ipfs/library/ethers'
      var tiddler = $tw.wiki.getTiddler(title)
      if (tiddler) {
        sourceUri = tiddler.getFieldString('_source_uri')
        sourceSri = tiddler.getFieldString('_source_sri')
      }
      await this.loadLibrary(title, sourceUri, sourceSri, true)
      if (typeof root.ethers !== 'undefined') {
        this.getLogger().info(`Loaded ${title}:\n ${sourceUri}`)
      }
    }
  }

  // https://www.srihash.org/
  // https://github.com/ipfs/js-ipfs-http-client
  IpfsLoader.prototype.loadIpfsHttpLibrary = async function () {
    if (typeof root.IpfsHttpClient === 'undefined') {
      var sourceUri = ipfsHttpClientUrl
      var sourceSri = ipfsHttpClientSri
      var title = '$:/ipfs/library/ipfs-http-client'
      var tiddler = $tw.wiki.getTiddler(title)
      if (tiddler) {
        sourceUri = tiddler.getFieldString('_source_uri')
        sourceSri = tiddler.getFieldString('_source_sri')
      }
      await this.loadLibrary(title, sourceUri, sourceSri, true)
      if (typeof root.IpfsHttpClient !== 'undefined') {
        this.getLogger().info(`Loaded ${title}:\n ${sourceUri}`)
      }
    }
  }

  // https://www.srihash.org/
  // https://github.com/3box
  IpfsLoader.prototype.loadThreeBoxLibrary = async function () {
    if (typeof root.Box === 'undefined') {
      await this.loadLibrary('ThreeBoxLibrary', threeBox, threeBoxSri, true)
      if (typeof root.Box !== 'undefined') {
        this.getLogger().info(`Loaded ThreeBoxLibrary:\n ${threeBox}`)
      }
    }
  }

  /*eslint no-new: "off", no-new-func: "off"*/
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

  IpfsLoader.prototype.httpGetToUint8Array = function (url) {
    const self = this
    const xhr = new XMLHttpRequest()
    return new Promise(function (resolve, reject) {
      xhr.responseType = 'arraybuffer'
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status !== 0) {
          if (xhr.status >= 300) {
            reject(
              new Error($tw.language.getString('NetworkError/XMLHttpRequest'))
            )
            return
          }
          try {
            const array = new Uint8Array(this.response)
            self.getLogger().info(`[${xhr.status}] Loaded:\n ${url}`)
            resolve(array)
          } catch (error) {
            reject(error)
          }
        }
      }
      xhr.onerror = function () {
        reject(new Error($tw.language.getString('NetworkError/XMLHttpRequest')))
      }
      try {
        xhr.open('get', url, true)
        xhr.send()
      } catch (error) {
        reject(error)
      }
    })
  }

  /*
   * Load to Base64
   */
  IpfsLoader.prototype.loadToBase64 = async function (url) {
    const ua = await this.httpGetToUint8Array(url)
    if (ua.length === 0) {
      return {
        data: '',
        decrypted: false
      }
    }
    // Decrypt
    if (this.isUint8ArrayEncrypted(ua)) {
      const decrypted = await this.decryptUint8ArrayToBase64(ua)
      return {
        data: decrypted,
        decrypted: true
      }
    }
    const data = this.ipfsBundle.Uint8ArrayToBase64(ua)
    return {
      data: data,
      decrypted: false
    }
  }

  /*
   * Load to UTF-8
   */
  IpfsLoader.prototype.loadToUtf8 = async function (url) {
    var ua = await this.httpGetToUint8Array(url)
    if (ua.length === 0) {
      return {
        data: '',
        decrypted: false
      }
    }
    if (this.isUint8ArrayEncrypted(ua)) {
      return {
        data: await this.decryptUint8ArrayToUtf8(ua),
        decrypted: true
      }
    }
    return {
      data: this.ipfsBundle.Utf8ArrayToStr(ua),
      decrypted: false
    }
  }

  /*
   * Decrypt Uint8 Array to Base64 String
   */
  IpfsLoader.prototype.decryptUint8ArrayToBase64 = async function (array) {
    var data = this.ipfsBundle.Utf8ArrayToStr(array)
    if ($tw.crypto.hasPassword() === false) {
      data = await this.decryptFromPasswordPrompt(data)
    } else {
      data = $tw.crypto.decrypt(data, $tw.crypto.currentPassword)
    }
    return btoa(data)
  }

  /*
   * Decrypt Uint8 Array to UTF-8 String
   */
  IpfsLoader.prototype.decryptUint8ArrayToUtf8 = async function (array) {
    var data = this.ipfsBundle.Utf8ArrayToStr(array)
    if ($tw.crypto.hasPassword() === false) {
      data = await this.decryptFromPasswordPrompt(data)
    } else {
      data = $tw.crypto.decrypt(data, $tw.crypto.currentPassword)
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

  IpfsLoader.prototype.isUint8ArrayEncrypted = function (ua) {
    if (ua instanceof Uint8Array === false || ua.length === 0) {
      return false
    }
    const header = this.ipfsBundle.StringToUint8Array('{"iv":"')
    var encrypted = false
    for (var i = 0; i < ua.length && i < header.length; i++) {
      if (ua[i] === header[i]) {
        encrypted = true
      } else {
        encrypted = false
        break
      }
    }
    return encrypted
  }

  module.exports = IpfsLoader
})()
