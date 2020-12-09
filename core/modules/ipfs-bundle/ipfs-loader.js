'use strict'

var IpfsLoader = function (ipfsBundle) {
  this.ipfsBundle = ipfsBundle
  this.name = 'ipfs-loader'
}

IpfsLoader.prototype.getLogger = function () {
  return this.ipfsBundle.getLogger()
}

// https://www.srihash.org/
IpfsLoader.prototype.loadTiddlerLibrary = async function (title, obj, module) {
  if (globalThis[obj] === undefined) {
    const tiddler = $tw.wiki.getTiddler(title)
    if (tiddler) {
      const sourceUri = tiddler.fields._source_uri
      const sourceSri = tiddler.fields._source_sri
      const loaded = await this.loadLibrary(title, sourceUri, sourceSri, module)
      if (loaded !== undefined && globalThis[obj] !== undefined) {
        this.getLogger().info(
          `Loaded ${title}:
${sourceUri}`
        )
        return true
      }
      throw new Error(`Unable to load Library: ${title}`)
    }
    throw new Error(`Undefined Library: ${title}`)
  }
  return false
}

// https://github.com/liriliri/eruda
IpfsLoader.prototype.loadErudaLibrary = async function () {
  if (typeof globalThis.eruda === 'undefined') {
    return await this.loadTiddlerLibrary('$:/ipfs/library/eruda', 'eruda', true)
  }
  return false
}

// https://github.com/ethers-io/ethers.js/
IpfsLoader.prototype.loadEtherJsLibrary = async function () {
  if (typeof globalThis.ethers === 'undefined') {
    return await this.loadTiddlerLibrary(
      '$:/ipfs/library/ethers',
      'ethers',
      true
    )
  }
  return false
}

// https://github.com/xmaysonnave/eth-sig-util
IpfsLoader.prototype.loadEthSigUtilLibrary = async function () {
  if (typeof globalThis.sigUtil === 'undefined') {
    return await this.loadTiddlerLibrary(
      '$:/ipfs/library/eth-sig-util',
      'sigUtil',
      true
    )
  }
  return false
}

// https://github.com/ipfs/js-ipfs-http-client
IpfsLoader.prototype.loadIpfsHttpLibrary = async function () {
  if (typeof globalThis.IpfsHttpClient === 'undefined') {
    await this.loadTiddlerLibrary(
      '$:/ipfs/library/ipfs-http-client',
      'IpfsHttpClient',
      true
    )
  }
  return false
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
    const script = globalThis.document.createElement('script')
    // Functions
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
    globalThis.document.head.appendChild(script)
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

IpfsLoader.prototype.fetchUint8Array = async function (url) {
  try {
    const response = await fetch(url)
    if (response.ok) {
      const ab = await response.arrayBuffer()
      const ua = new Uint8Array(ab)
      this.getLogger().info(
        `[${response.status}] Loaded:
  ${response.url}`
      )
      return ua
    }
    throw new Error(
      `[${response.status}] ${$tw.language.getString('NetworkError/Fetch')}`
    )
  } catch (error) {
    this.getLogger().error(error)
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

IpfsLoader.prototype.checkMessage = async function (
  message,
  keccak256,
  signature
) {
  message =
    message === undefined || message == null || message.trim() === ''
      ? null
      : message.trim()
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
      const recovered = await this.ipfsBundle.personalRecover(
        keccak256,
        signature
      )
      $tw.ipfs
        .getLogger()
        .info(`Signed from: https://app.ens.domains/address/${recovered}`)
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
  url =
    url === undefined || url == null || url.toString().trim() === ''
      ? null
      : url.toString().trim()
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  password =
    password === undefined || password == null || password.trim() === ''
      ? null
      : password.trim()
  const ua = await this.fetchUint8Array(url)
  if (ua.length === 0) {
    return ''
  }
  var content = this.ipfsBundle.Utf8ArrayToStr(ua)
  if (content.match(/{"compressed":/)) {
    const json = JSON.parse(content)
    if (json.compressed.match(/{"iv":/)) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await this.decryptFromPasswordPrompt(json.compressed)
      } else {
        content = $tw.crypto.decrypt(json.compressed, password)
      }
      content = this.ipfsBundle.inflate(content)
    } else if (json.compressed.match(/{"version":/)) {
      if (json.signature) {
        const signature = await this.ipfsBundle.decrypt(json.signature)
        await this.checkMessage(json.compressed, json.keccak256, signature)
      }
      content = await this.ipfsBundle.decrypt(json.compressed)
      content = this.ipfsBundle.inflate(content)
    } else {
      content = this.ipfsBundle.inflate(json.compressed)
    }
  } else if (content.match(/{"encrypted":/)) {
    const json = JSON.parse(content)
    if (json.signature) {
      const signature = await this.ipfsBundle.decrypt(json.signature)
      await this.checkMessage(json.encrypted, json.keccak256, signature)
    }
    content = await this.ipfsBundle.decrypt(json.encrypted)
    content = btoa(content)
  } else if (content.match(/{"iv":/)) {
    if (password == null && $tw.crypto.hasPassword() === false) {
      content = await this.decryptFromPasswordPrompt(content)
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
  url =
    url === undefined || url == null || url.toString().trim() === ''
      ? null
      : url.toString().trim()
  if (url == null) {
    throw new Error('Undefined URL...')
  }
  password =
    password === undefined || password == null || password.trim() === ''
      ? null
      : password.trim()
  const ua = await this.fetchUint8Array(url)
  if (ua.length === 0) {
    return ''
  }
  var content = this.ipfsBundle.Utf8ArrayToStr(ua)
  if (content.match(/{"compressed":/)) {
    const json = JSON.parse(content)
    if (json.compressed.match(/{"iv":/)) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await this.decryptFromPasswordPrompt(json.compressed)
      } else {
        content = $tw.crypto.decrypt(json.compressed, password)
      }
      content = this.ipfsBundle.inflate(content)
    } else if (json.compressed.match(/{"version":/)) {
      if (json.signature) {
        const signature = await this.ipfsBundle.decrypt(json.signature)
        await this.checkMessage(json.compressed, json.keccak256, signature)
      }
      content = await this.ipfsBundle.decrypt(json.compressed)
      content = this.ipfsBundle.inflate(content)
    } else {
      content = this.ipfsBundle.inflate(json.compressed)
    }
  } else if (content.match(/{"encrypted":/)) {
    const json = JSON.parse(content)
    if (json.signature) {
      const signature = await this.ipfsBundle.decrypt(json.signature)
      await this.checkMessage(json.encrypted, json.keccak256, signature)
    }
    content = await this.ipfsBundle.decrypt(json.encrypted)
  } else if (content.match(/{"iv":/)) {
    if (password == null && $tw.crypto.hasPassword() === false) {
      content = await this.decryptFromPasswordPrompt(content)
    } else {
      content = $tw.crypto.decrypt(content, password)
    }
  }
  return content
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

exports.IpfsLoader = IpfsLoader
