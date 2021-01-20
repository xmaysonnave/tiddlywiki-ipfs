/*\
title: $:/plugins/ipfs/utils/compress.js
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
        if (json) {
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
    }
    return false
  }

  exports.inflate = function (compressed, password, privateKey) {
    if (compressed) {
      if (compressed.match(/{"compressed":/)) {
        var data = null
        const json = JSON.parse(compressed)
        if (json && json.compressed) {
          if (json.compressed.match(/{"iv":/) || json.compressed.match(/{"version":/)) {
            const b64 = $tw.crypto.decrypt(json.compressed, password, privateKey)
            data = $tw.compress.inflate(b64)
          } else {
            data = $tw.compress.inflate(json.compressed)
          }
        }
        if (data) {
          return $tw.utils.loadTiddlers(data)
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
