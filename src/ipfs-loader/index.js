import root from 'window-or-global'
;(function () {
  /*jslint node: true, browser: true */
  'use strict'

  const name = 'ipfs-loader'

  const eruda = 'https://cdn.jsdelivr.net/npm/eruda@2.3.3/eruda.min.js'
  const erudaSri =
    'sha384-O4NQOgwNPEet1/xZmB7hYYb/vMdpWyVJcqL+47zpRWuXtRlhwnEoNM/w3/C3HCoP'

  const ethers = 'https://cdn.jsdelivr.net/npm/ethers@4.0.47/dist/ethers.min.js'
  const ethersSri =
    'sha384-Gqf9kLa8S94/ZNsQCadoW0KeT6tg+fapxds7gOiSL72KeOtfgTOmHvJENrQljse5'

  const ipfsHttpClient =
    'https://cdn.jsdelivr.net/npm/ipfs-http-client@44.1.0/dist/index.min.js'
  const ipfsHttpClientSri =
    'sha384-XM/m03twISxLXe8YfqF608r2BJO8wHg2iAuPq2xRKxE42CIEn+9c61x9HcgqD0QI'

  var IpfsLoader = function (ipfsBundle) {
    this.ipfsBundle = ipfsBundle
  }

  IpfsLoader.prototype.getLogger = function () {
    return root.log.getLogger(name)
  }

  // https://www.srihash.org/
  // https://github.com/liriliri/eruda
  IpfsLoader.prototype.loadErudaLibrary = async function () {
    if (typeof root.eruda === 'undefined') {
      await this.loadLibrary('ErudaLibrary', eruda, erudaSri, true)
      if (typeof root.eruda !== 'undefined') {
        this.getLogger().info(`Loaded ErudaLibrary:\n ${eruda}`)
      }
    }
  }

  // https://www.srihash.org/
  // https://github.com/ethers-io/ethers.js/
  IpfsLoader.prototype.loadEtherJsLibrary = async function () {
    if (typeof root.ethers === 'undefined') {
      await this.loadLibrary('EtherJsLibrary', ethers, ethersSri, true)
      if (typeof root.ethers !== 'undefined') {
        this.getLogger().info(`Loaded EtherJsLibrary:\n ${ethers}`)
      }
    }
  }

  // https://www.srihash.org/
  // https://github.com/ipfs/js-ipfs-http-client
  IpfsLoader.prototype.loadIpfsHttpLibrary = async function () {
    if (typeof root.IpfsHttpClient === 'undefined') {
      await this.loadLibrary(
        'IpfsHttpLibrary',
        ipfsHttpClient,
        ipfsHttpClientSri,
        true
      )
      if (typeof root.IpfsHttpClient !== 'undefined') {
        this.getLogger().info(`Loaded IpfsHttpLibrary:\n ${ipfsHttpClient}`)
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
    const array = await this.httpGetToUint8Array(url)
    if (array.length === 0) {
      return {
        data: '',
        decrypted: false
      }
    }
    // Decrypt
    if (this.isUtf8ArrayEncrypted(array)) {
      const decrypted = await this.decryptUint8ArrayToBase64(array)
      return {
        data: decrypted,
        decrypted: true
      }
    }
    const data = this.ipfsBundle.Uint8ArrayToBase64(array)
    return {
      data: data,
      decrypted: false
    }
  }

  /*
   * Load to UTF-8
   */
  IpfsLoader.prototype.loadToUtf8 = async function (url) {
    var array = await this.httpGetToUint8Array(url)
    if (array.length === 0) {
      return {
        data: '',
        decrypted: false
      }
    }
    if (this.isUtf8ArrayEncrypted(array)) {
      return {
        data: await this.decryptUint8ArrayToUtf8(array),
        decrypted: true
      }
    }
    return {
      data: this.ipfsBundle.Utf8ArrayToStr(array),
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

  IpfsLoader.prototype.isUtf8ArrayEncrypted = function (content) {
    // Check
    if (content instanceof Uint8Array === false || content.length === 0) {
      return false
    }
    // Process
    const standford = this.ipfsBundle.StringToUint8Array('{"iv":"')
    var encrypted = false
    for (var i = 0; i < content.length && i < standford.length; i++) {
      if (content[i] === standford[i]) {
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
