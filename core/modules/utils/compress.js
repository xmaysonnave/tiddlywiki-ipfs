/*\
title: $:/core/modules/utils/compress.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

Utility functions related to compression.

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /**
   * Look for a compression store area in the text of a TiddlyWiki file
   */
  exports.extractCompressedStoreArea = function (text) {
    const compressedStoreAreaStartMarker = '<pre id="compressedStoreArea" type="text/plain" style="display:none;">'
    const compressedStoreAreaStart = text.indexOf(compressedStoreAreaStartMarker)
    if (compressedStoreAreaStart !== -1) {
      const compressedStoreAreaEnd = text.indexOf('</pre>', compressedStoreAreaStart)
      if (compressedStoreAreaEnd !== -1) {
        return $tw.utils.htmlDecode(text.substring(compressedStoreAreaStart + compressedStoreAreaStartMarker.length, compressedStoreAreaEnd - 1))
      }
    }
    return null
  }

  exports.inflateCompressedStoreArea = function (compressedStoreArea, callback) {
    if (compressedStoreArea) {
      if (compressedStoreArea.match(/{"compressed":/)) {
        const json = JSON.parse(compressedStoreArea)
        if (json.compressed.match(/{"iv":/)) {
          $tw.utils.decryptStoreAreaInteractive(json.compressed, function (decrypted) {
            $tw.utils.inflateTiddlers(decrypted, function (tiddlers) {
              if (tiddlers) {
                callback(tiddlers)
              }
            })
          })
          return true
        } else if (json.compressed.match(/{"version":/)) {
          $tw.utils.decryptFromMetamaskPrompt(json.compressed, json.keccak256, json.signature, function (decrypted) {
            $tw.utils.inflateTiddlers(decrypted, function (tiddlers) {
              if (tiddlers) {
                callback(tiddlers)
              }
            })
          })
          return true
        }
      }
    }
    return false
  }

  exports.inflateStoreArea = function (compressedStoreArea, password, privateKey) {
    if (compressedStoreArea) {
      if (compressedStoreArea.match(/{"compressed":/)) {
        const json = JSON.parse(compressedStoreArea)
        if (json.compressed.match(/{"iv":/) || json.compressed.match(/{"version":/)) {
          const b64 = $tw.crypto.decrypt(json.compressed, password, privateKey)
          const data = $tw.compress.inflate(b64)
          if (data) {
            return $tw.utils.loadTiddlers(data)
          }
        }
      }
    }
    return null
  }

  exports.inflateTiddlers = function (b64, callback) {
    if (b64) {
      const data = $tw.compress.inflate(b64)
      if (data) {
        const tiddlers = $tw.utils.loadTiddlers(data)
        if (tiddlers) {
          callback(tiddlers)
        }
      }
    }
  }
})()
