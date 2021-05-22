/*\
title: $:/plugins/ipfs/utils/crypto.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

Utility functions related to crypto.

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /**
   * Look for an encrypted store area in the text of a TiddlyWiki file
   */
  exports.extractEncryptedStoreArea = function (text) {
    const encryptedStoreAreaStartMarker = '<pre id="encryptedStoreArea" type="text/plain" style="display:none;">'
    const encryptedStoreAreaStart = text.indexOf(encryptedStoreAreaStartMarker)
    if (encryptedStoreAreaStart !== -1) {
      const encryptedStoreAreaEnd = text.indexOf('</pre>', encryptedStoreAreaStart)
      if (encryptedStoreAreaEnd !== -1) {
        const extracted = text.substring(encryptedStoreAreaStart + encryptedStoreAreaStartMarker.length, encryptedStoreAreaEnd - 1)
        const decoded = $tw.utils.htmlDecode(extracted)
        return decoded
      }
    }
    return null
  }

  exports.decrypt = function (text, callback) {
    var parse = function (content) {
      var json = null
      try {
        json = JSON.parse(content)
      } catch (error) {
        // ignore
      }
      return json
    }
    if (text !== undefined && text !== null) {
      const json = parse(text)
      if (json !== null && json.iv !== undefined) {
        $tw.utils.decryptStoreAreaInteractive(text, function (decrypted) {
          callback($tw.utils.loadTiddlers(decrypted))
        })
      } else if (json !== null && json.encrypted !== undefined) {
        $tw.utils.decryptFromMetamaskPrompt(json.encrypted, json.keccak256, json.signature, function (decrypted) {
          callback($tw.utils.loadTiddlers(decrypted))
        })
      }
    }
  }

  /**
   * Attempt to extract the tiddlers from an encrypted store area using the current password.
   * If the password is not provided then the password in the password store will be used
   */
   exports.decryptStoreArea = function (encryptedStoreArea, password, privateKey) {
    const json = JSON.parse(encryptedStoreArea)
    return $tw.utils.loadTiddlers($tw.crypto.decrypt(json.encrypted, password, privateKey))
  }

  exports.decryptFromMetamaskPrompt = function (text, keccak256, signature, callback) {
    const decrypted = $tw.crypto.decrypt(text)
    if (decrypted) {
      callback(decrypted)
    } else {
      $tw.boot.metamaskPrompt(text, keccak256, signature, function (decrypted) {
        callback(decrypted)
      })
    }
  }

  /**
   * Attempt to extract the tiddlers from an encrypted store area using the current password.
   * If that fails, the user is prompted for a password.
   *
   * text: encrypted text
   * callback: function(tiddlers) called with the array of decrypted tiddlers
   *
   * The following configuration settings are supported:
   *
   * $tw.config.usePasswordVault: causes any password entered by the user to also be put into the system password vault
   */
  exports.decryptStoreAreaInteractive = function (text, callback, options) {
    const decrypted = $tw.crypto.decrypt(text)
    if (decrypted) {
      callback(decrypted)
    } else {
      // Prompt for a new password and keep trying
      $tw.passwordPrompt.createPrompt({
        serviceName: 'Enter a password to decrypt the imported TiddlyWiki',
        noUserName: true,
        canCancel: true,
        submitText: 'Decrypt',
        callback: function (data) {
          // Exit if the user cancelled
          if (!data) {
            return false
          }
          // Attempt to decrypt the tiddlers
          const decrypted = $tw.crypto.decrypt(text, data.password)
          if (decrypted) {
            if ($tw.config.usePasswordVault) {
              $tw.crypto.setPassword(data.password)
            }
            callback(decrypted)
            // Exit and remove the password prompt
            return true
          } else {
            // We didn't decrypt everything, so continue to prompt for password
            return false
          }
        },
      })
    }
  }
})()
