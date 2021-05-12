var bootsuffix = function ($tw) {
  /*jslint node: true, browser: true */
  'use strict'

  const name = '$_boot_bootsuffix'

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
    var log = $tw.node ? globalThis.log || require('loglevel') : globalThis.log
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
   * Display an info
   */
  $tw.utils.info = function (title, prompt, text) {
    var errHeading = title !== undefined && title !== null && title.trim() !== '' ? title : ''
    var promptMsg = prompt !== undefined && prompt !== null && prompt.trim() !== '' ? prompt : ''
    if ($tw.browser && !$tw.node) {
      // Display an error message to the user
      var dm = $tw.utils.domMaker
      var heading = dm('h1', { text: errHeading })
      var prompt = dm('div', { text: promptMsg, class: 'tc-info-prompt' })
      var message = dm('div', { text: text, class: 'tc-info-message' })
      var button = dm('div', {
        children: [dm('button', { text: $tw.language === undefined ? 'close' : $tw.language.getString('Buttons/Close/Caption') })],
        class: 'tc-info-prompt',
      })
      var form = dm('form', { children: [heading, prompt, message, button], class: 'tc-info-form' })
      document.body.insertBefore(form, document.body.firstChild)
      form.addEventListener(
        'submit',
        function (event) {
          document.body.removeChild(form)
          event.preventDefault()
          return false
        },
        true
      )
    } else {
      // Print an orange message to the console if not in the browser
      console.error('\x1b[1;33m' + text + '\x1b[0m')
    }
    return null
  }

  /**
   * utf.js - UTF-8 <=> UTF-16 convertion
   * http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
   *
   * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
   * Version: 1.0
   * LastModified: Dec 25 1999
   * This library is free.  You can redistribute it and/or modify it.
   */
  $tw.boot.Utf8ArrayToStr = function (array) {
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
          out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0))
          break
      }
    }
    return out
  }

  $tw.boot.fetch = async function (url, timeout) {
    if (url instanceof URL === false) {
      url = new URL(url)
    }
    var options = null
    timeout = timeout !== undefined && timeout !== null ? timeout : 4 * 60 * 4000
    const optionsController = new AbortController()
    const optionsId = setTimeout(() => optionsController.abort(), timeout)
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
    var fetchHeaders = {
      'Accept-Encoding': 'identity;q=0", *;q=0',
    }
    var fetch = $tw.node ? globalThis.fetch || require('node-fetch') : globalThis.fetch
    try {
      var params = {
        method: 'options',
        signal: optionsController.signal,
      }
      options = await fetch(url, params)
      if (options === undefined || options == null || options.ok === false) {
        throw new Error(`Unexpected response ${options.statusText}`)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        $tw.boot.getLogger().error(`*** Timeout exceeded: ${timeout} ms ***`)
      } else {
        $tw.boot.getLogger().error(`*** Options error: ${error.message} ***`)
      }
    }
    globalThis.clearTimeout(optionsId)
    try {
      const responseController = new AbortController()
      const responseId = setTimeout(() => responseController.abort(), timeout)
      // https://fetch.spec.whatwg.org/#cors-safelisted-method
      // https://fetch.spec.whatwg.org/#cors-safelisted-request-header
      var params = {
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
      var response = await fetch(newUrl, params)
      globalThis.clearTimeout(responseId)
      if (response === undefined || response == null || response.ok === false) {
        throw new Error(`Unexpected response ${response.statusText}`)
      }
      if ($tw.browser && !$tw.node) {
        const ab = await response.arrayBuffer()
        const ua = new Uint8Array(ab)
        $tw.boot.getLogger().info(
          `[${response.status}] Loaded:
 ${response.url}`
        )
        return ua
      }
      return await response.buffer()
    } catch (error) {
      if (error.name === 'AbortError') {
        $tw.boot.getLogger().error(`*** Timeout exceeded: ${timeout} ms ***`)
      } else {
        $tw.boot.getLogger().error(`*** Fetch error: ${error.message} ***`)
      }
    }
    return null
  }

  $tw.boot.loadToUtf8 = async function (url, password) {
    url = url !== undefined && url !== null && url.toString().trim() !== '' ? url.toString().trim() : null
    if (url == null) {
      return null
    }
    password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
    const ua = await $tw.boot.fetch(url)
    if (ua === undefined || ua == null || ua.length === undefined || ua.length === 0) {
      return null
    }
    var content = $tw.boot.Utf8ArrayToStr(ua)
    if (content.match(/^{"compressed":/)) {
      const json = JSON.parse(content)
      if (json.compressed.match(/^{"iv":/)) {
        if (password == null && $tw.crypto.hasPassword() === false) {
          content = await $tw.boot.decryptFromPasswordPrompt(json.compressed)
        } else {
          content = $tw.crypto.decrypt(json.compressed, password)
        }
        content = $tw.compress.inflate(content)
      } else if (json.compressed.match(/^{"version":/)) {
        if (json.signature) {
          const signature = await $tw.crypto.decrypt(json.signature)
          await this.checkMessage(json.compressed, json.keccak256, signature)
        }
        content = await $tw.crypto.decrypt(json.compressed)
        content = $tw.compress.inflate(content)
      } else {
        content = $tw.compress.inflate(json.compressed)
      }
    } else if (content.match(/^{"encrypted":/)) {
      const json = JSON.parse(content)
      if (json.signature) {
        const signature = await $tw.crypto.decrypt(json.signature)
        await this.checkMessage(json.encrypted, json.keccak256, signature)
      }
      content = await $tw.crypto.decrypt(json.encrypted)
    } else if (content.match(/^{"iv":/)) {
      if (password == null && $tw.crypto.hasPassword() === false) {
        content = await $tw.boot.decryptFromPasswordPrompt(content)
      } else {
        content = $tw.crypto.decrypt(content, password)
      }
    }
    return content
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

  $tw.utils.ModulesState = function () {
    var currentState = null
    var isSystemTiddler = function (title) {
      return title && title.indexOf('$:/') === 0
    }
    this.setModulesState = function (state) {
      currentState = state ? 'yes' : 'no'
      this.updateModulesStateTiddler()
    }
    this.onModuleState = function (title, build) {
      if ($tw.wiki) {
        var fields = {}
        var tiddler = $tw.wiki.getTiddler(title)
        if (tiddler) {
          var tags = tiddler.fields.tags ? tiddler.fields.tags.slice() : []
          if (tags.indexOf('$:/isIpfs') === -1) {
            $tw.utils.pushTop(tags, '$:/isIpfs')
            fields.tags = tags
          }
          if (tiddler.fields._canonical_uri === undefined) {
            fields._canonical_uri = build.altSourceUri
            fields.build = build.build
            fields.version = build.version
          }
          if (tiddler.fields.text !== undefined && tiddler.fields.text !== null && tiddler.fields.text !== '') {
            fields.text = ''
          }
          var updatedTiddler = new $tw.Tiddler(tiddler, fields)
          if (tiddler.isEqual(updatedTiddler, ['created', 'modified']) === false) {
            $tw.wiki.addTiddler(updatedTiddler)
          }
        }
      }
    }
    this.load = function (tiddler, creationFields, removeFields, modificationFields, password, fallback) {
      var uri = tiddler.fields._canonical_uri ? tiddler.fields._canonical_uri : tiddler.fields.altSourceUri
      $tw.boot
        .loadToUtf8(uri, password)
        .then(data => {
          if (data !== null) {
            modificationFields.text = data
            $tw.wiki.addTiddler(new $tw.Tiddler(creationFields, tiddler, removeFields, modificationFields))
            $tw.boot.getLogger().info(
              `Embed module: ${data.length}
 ${uri}`
            )
          }
        })
        .catch(error => {
          if (!fallback) {
            if ($tw.utils.alert !== undefined) {
              $tw.boot.getLogger().error(error)
              $tw.utils.alert(name, error.message)
            } else {
              $tw.utils.error(error.message)
            }
          } else {
            this.load(fallback, creationFields, removeFields, modificationFields, password)
          }
        })
    }
    this.offModuleState = function (title) {
      if ($tw.wiki) {
        const tiddler = $tw.wiki.getTiddler(title)
        if (tiddler && tiddler.fields._canonical_uri) {
          var removeFields = { _canonical_uri: undefined }
          var modificationFields = $tw.wiki.getModificationFields()
          var creationFields = $tw.wiki.getCreationFields()
          var data = tiddler.fields.text
          var password = tiddler.fields._password
          password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
          var tags = tiddler.fields.tags ? tiddler.fields.tags.slice() : []
          var index = tags.indexOf('$:/isIpfs')
          if (index !== -1) {
            tags.splice(index, 1)
          }
          if (tags.length > 0) {
            if (tiddler.fields.tags) {
              modificationFields.tags = tags
            } else {
              creationFields.tags = tags
            }
          }
          if (data === undefined || data.trim() === '') {
            var build = null
            if (isSystemTiddler(tiddler.fields.title) && tiddler.fields.library === 'yes') {
              build = `${tiddler.fields.title}-build`
            } else if (tiddler.fields.type === 'application/json' && tiddler.hasField('plugin-type')) {
              build = `${tiddler.fields.title}.zlib-build`
            }
            this.load(tiddler, creationFields, removeFields, modificationFields, password, $tw.wiki.getTiddler(build))
          } else {
            $tw.wiki.addTiddler(new $tw.Tiddler(creationFields, tiddler, removeFields, modificationFields))
          }
        }
      }
    }
    this.updateModulesStateTiddler = function () {
      var isModule = null
      if ($tw.wiki) {
        var state = currentState === 'yes' ? 'yes' : 'no'
        isModule = $tw.wiki.getTiddler('$:/isModule')
        if (!isModule || isModule.fields.text !== state) {
          isModule = new $tw.Tiddler({
            title: '$:/isModule',
            text: state,
          })
          $tw.wiki.addTiddler(isModule)
        }
        if (isModule) {
          var build = this.getBuild('$:/boot/boot.css-build')
          if (build !== null) {
            if (state === 'yes') {
              this.onModuleState('$:/boot/boot.css', build)
            } else {
              this.offModuleState('$:/boot/boot.css')
            }
          }
          var build = this.getBuild('$:/boot/bootprefix.js-build')
          if (build !== null) {
            if (state === 'yes') {
              this.onModuleState('$:/boot/bootprefix.js', build)
            } else {
              this.offModuleState('$:/boot/bootprefix.js')
            }
          }
          var build = this.getBuild('$:/boot/boot.js-build')
          if (build !== null) {
            if (state === 'yes') {
              this.onModuleState('$:/boot/boot.js', build)
            } else {
              this.offModuleState('$:/boot/boot.js')
            }
          }
          var titles = titles || $tw.wiki.allTitles()
          for (var i = 0; i < titles.length; i++) {
            var innerTiddler = $tw.wiki.getTiddler(titles[i])
            if (innerTiddler !== undefined) {
              var build = null
              var innerTitle = innerTiddler.fields.title
              if (isSystemTiddler(innerTitle) && innerTiddler.fields.library === 'yes') {
                build = `${innerTitle}-build`
              } else if (innerTiddler.fields.type === 'application/json' && innerTiddler.hasField('plugin-type')) {
                build = `${innerTitle}.zlib-build`
              }
              if (build !== null) {
                var build = this.getBuild(build)
                if (build !== null) {
                  if (state === 'yes') {
                    this.onModuleState(innerTitle, build)
                  } else {
                    this.offModuleState(innerTitle)
                  }
                }
              }
            }
          }
        }
      }
    }
    this.getBuild = function (title) {
      var tiddler = $tw.wiki.getTiddler(title)
      if (tiddler !== undefined && tiddler !== null) {
        return {
          altSourceUri: tiddler.fields.altSourceUri,
          build: tiddler.fields.build,
          sourceUri: tiddler.fields.sourceUri,
          version: tiddler.fields.version,
        }
      }
      return null
    }
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
      var sjcl = $tw.node ? globalThis.sjcl || require('sjcl') : globalThis.sjcl
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
      var sigUtil = $tw.node ? globalThis.sigUtil || require('eth-sig-util') : globalThis.sigUtil
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
        var createKeccakHash = $tw.node ? globalThis.createKeccakHash || require('keccak') : globalThis.createKeccakHash
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
    var pako = $tw.node ? globalThis.pako || require('pako') : globalThis.pako
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
      /**
       * CommonJS optional require.main property:
       * In a browser we offer a fake main module which points back to the boot function
       * (Theoretically, this may allow TW to eventually load itself as a module in the browser)
       */
      Object.defineProperty(sandbox.require, 'main', {
        value: typeof require !== 'undefined' ? require.main : { TiddlyWiki: bootsuffix },
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
    $tw.boot.decryptFromPasswordPrompt = function (encrypted) {
      return new Promise((resolve, reject) => {
        var prompt = 'Enter a password to decrypt this content...'
        if ($tw.utils.hop($tw.boot, 'encryptionPrompts')) {
          prompt = $tw.boot.encryptionPrompts.decrypt
        }
        $tw.passwordPrompt.createPrompt({
          serviceName: prompt,
          noUserName: true,
          canCancel: false,
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
          },
        })
      })
    }

    $tw.boot.passwordPrompt = function (text, callback) {
      var prompt = 'Enter a password to decrypt this TiddlyWiki'
      // Prompt for the password
      if ($tw.utils.hop($tw.boot, 'encryptionPrompts')) {
        prompt = $tw.boot.encryptionPrompts.decrypt
      }
      $tw.passwordPrompt.createPrompt({
        serviceName: prompt,
        noUserName: true,
        canCancel: false,
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
      var area = document.getElementById('compressedStoreArea')
      var content = area !== undefined && area !== null && area.innerHTML !== undefined ? area.innerHTML : null
      if (content !== undefined && content !== null) {
        var inflate = function (b64) {
          if (b64 !== undefined && b64 !== null) {
            $tw.boot.preloadTiddler($tw.compress.inflate(b64), callback)
          }
        }
        if (content.match(/^{"compressed":/)) {
          var json = JSON.parse(content)
          if (json.compressed.match(/^{"iv":/)) {
            $tw.boot.passwordPrompt(json.compressed, function (decrypted) {
              inflate(decrypted)
            })
          } else if (json.compressed.match(/^{"version":/)) {
            $tw.boot.metamaskPrompt(json.compressed, json.keccak256, json.signature, function (decrypted, recovered) {
              if (decrypted !== null) {
                inflate(decrypted)
                if (recovered) {
                  $tw.utils.info(
                    'Decryption',
                    'Sucessfully recovered encrypted signature',
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
      var area = document.getElementById('encryptedStoreArea')
      var content = area !== undefined && area !== null && area.innerHTML !== undefined ? area.innerHTML : null
      if (content !== undefined && content !== null) {
        if (content.match(/^{"iv":/)) {
          $tw.boot.passwordPrompt(content, function (decrypted) {
            $tw.boot.preloadTiddler(decrypted, callback)
          })
        } else if (content.match(/^{"encrypted":/)) {
          const json = JSON.parse(content)
          $tw.boot.metamaskPrompt(json.encrypted, json.keccak256, json.signature, function (decrypted, recovered) {
            if (decrypted !== null) {
              $tw.boot.preloadTiddler(decrypted, callback)
              if (recovered) {
                $tw.utils.info(
                  'Decryption',
                  'Sucessfully recovered encrypted signature',
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
          $tw.boot.getLogger().error('Warning: missing plugin.info file in ' + filepath)
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

  $tw.boot.readPluginInfo = async function (titles) {
    var results = {
      modifiedPlugins: [],
      deletedPlugins: [],
    }
    var deletePlugin = function (title, results) {
      $tw.wiki.setPluginInfo(title)
      results.deletedPlugins.push(title)
    }
    var titles = titles || $tw.wiki.allTitles()
    for (var i = 0; i < titles.length; i++) {
      var tiddler = $tw.wiki.getTiddler(titles[i])
      if (tiddler !== undefined) {
        if (tiddler.fields.type === 'application/json' && tiddler.hasField('plugin-type')) {
          if (tiddler.fields._canonical_uri === undefined) {
            if (tiddler.fields.text !== undefined) {
              $tw.wiki.setPluginInfo(tiddler.fields.title, JSON.parse(tiddler.fields.text))
              results.modifiedPlugins.push(tiddler.fields.title)
            } else {
              deletePlugin(tiddler.fields.title, results)
            }
          } else {
            try {
              var content = await $tw.boot.loadToUtf8(tiddler.fields._canonical_uri)
              if (content !== null) {
                content = JSON.parse(content)
                if (content.text !== undefined && content.text !== null && content.text !== '') {
                  $tw.wiki.setPluginInfo(tiddler.fields.title, JSON.parse(content.text))
                  results.modifiedPlugins.push(tiddler.fields.title)
                } else {
                  deletePlugin(tiddler.fields.title, results)
                }
              } else {
                deletePlugin(tiddler.fields.title, results)
              }
            } catch (error) {
              if ($tw.utils.alert !== undefined) {
                $tw.boot.getLogger().error(error)
                $tw.utils.alert(name, error.message)
              } else {
                $tw.utils.error(error.message)
              }
            }
          }
        }
      } else if ($tw.wiki.getPluginInfo(tiddler.fields.title) !== undefined) {
        $tw.wiki.setPluginInfo(tiddler.fields.title)
        results.deletedPlugins.push(tiddler.fields.title)
      }
    }
    return results
  }

  $tw.boot.execStartup = async function (options) {
    if ($tw.wiki.setPluginInfo === undefined) {
      $tw.wiki.readPluginInfo()
    } else {
      await $tw.boot.readPluginInfo()
    }
    $tw.wiki.registerPluginTiddlers('plugin', $tw.safeMode ? ['$:/core'] : undefined)
    $tw.wiki.unpackPluginTiddlers()
    // Process "safe mode"
    if ($tw.safeMode) {
      $tw.wiki.processSafeMode()
    }
    // Register typed modules from the tiddlers we've just loaded
    $tw.wiki.defineTiddlerModules()
    // And any modules within plugins
    $tw.wiki.defineShadowModules()
    // Gather up any startup modules
    $tw.boot.remainingStartupModules = [] // Array of startup modules
    $tw.modules.forEachModuleOfType('startup', function (title, module) {
      if (module.startup) {
        $tw.boot.remainingStartupModules.push(module)
      }
    })
    // Keep track of the startup tasks that have been executed
    $tw.boot.executedStartupModules = Object.create(null)
    $tw.boot.disabledStartupModules = $tw.boot.disabledStartupModules || []
    // Repeatedly execute the next eligible task
    $tw.boot.executeNextStartupTask(options.callback)
  }

  /**
   * Startup TiddlyWiki
   */
  $tw.boot.startup = async function (options) {
    options = options || {}
    // Get the URL hash and check for safe mode
    $tw.boot.initStartup(options)
    $tw.boot.loadStartup(options)
    await $tw.boot.execStartup(options)
  }

  /////////////////////////// Main boot function to decrypt tiddlers and then startup

  $tw.boot.boot = function (callback) {
    $tw.crypto = new $tw.utils.Crypto()
    if ($tw.browser && !$tw.node) {
      $tw.passwordPrompt = new $tw.utils.PasswordPrompt()
    }
    $tw.compress = new $tw.utils.Compress()
    $tw.modulesState = new $tw.utils.ModulesState()
    $tw.boot.inflateTiddlers(function () {
      $tw.boot.startup({
        callback: function () {
          // Make sure the state tiddlers are up to date
          var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
          if (encrypted !== undefined && encrypted.fields._encryption_public_key) {
            $tw.crypto.setEncryptionKey(encrypted.fields._encryption_public_key)
          } else {
            $tw.crypto.updateCryptoStateTiddler()
          }
          var tiddler = $tw.wiki.getTiddler('$:/isCompressed')
          if (tiddler) {
            $tw.compress.setCompressState(tiddler.fields.text === 'yes')
          } else {
            $tw.compress.updateCompressStateTiddler()
          }
          var tiddler = $tw.wiki.getTiddler('$:/isModule')
          if (tiddler) {
            $tw.modulesState.setModulesState(tiddler.fields.text === 'yes')
          } else {
            $tw.modulesState.updateModulesStateTiddler()
          }
          if (typeof callback === 'function') {
            callback()
          }
        },
      })
    })
  }

  if ($tw.browser && !$tw.boot.suppressBoot) {
    $tw.boot.boot()
  }

  return $tw
}

if (typeof exports !== 'undefined') {
  exports.TiddlyWiki = bootsuffix
} else {
  bootsuffix(window.$tw)
}
