var ipfsBoot = function ($tw) {
  /*jslint node: true, browser: true */
  'use strict'

  const name = 'ipfs-boot'

  /////////////////////////// Standard node.js libraries

  var fs
  var path
  var vm
  if ($tw.node) {
    fs = require('fs')
    path = require('path')
    vm = require('vm')
  }

  $tw.boot.getLogger = function () {
    var log = $tw.node ? global.log || require('loglevel') : window.log
    if (log !== undefined && log !== null) {
      const loggers = log.getLoggers()
      var eruda = loggers.eruda
      if (eruda) {
        return eruda
      }
      var ipfs = loggers.ipfs
      if (!ipfs) {
        ipfs = log.getLogger('ipfs')
        ipfs.setLevel('info', false)
        ipfs.info('Loglevel is starting up...')
      }
      return ipfs
    }
    return console
  }

  /**
   * Run code globally with specified context variables in scope
   */
  $tw.utils.evalGlobal = function (code, context, filename) {
    var contextCopy = $tw.utils.extend(Object.create(null), context)
    // Get the context variables as a pair of arrays of names and values
    var contextNames = []
    var contextValues = []
    $tw.utils.each(contextCopy, function (value, name) {
      contextNames.push(name)
      contextValues.push(value)
    })
    // Add the code prologue and epilogue
    code = '(function(' + contextNames.join(',') + ') {(function(){\n' + code + '\n;})();\nreturn exports;\n})\n'
    // Compile the code into a function
    var fn
    if ($tw.browser) {
      /*eslint no-eval:"off"*/
      fn = window.eval(code + '\n\n//# sourceURL=' + filename)
    } else {
      fn = vm.runInThisContext(code, $tw.wiki.getFileName(filename))
    }
    // Call the function and return the exports
    return fn.apply(null, contextValues)
  }

  /**
   * Run code in a sandbox with only the specified context variables in scope
   */
  $tw.utils.evalSandboxed = $tw.browser
    ? $tw.utils.evalGlobal
    : function (code, context, filename) {
        var sandbox = $tw.utils.extend(Object.create(null), context)
        vm.runInNewContext(code, sandbox, $tw.wiki.getFileName(filename))
        return sandbox.exports
      }

  $tw.Wiki.prototype.getFileName = function (title) {
    if ($tw.filepaths && $tw.filepaths[title]) {
      return $tw.filepaths[title]
    }
    return title
  }

  /**
   * Crypto helper object for encrypted content.
   * It maintains the password text in a closure, and provides methods to change
   * the password, and to encrypt/decrypt a block of text
   */
  $tw.utils.Crypto = function () {
    var currentPassword = null
    var currentPrivateKey = null
    var currentPublicKey = null
    var callSjcl = function (method, text, password) {
      password = password || currentPassword
      var output = null
      var sjcl = $tw.node ? global.sjcl || require('sjcl') : window.sjcl
      try {
        if (password) {
          var tStart = new Date()
          output = sjcl[method](password, text)
          var tStop = new Date() - tStart
          var ratio = Math.floor((output.length * 100) / text.length)
          var uMethod = method.charAt(0).toUpperCase() + method.slice(1) + 'ion'
          $tw.boot.getLogger().info(`Standford ${uMethod}: ${tStop}ms, In: ${text.length} bytes, Out: ${output.length} bytes, Ratio: ${ratio}%`)
        }
      } catch (error) {
        $tw.boot.getLogger().error('Standford Crypto: ' + error)
        output = null
      }
      return output
    }
    var callSigUtil = function (method, text, key) {
      var output = null
      var sigUtil = $tw.node ? global.sigUtil || require('eth-sig-util') : window.sigUtil
      try {
        if (method === 'encrypt') {
          key = key || currentPublicKey
          if (key) {
            var tStart = new Date()
            output = sigUtil.encrypt(key, { data: text }, 'x25519-xsalsa20-poly1305')
            output = JSON.stringify(output)
            var tStop = new Date() - tStart
            var ratio = Math.floor((output.length * 100) / text.length)
            $tw.boot.getLogger().info(`Ethereum Encryption: ${tStop}ms, In: ${text.length} bytes, Out: ${output.length} bytes, Ratio: ${ratio}%`)
          }
        } else if (method === 'decrypt') {
          key = key || currentPrivateKey
          if (key) {
            var tStart = new Date()
            output = sigUtil.decrypt(JSON.parse(text), key)
            var tStop = new Date() - tStart
            var ratio = Math.floor((output.length * 100) / text.length)
            $tw.boot.getLogger().info(`Ethereum Decryption: ${tStop}ms, In: ${text.length} bytes, Out: ${output.length} bytes, Ratio: ${ratio}%`)
          }
        }
      } catch (error) {
        $tw.boot.getLogger().error('Ethereum Crypto: ' + error)
        output = null
      }
      return output
    }
    this.setPassword = function (newPassword) {
      currentPassword = newPassword === undefined || newPassword == null || newPassword.trim() === '' ? null : newPassword
      currentPrivateKey = null
      currentPublicKey = null
      if ($tw.wiki) {
        var encryption = $tw.wiki.getTiddler('$:/config/encryption')
        if (encryption.fields.text !== 'standford') {
          $tw.wiki.addTiddler(
            new $tw.Tiddler({
              title: '$:/config/encryption',
              text: 'standford',
            })
          )
        }
        this.updateCryptoStateTiddler()
      }
    }
    this.setEncryptionKey = function (newPublicKey, newPrivateKey) {
      currentPrivateKey = newPrivateKey === undefined || newPrivateKey == null || newPrivateKey.trim() === '' ? null : newPrivateKey
      currentPublicKey = newPublicKey === undefined || newPublicKey == null || newPublicKey.trim() === '' ? null : newPublicKey
      currentPassword = null
      if ($tw.wiki) {
        var encryption = $tw.wiki.getTiddler('$:/config/encryption')
        if (currentPrivateKey !== null || currentPublicKey !== null) {
          if (encryption.fields.text !== 'ethereum') {
            $tw.wiki.addTiddler(
              new $tw.Tiddler({
                title: '$:/config/encryption',
                text: 'ethereum',
              })
            )
          }
        } else {
          if (encryption.fields.text !== 'standford') {
            $tw.wiki.addTiddler(
              new $tw.Tiddler({
                title: '$:/config/encryption',
                text: 'standford',
              })
            )
          }
        }
        this.updateCryptoStateTiddler()
      }
    }
    this.updateCryptoStateTiddler = function () {
      if ($tw.wiki) {
        var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
        var state = currentPassword || currentPublicKey || currentPrivateKey ? 'yes' : 'no'
        if (!encrypted || encrypted.fields.text !== state) {
          if (currentPublicKey) {
            $tw.wiki.addTiddler(
              new $tw.Tiddler({
                title: '$:/isEncrypted',
                _encryption_public_key: currentPublicKey,
                text: state,
              })
            )
          } else {
            $tw.wiki.addTiddler(
              new $tw.Tiddler({
                title: '$:/isEncrypted',
                text: state,
              })
            )
          }
        }
      }
    }
    this.hasPassword = function () {
      return !!currentPassword
    }
    this.hasEncryptionPrivateKey = function () {
      return !!currentPrivateKey
    }
    this.hasEncryptionPublicKey = function () {
      return !!currentPublicKey
    }
    this.encrypt = function (text, password, publicKey) {
      password = password || currentPassword
      publicKey = publicKey || currentPublicKey
      if (text) {
        if (password) {
          return callSjcl('encrypt', text, password)
        } else if (publicKey) {
          return callSigUtil('encrypt', text, publicKey)
        }
      }
      return null
    }
    this.decrypt = function (text, password, privateKey) {
      password = password || currentPassword
      privateKey = privateKey || currentPrivateKey
      if (text) {
        if (password) {
          return callSjcl('decrypt', text, password)
        } else if (privateKey) {
          return callSigUtil('decrypt', text, privateKey)
        }
      }
      return null
    }
    this.keccak256 = function (text) {
      if (text) {
        var createKeccakHash = $tw.node ? global.createKeccakHash || require('keccak') : window.createKeccakHash
        var hash = createKeccakHash('keccak256')
        hash.update(text)
        return hash.digest('hex')
      }
      return null
    }
  }

  /**
   * Compress helper object for compressed content.
   */
  $tw.utils.Compress = function () {
    var pako = $tw.node ? global.pako || require('pako') : window.pako
    var currentState = null
    this.setCompressState = function (state) {
      currentState = state ? 'yes' : 'no'
      this.updateCompressStateTiddler()
    }
    this.updateCompressStateTiddler = function () {
      if ($tw.wiki) {
        var state = currentState === 'yes' ? 'yes' : 'no'
        var tiddler = $tw.wiki.getTiddler('$:/isCompressed')
        if (!tiddler || tiddler.fields.text !== state) {
          $tw.wiki.addTiddler(new $tw.Tiddler({ title: '$:/isCompressed', text: state }))
        }
      }
    }
    this.deflate = function (str) {
      var tStart = new Date()
      var ua = pako.deflate(str, { raw: false })
      var b64 = this.btoa(ua)
      var tStop = new Date() - tStart
      var ratio = Math.floor((b64.length * 100) / str.length)
      $tw.boot.getLogger().info(`Deflate: ${tStop}ms, In: ${str.length} bytes, Out: ${b64.length} bytes, Ratio: ${ratio}%`)
      return b64
    }
    this.inflate = function (b64) {
      var tStart = new Date()
      var ua = this.decode(b64)
      var str = pako.inflate(ua, { to: 'string' })
      var tStop = new Date() - tStart
      var ratio = Math.floor((str.length * 100) / b64.length)
      $tw.boot.getLogger().info(`Inflate: ${tStop}ms, In: ${b64.length} bytes, Out: ${str.length} bytes, Ratio: ${ratio}%`)
      return str
    }
    this.decode = function (b64) {
      return Base64Binary.decode(b64)
    }
    this.btoa = function (ua) {
      try {
        return this.Uint8ArrayToBase64(ua)
      } catch (error) {
        return Buffer.from(ua).toString('base64')
      }
    }
    // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
    this.Uint8ArrayToBase64 = function (uint8) {
      var CHUNK_SIZE = 0x8000
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
  }

  $tw.boot.metamaskPrompt = async function (encrypted, keccak256, signature, callback) {
    if (!$tw.browser && $tw.node) {
      callback(null)
    }
    var checkAccountPermission = async function (provider) {
      if (typeof provider.request === 'function') {
        const permissions = await provider.request({
          method: 'wallet_getPermissions',
        })
        const accountsPermission = permissions.find(permission => permission.parentCapability === 'eth_accounts')
        if (accountsPermission) {
          return true
        }
      }
      return false
    }
    var requestAccountPermission = async function (provider) {
      if (typeof provider.request === 'function') {
        const permissions = await provider.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        })
        const accountsPermission = permissions.find(permission => permission.parentCapability === 'eth_accounts')
        if (accountsPermission) {
          return true
        }
      }
      return false
    }
    var personalRecover = async function (provider, message, signature) {
      var recovered = null
      if (typeof provider.request === 'function') {
        var params = [message, signature]
        recovered = await provider.request({
          method: 'personal_ecRecover',
          params,
        })
      }
      if (recovered === undefined || recovered == null) {
        const err = new Error('Unrecoverable signature...')
        err.name = 'UnrecoverableSignature'
        throw err
      }
      return recovered
    }
    // Check hash
    if (keccak256) {
      const hash = $tw.crypto.keccak256(encrypted)
      if (keccak256 !== hash) {
        throw new Error('Tampered encrypted content, signature do not match...')
      }
    }
    // Decrypt
    var decrypted = null
    var recovered = null
    try {
      const provider = await window.detectEthereumProvider({
        mustBeMetaMask: true,
      })
      if (provider === undefined || provider == null) {
        throw new Error('Please install MetaMask...')
      }
      provider.autoRefreshOnNetworkChange = false
      var accounts = null
      var permission = false
      // Permission Attempt
      try {
        permission = await checkAccountPermission(provider)
        if (permission === false) {
          permission = await requestAccountPermission(provider)
        }
      } catch (error) {
        if (error.code === 4001) {
          throw error
        }
        $tw.boot.getLogger().error(error)
      }
      // Request Accounts attempt
      try {
        if (permission === false || (await provider._metamask.isUnlocked()) === false) {
          accounts = await provider.request({
            method: 'eth_requestAccounts',
          })
        }
        if (accounts === undefined || accounts == null || Array.isArray(accounts) === false || accounts.length === 0) {
          accounts = await provider.request({ method: 'eth_accounts' })
        }
      } catch (error) {
        if (error.code === 4001) {
          throw error
        }
        $tw.boot.getLogger().error(error)
      }
      // Enable attempt
      if (accounts === undefined || accounts == null || Array.isArray(accounts) === false || accounts.length === 0) {
        if (typeof provider.enable === 'function') {
          accounts = await provider.enable()
        }
      }
      if (accounts === undefined || accounts == null || Array.isArray(accounts) === false || accounts.length === 0) {
        throw new Error('Unable to retrieve any Ethereum accounts...')
      }
      if (provider.chainId !== undefined) {
        $tw.boot.getLogger().log(`Chain: ${provider.chainId}, Ethereum Account: ${accounts[0]}`)
      } else {
        $tw.boot.getLogger().log(`Ethereum Account: ${accounts[0]}`)
      }
      try {
        if (signature) {
          var tStart = new Date()
          signature = await provider.request({
            method: 'eth_decrypt',
            params: [signature, accounts[0]],
          })
          if (signature !== undefined || signature !== null) {
            var tStop = new Date() - tStart
            $tw.boot.getLogger().info(`Ethereum Signature Decrypt: ${tStop}ms`)
          }
          recovered = await personalRecover(provider, keccak256, signature)
          $tw.boot.getLogger().info(`Signed from: https://app.ens.domains/address/${recovered}`)
        }
        var tStart = new Date()
        decrypted = await provider.request({
          method: 'eth_decrypt',
          params: [encrypted, accounts[0]],
        })
        if (decrypted !== undefined || decrypted !== null) {
          var tStop = new Date() - tStart
          var ratio = Math.floor((decrypted.length * 100) / encrypted.length)
          $tw.boot.getLogger().info(`Ethereum Decrypt: ${tStop}ms, In: ${encrypted.length}, Out: ${decrypted.length}, Ratio: ${ratio}%`)
        }
      } catch (error) {
        if (error.code === 4001) {
          throw error
        }
        if (error.name === 'UnrecoverableSignature') {
          throw new Error(`Tampered encrypted content. ${error.message}`)
        }
        $tw.boot.getLogger().error(error)
        throw new Error('Unable to Decrypt Ethereum content...')
      }
    } catch (error) {
      if (error.code === 4001) {
        $tw.utils.error('Rejected User Request...')
      } else {
        $tw.utils.error(error.message)
      }
    }
    callback(decrypted, recovered)
  }

  /////////////////////////// Module mechanism

  /**
   * Execute the module named 'moduleName'. The name can optionally be relative to the module named 'moduleRoot'
   */
  $tw.modules.execute = function (moduleName, moduleRoot) {
    var name = moduleName
    if (moduleName.charAt(0) === '.') {
      name = $tw.utils.resolvePath(moduleName, moduleRoot)
    }
    if (!$tw.modules.titles[name]) {
      if ($tw.modules.titles[name + '.js']) {
        name = name + '.js'
      } else if ($tw.modules.titles[name + '/index.js']) {
        name = name + '/index.js'
      } else if ($tw.modules.titles[moduleName]) {
        name = moduleName
      } else if ($tw.modules.titles[moduleName + '.js']) {
        name = moduleName + '.js'
      } else if ($tw.modules.titles[moduleName + '/index.js']) {
        name = moduleName + '/index.js'
      }
    }
    var moduleInfo = $tw.modules.titles[name]
    var tiddler = $tw.wiki.getTiddler(name)
    var _exports = {}
    var sandbox = {
      module: { exports: _exports },
      //moduleInfo: moduleInfo,
      exports: _exports,
      console: console,
      setInterval: setInterval,
      clearInterval: clearInterval,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      Buffer: $tw.browser ? undefined : Buffer,
      $tw: $tw,
      require: function (title) {
        return $tw.modules.execute(title, name)
      },
    }

    Object.defineProperty(sandbox.module, 'id', {
      value: name,
      writable: false,
      enumerable: true,
      configurable: false,
    })

    if (!$tw.browser) {
      $tw.utils.extend(sandbox, {
        process: process,
      })
    } else {
      /*
      CommonJS optional require.main property:
      In a browser we offer a fake main module which points back to the boot function
      (Theoretically, this may allow TW to eventually load itself as a module in the browser)
      */
      Object.defineProperty(sandbox.require, 'main', {
        value: typeof require !== 'undefined' ? require.main : { TiddlyWiki: ipfsBoot },
        writable: false,
        enumerable: true,
        configurable: false,
      })
    }
    if (!moduleInfo) {
      // We could not find the module on this path
      // Try to defer to browserify etc, or node
      if ($tw.browser) {
        if (window.require) {
          try {
            return window.require(moduleName)
          } catch (e) {}
        }
        throw new Error(`Cannot find module named '${moduleName}' required by module '${moduleRoot}', resolved to ${name}`)
      } else {
        // If we don't have a module with that name, let node.js try to find it
        return require(moduleName)
      }
    }
    // Execute the module if we haven't already done so
    if (!moduleInfo.exports) {
      try {
        // Check the type of the definition
        if (typeof moduleInfo.definition === 'function') {
          // Function
          moduleInfo.exports = _exports
          moduleInfo.definition(moduleInfo, moduleInfo.exports, sandbox.require)
        } else if (typeof moduleInfo.definition === 'string') {
          // String
          moduleInfo.exports = _exports
          $tw.utils.evalSandboxed(moduleInfo.definition, sandbox, tiddler.fields.title)
          if (sandbox.module.exports) {
            moduleInfo.exports = sandbox.module.exports //more codemirror workaround
          }
        } else {
          // Object
          moduleInfo.exports = moduleInfo.definition
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          var line = e.lineNumber || e.line // Firefox || Safari
          if (typeof line !== 'undefined' && line !== null) {
            $tw.utils.error('Syntax error in boot module ' + name + ':' + line + ':\n' + e.stack)
          } else if (!$tw.browser) {
            // this is the only way to get node.js to display the line at which the syntax error appeared,
            // and $tw.utils.error would exit anyway
            // cf. https://bugs.chromium.org/p/v8/issues/detail?id=2589
            throw e
          } else {
            // Opera: line number is included in e.message
            // Chrome/IE: there's currently no way to get the line number
            $tw.utils.error('Syntax error in boot module ' + name + ': ' + e.message + '\n' + e.stack)
          }
        } else {
          // line number should be included in e.stack for runtime errors
          $tw.utils.error('Error executing boot module ' + name + ': ' + JSON.stringify(e) + '\n\n' + e.stack)
        }
      }
    }
    // Return the exports of the module
    return moduleInfo.exports
  }

  /////////////////////////// Browser definitions

  if ($tw.browser && !$tw.node) {
    $tw.boot.passwordPrompt = function (text, callback) {
      var prompt = 'Enter a password to decrypt this TiddlyWiki'
      // Prompt for the password
      if ($tw.utils.hop($tw.boot, 'encryptionPrompts')) {
        prompt = $tw.boot.encryptionPrompts.decrypt
      }
      $tw.passwordPrompt.createPrompt({
        serviceName: prompt,
        noUserName: true,
        submitText: 'Decrypt',
        callback: function (data) {
          // Attempt to decrypt the tiddlers
          $tw.crypto.setPassword(data.password)
          var decryptedText = $tw.crypto.decrypt(text)
          if (decryptedText) {
            callback(decryptedText)
            // Exit and remove the password prompt
            return true
          } else {
            // We didn't decrypt everything, so continue to prompt for password
            return false
          }
        },
      })
    }

    $tw.boot.preloadTiddler = function (text, callback) {
      try {
        if (text !== undefined && text !== null) {
          var json = JSON.parse(text)
          for (var title in json) {
            $tw.preloadTiddler(json[title])
          }
        }
      } catch (error) {
        $tw.boot.getLogger().error(error)
      }
      callback()
    }

    $tw.boot.inflateTiddlers = function (callback) {
      var compressedStoreArea = document.getElementById('compressedStoreArea')
      if (compressedStoreArea) {
        var inflate = function (b64) {
          if (b64 !== undefined && b64 !== null) {
            $tw.boot.preloadTiddler($tw.compress.inflate(b64), callback)
          }
        }
        var content = compressedStoreArea.innerHTML
        if (content.match(/{"compressed":/)) {
          var json = JSON.parse(content)
          if (json.compressed.match(/{"iv":/)) {
            $tw.boot.passwordPrompt(json.compressed, function (decrypted) {
              inflate(decrypted)
            })
          } else if (json.compressed.match(/{"version":/)) {
            $tw.boot.metamaskPrompt(json.compressed, json.keccak256, json.signature, function (decrypted, recovered) {
              if (decrypted !== null) {
                inflate(decrypted)
                if (recovered) {
                  $tw.utils.alert(
                    name,
                    `Signed from: <a class="tc-tiddlylink-external" rel="noopener noreferrer" target="_blank" href="https://app.ens.domains/address/${recovered}">${recovered}</a>`
                  )
                }
              }
            })
          } else {
            inflate(json.compressed)
          }
        } else {
          $tw.boot.preloadTiddler(content, callback)
        }
      } else {
        // Preload any encrypted tiddlers
        $tw.boot.decryptEncryptedTiddlers(callback)
      }
    }

    /**
     * Decrypt any tiddlers stored within the element with the ID "encryptedArea".
     * The function is asynchronous to allow the user to be prompted for a password
     * callback: function to be called the decryption is complete
     */
    $tw.boot.decryptEncryptedTiddlers = function (callback) {
      var encryptedStoreArea = document.getElementById('encryptedStoreArea')
      if (encryptedStoreArea) {
        var content = encryptedStoreArea.innerHTML
        if (content.match(/{"iv":/)) {
          $tw.boot.passwordPrompt(content, function (decrypted) {
            $tw.boot.preloadTiddler(decrypted, callback)
          })
        } else if (content.match(/{"encrypted":/)) {
          const json = JSON.parse(content)
          $tw.boot.metamaskPrompt(json.encrypted, json.keccak256, json.signature, function (decrypted, recovered) {
            if (decrypted !== null) {
              $tw.boot.preloadTiddler(decrypted, callback)
              if (recovered) {
                $tw.utils.alert(
                  name,
                  `Signed from: <a class="tc-tiddlylink-external" rel="noopener noreferrer" target="_blank" href="https://app.ens.domains/address/${recovered}">${recovered}</a>`
                )
              }
            }
          })
        } else {
          $tw.boot.preloadTiddler(content, callback)
        }
      } else {
        // Just invoke the callback straight away if there weren't any encrypted tiddlers
        callback()
      }
    }
  } else {
    /////////////////////////// Server definitions

    /**
     * Get any compressed tiddlers
     */
    $tw.boot.inflateTiddlers = function (callback) {
      // Storing compressed tiddlers on the server isn't supported yet
      callback()
    }

    /**
     * Get any encrypted tiddlers
     */
    $tw.boot.decryptEncryptedTiddlers = function (callback) {
      // Storing encrypted tiddlers on the server isn't supported yet
      callback()
    }
  } // End of if($tw.browser && !$tw.node)

  /////////////////////////// Node definitions

  if ($tw.node) {
    $tw.filepaths = Object.create(null)

    /**
     * Load the tiddlers from a plugin folder, and package them up into a proper JSON plugin tiddler
     */
    $tw.loadPluginFolder = function (filepath, excludeRegExp) {
      excludeRegExp = excludeRegExp || $tw.boot.excludeRegExp
      var infoPath = filepath + path.sep + 'plugin.info'
      if (fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()) {
        // Read the plugin information
        if (!fs.existsSync(infoPath) || !fs.statSync(infoPath).isFile()) {
          console.log('Warning: missing plugin.info file in ' + filepath)
          return null
        }
        var pluginInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'))
        // Read the plugin files
        var pluginFiles = $tw.loadTiddlersFromPath(filepath, excludeRegExp)
        // Save the plugin tiddlers into the plugin info
        pluginInfo.tiddlers = pluginInfo.tiddlers || Object.create(null)
        for (var f = 0; f < pluginFiles.length; f++) {
          var tiddlers = pluginFiles[f].tiddlers
          for (var t = 0; t < tiddlers.length; t++) {
            var tiddler = tiddlers[t]
            if (tiddler.title) {
              if (pluginFiles[f].type === 'application/javascript') {
                $tw.filepaths[tiddler.title] = pluginFiles[f].filepath
              }
              pluginInfo.tiddlers[tiddler.title] = tiddler
            }
          }
        }
        // Give the plugin the same version number as the core if it doesn't have one
        if (!('version' in pluginInfo)) {
          pluginInfo.version = $tw.packageInfo.version
        }
        // Use "plugin" as the plugin-type if we don't have one
        if (!('plugin-type' in pluginInfo)) {
          pluginInfo['plugin-type'] = 'plugin'
        }
        pluginInfo.dependents = pluginInfo.dependents || []
        pluginInfo.type = 'application/json'
        // Set plugin text
        pluginInfo.text = JSON.stringify({ tiddlers: pluginInfo.tiddlers }, null, 4)
        delete pluginInfo.tiddlers
        // Deserialise array fields (currently required for the dependents field)
        for (var field in pluginInfo) {
          if ($tw.utils.isArray(pluginInfo[field])) {
            pluginInfo[field] = $tw.utils.stringifyList(pluginInfo[field])
          }
        }
        return pluginInfo
      }
      return null
    }
  }

  /////////////////////////// Main boot function to decrypt tiddlers and then startup

  $tw.boot.boot = function (callback) {
    // Initialise crypto object
    $tw.crypto = new $tw.utils.Crypto()
    // Initialise password prompter
    if ($tw.browser && $tw.node === false) {
      $tw.passwordPrompt = new $tw.utils.PasswordPrompt()
    }
    // Initialise compress object
    $tw.compress = new $tw.utils.Compress()
    // Preload any compressed tiddlers
    $tw.boot.inflateTiddlers(function () {
      // Startup
      $tw.boot.startup({ callback: callback })
      // Make sure the crypto state tiddler is up to date
      var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
      if (encrypted && encrypted.fields._encryption_public_key) {
        $tw.crypto.setEncryptionKey(encrypted.fields._encryption_public_key)
      } else {
        $tw.crypto.updateCryptoStateTiddler()
      }
      // Make sure the compress state tiddler is up to date
      var compressed = $tw.wiki.getTiddler('$:/isCompressed')
      if (compressed === false) {
        $tw.compress.updateCompressStateTiddler()
      }
    })
  }

  if ($tw.browser && !$tw.boot.suppressBoot) {
    $tw.boot.boot()
  }

  return $tw
}

if (typeof exports !== 'undefined') {
  exports.TiddlyWiki = ipfsBoot
} else {
  ipfsBoot(window.$tw)
}
