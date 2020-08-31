/*\
title: $:/boot/ipfs-boot.js
type: application/javascript
tags: $:/ipfs/core

\*/
var _boot = function ($tw) {
  /*jslint node: true, browser: true */
  'use strict'

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
      }
      return ipfs
    }
    return console
  }

  /**
   * Crypto helper object for encrypted content. It maintains the password text in a closure, and provides methods to change
   * the password, and to encrypt/decrypt a block of text
   */
  $tw.utils.Crypto = function () {
    var currentPassword = null
    var currentPublicKey = null
    var callSjcl = function (method, inputText, password) {
      password = password || currentPassword
      var outputText
      var sjcl = $tw.node ? global.sjcl || require('sjcl') : window.sjcl
      try {
        if (password) {
          var tStart = new Date()
          outputText = sjcl[method](password, inputText)
          var tStop = new Date() - tStart
          var ratio = Math.floor((outputText.length * 100) / inputText.length)
          var uMethod = method.charAt(0).toUpperCase() + method.slice(1) + 'ion'
          $tw.boot
            .getLogger()
            .info(
              `Standford ${uMethod}: ${tStop}ms, In: ${inputText.length} bytes, Out: ${outputText.length} bytes, Ratio: ${ratio}%`
            )
        }
      } catch (ex) {
        $tw.boot.getLogger().error('Crypto error:' + ex)
        outputText = null
      }
      return outputText
    }
    this.setPassword = function (newPassword) {
      currentPassword =
        newPassword === undefined || newPassword == null ? null : newPassword
      currentPublicKey = null
      if ($tw.wiki) {
        this.updateCryptoStateTiddler()
        var standford = $tw.wiki.getTiddler('$:/config/Standford')
        if (
          !standford ||
          (currentPassword !== null && standford.fields.text === 'no')
        ) {
          $tw.wiki.addTiddler(
            new $tw.Tiddler({ title: '$:/config/Standford', text: 'yes' })
          )
        }
      }
    }
    this.setEncryptionPublicKey = function (newPublicKey) {
      currentPassword = null
      currentPublicKey =
        newPublicKey === undefined || newPublicKey == null ? null : newPublicKey
      if ($tw.wiki) {
        this.updateCryptoStateTiddler()
        var standford = $tw.wiki.getTiddler('$:/config/Standford')
        if (!standford) {
          $tw.wiki.addTiddler(
            new $tw.Tiddler({ title: '$:/config/Standford', text: 'yes' })
          )
        } else {
          if (currentPublicKey !== null && standford.fields.text === 'yes') {
            $tw.wiki.addTiddler(
              new $tw.Tiddler({ title: '$:/config/Standford', text: 'no' })
            )
          }
        }
      }
    }
    this.updateCryptoStateTiddler = function () {
      if ($tw.wiki) {
        var state = currentPassword || currentPublicKey ? 'yes' : 'no'
        var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
        if (!encrypted || encrypted.fields.text !== state) {
          $tw.wiki.addTiddler(
            new $tw.Tiddler({
              title: '$:/isEncrypted',
              _encryption_public_key:
                currentPublicKey !== null ? currentPublicKey : undefined,
              text: state
            })
          )
        }
      }
    }
    this.hasPassword = function () {
      return !!currentPassword
    }
    this.hasEncryptionPublicKey = function () {
      return !!currentPublicKey
    }
    this.encrypt = function (text, password, publicKey) {
      publicKey = publicKey || currentPublicKey
      if (publicKey) {
        var output
        var sigUtil = $tw.node
          ? global.sigUtil || require('eth-sig-util')
          : window.sigUtil
        var tStart = new Date()
        try {
          output = sigUtil.encrypt(
            publicKey,
            { data: text },
            'x25519-xsalsa20-poly1305'
          )
          output = JSON.stringify(output)
          var tStop = new Date() - tStart
          var ratio = Math.floor((output.length * 100) / text.length)
          $tw.boot
            .getLogger()
            .info(
              `Ethereum Encryption: ${tStop}ms, In: ${text.length} bytes, Out: ${output.length} bytes, Ratio: ${ratio}%`
            )
        } catch (error) {
          $tw.boot.getLogger().error('Crypto error:' + error)
          output = null
        }
        return output
      } else {
        return callSjcl('encrypt', text, password)
      }
    }
    this.decrypt = function (text, password) {
      return callSjcl('decrypt', text, password)
    }
    this.keccak256 = function (text) {
      var createKeccakHash = $tw.node
        ? global.createKeccakHash || require('keccak')
        : window.createKeccakHash
      var hash = createKeccakHash('keccak256')
      hash.update(text)
      return hash.digest('hex')
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
          $tw.wiki.addTiddler(
            new $tw.Tiddler({ title: '$:/isCompressed', text: state })
          )
        }
      }
    }
    this.deflate = function (str) {
      var tStart = new Date()
      var ua = pako.deflate(str, { raw: false })
      var b64 = this.btoa(ua)
      var tStop = new Date() - tStart
      var ratio = Math.floor((b64.length * 100) / str.length)
      $tw.boot
        .getLogger()
        .info(
          `Deflate: ${tStop}ms, In: ${str.length} bytes, Out: ${b64.length} bytes, Ratio: ${ratio}%`
        )
      return b64
    }
    this.inflate = function (b64) {
      var tStart = new Date()
      var ua = this.decode(b64)
      var str = pako.inflate(ua, { to: 'string' })
      var tStop = new Date() - tStart
      var ratio = Math.floor((str.length * 100) / b64.length)
      $tw.boot
        .getLogger()
        .info(
          `Inflate: ${tStop}ms, In: ${b64.length} bytes, Out: ${str.length} bytes, Ratio: ${ratio}%`
        )
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
      _keyStr:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
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
      }
    }
  }

  /////////////////////////// Browser definitions

  if ($tw.browser && !$tw.node) {
    $tw.boot.metamaskPrompt = async function (
      text,
      keccak256,
      signature,
      callback
    ) {
      var checkAccountPermission = async function (provider) {
        if (typeof provider.request === 'function') {
          const permissions = await provider.request({
            method: 'wallet_getPermissions'
          })
          const accountsPermission = permissions.find(
            permission => permission.parentCapability === 'eth_accounts'
          )
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
            params: [{ eth_accounts: {} }]
          })
          const accountsPermission = permissions.find(
            permission => permission.parentCapability === 'eth_accounts'
          )
          if (accountsPermission) {
            return true
          }
        }
        return false
      }
      // Check hash
      if (keccak256) {
        const hash = $tw.crypto.keccak256(text)
        if (keccak256 !== hash) {
          throw new Error(
            'Tampered encrypted content, signature do not match...'
          )
        }
      }
      // Decrypt
      var decryptedText = null
      try {
        const provider = await window.detectEthereumProvider({
          mustBeMetaMask: true
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
          if (
            permission === false ||
            (await provider._metamask.isUnlocked()) === false
          ) {
            accounts = await provider.request({
              method: 'eth_requestAccounts'
            })
          }
          if (
            accounts === undefined ||
            accounts == null ||
            Array.isArray(accounts) === false ||
            accounts.length === 0
          ) {
            accounts = await provider.request({ method: 'eth_accounts' })
          }
        } catch (error) {
          if (error.code === 4001) {
            throw error
          }
          $tw.boot.getLogger().error(error)
        }
        // Enable attempt
        if (
          accounts === undefined ||
          accounts == null ||
          Array.isArray(accounts) === false ||
          accounts.length === 0
        ) {
          if (typeof provider.enable === 'function') {
            accounts = await provider.enable()
          }
        }
        if (
          accounts === undefined ||
          accounts == null ||
          Array.isArray(accounts) === false ||
          accounts.length === 0
        ) {
          throw new Error('Unable to retrieve any Ethereum accounts...')
        }
        if (provider.chainId !== undefined) {
          $tw.boot
            .getLogger()
            .log(`Chain: ${provider.chainId}, Ethereum Account: ${accounts[0]}`)
        } else {
          $tw.boot.getLogger().log(`Ethereum Account: ${accounts[0]}`)
        }
        try {
          var tStart = new Date()
          decryptedText = await provider.request({
            method: 'eth_decrypt',
            params: [text, accounts[0]]
          })
          if (decryptedText !== undefined || decryptedText !== null) {
            var tStop = new Date() - tStart
            var ratio = Math.floor((decryptedText.length * 100) / text.length)
            $tw.boot
              .getLogger()
              .info(
                `Ethereum Decrypt: ${tStop}ms, In: ${text.length}, Out: ${decryptedText.length}, Ratio: ${ratio}%`
              )
          }
        } catch (error) {
          if (error.code === 4001) {
            throw error
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
      callback(decryptedText)
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
        }
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
      var compressedArea = document.getElementById('compressedStoreArea')
      if (compressedArea) {
        var inflate = function (b64) {
          var data = null
          if (b64 !== undefined && b64 !== null) {
            data = $tw.compress.inflate(b64)
          }
          $tw.boot.preloadTiddler(data, callback)
        }
        var data = compressedArea.innerHTML
        if (data.startsWith('{"compressed":')) {
          var json = JSON.parse(data)
          if (json.compressed.startsWith('{"iv":')) {
            $tw.boot.passwordPrompt(json.compressed, function (decrypted) {
              inflate(decrypted)
            })
          } else if (json.compressed.startsWith('{"version":')) {
            $tw.boot.metamaskPrompt(
              json.compressed,
              json.keccak256,
              json.signature,
              function (decrypted) {
                inflate(decrypted)
              }
            )
          } else {
            inflate(json.compressed)
          }
        } else {
          $tw.boot.preloadTiddler(data, callback)
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
      var encryptedArea = document.getElementById('encryptedStoreArea')
      if (encryptedArea) {
        var data = encryptedArea.innerHTML
        if (data.startsWith('{"iv":')) {
          $tw.boot.passwordPrompt(data, function (decrypted) {
            $tw.boot.preloadTiddler(decrypted, callback)
          })
        } else if (data.startsWith('{"encrypted":')) {
          const json = JSON.parse(data)
          $tw.boot.metamaskPrompt(
            json.encrypted,
            json.keccak256,
            json.signature,
            function (decrypted) {
              $tw.boot.preloadTiddler(decrypted, callback)
            }
          )
        } else {
          $tw.boot.preloadTiddler(data, callback)
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

  /////////////////////////// Main boot function to decrypt tiddlers and then startup

  $tw.boot.boot = function (callback) {
    // Initialise crypto object
    $tw.crypto = new $tw.utils.Crypto()
    // Initialise password prompter
    if ($tw.browser && !$tw.node) {
      $tw.passwordPrompt = new $tw.utils.PasswordPrompt()
    }
    // Initialise compress object
    $tw.compress = new $tw.utils.Compress()
    // Preload any compressed tiddlers
    $tw.boot.inflateTiddlers(function () {
      // Startup
      $tw.boot.startup({ callback: callback })
      // Make sure the crypto state tiddler is up to date
      if ($tw.crypto) {
        var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
        if (encrypted && encrypted.fields._encryption_public_key) {
          $tw.crypto.setEncryptionPublicKey(
            encrypted.fields._encryption_public_key
          )
        } else {
          $tw.crypto.updateCryptoStateTiddler()
        }
      }
    })
  }

  /////////////////////////// Autoboot in the browser

  if ($tw.browser) {
    $tw.boot.boot()
  }

  return $tw
}

if (typeof exports !== 'undefined') {
  exports.TiddlyWiki = _boot
} else {
  _boot(window.$tw)
}
