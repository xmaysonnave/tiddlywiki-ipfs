/*\
title: $:/core/modules/utils/crypto.js
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
        return $tw.utils.htmlDecode(text.substring(encryptedStoreAreaStart + encryptedStoreAreaStartMarker.length, encryptedStoreAreaEnd - 1))
      }
    }
    return null
  }

  exports.decryptEncryptedStoreArea = function (encryptedStoreArea, callback) {
    if (encryptedStoreArea) {
      if (encryptedStoreArea.match(/{"iv":/)) {
        $tw.utils.decryptStoreAreaInteractive(encryptedStoreArea, function (decrypted) {
          const tiddlers = $tw.utils.loadTiddlers(decrypted)
          if (tiddlers) {
            callback(tiddlers)
          }
        })
        return true
      } else if (encryptedStoreArea.match(/{"encrypted":/)) {
        const json = JSON.parse(encryptedStoreArea)
        $tw.utils.decryptFromMetamaskPrompt(json.encrypted, json.keccak256, json.signature, function (decrypted) {
          const tiddlers = $tw.utils.loadTiddlers(decrypted)
          if (tiddlers) {
            callback(tiddlers)
          }
        })
        return true
      }
    }
    return false
  }

  /**
   * Attempt to extract the tiddlers from an encrypted store area using the current password.
   * If the password is not provided then the password in the password store will be used
   */
  exports.decryptStoreArea = function (encryptedStoreArea, password, privateKey) {
    const json = JSON.parse(encryptedStoreArea)
    return $tw.utils.loadTiddlers($tw.crypto.decrypt(json.encrypted, password, privateKey))
  }

  exports.decryptFromMetamaskPrompt = function (encryptedStoreArea, keccak256, signature, callback) {
    // Try to decrypt with the current password
    const decrypted = $tw.utils.decryptStoreArea(encryptedStoreArea)
    if (decrypted) {
      callback(decrypted)
    } else {
      $tw.boot.metamaskPrompt(encryptedStoreArea, keccak256, signature, function (decrypted) {
        if (decrypted) {
          callback(decrypted)
        }
      })
    }
  }

  /**
   * Attempt to extract the tiddlers from an encrypted store area using the current password.
   * If that fails, the user is prompted for a password.
   *
   * encryptedStoreArea: text of the TiddlyWiki encrypted store area
   * callback: function(tiddlers) called with the array of decrypted tiddlers
   *
   * The following configuration settings are supported:
   *
   * $tw.config.usePasswordVault: causes any password entered by the user to also be put into the system password vault
   */
  exports.decryptStoreAreaInteractive = function (encryptedStoreArea, callback, options) {
    // Try to decrypt with the current password
    const decrypted = $tw.utils.decryptStoreArea(encryptedStoreArea)
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
          const text = $tw.crypto.decrypt(encryptedStoreArea, data.password)
          if (text) {
            if ($tw.config.usePasswordVault) {
              $tw.crypto.setPassword(data.password)
            }
            callback(text)
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
