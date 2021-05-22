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
        const extracted = text.substring(compressedStoreAreaStart + compressedStoreAreaStartMarker.length, compressedStoreAreaEnd - 1)
        const decoded = $tw.utils.htmlDecode(extracted)
        return decoded
      }
    }
    return null
  }

  exports.inflate = function (text, callback) {
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
      if (json !== null && json.compressed !== undefined) {
        const encrypted = parse(json.compressed)
        if (encrypted !== null && encrypted.iv !== undefined) {
          $tw.utils.decryptStoreAreaInteractive(json.compressed, function (decrypted) {
            $tw.utils.inflateTiddlers(decrypted, function (tiddlers) {
              if (tiddlers) {
                callback(tiddlers)
              }
            })
          })
          return true
        } else if (encrypted !== null && encrypted.version !== undefined) {
          $tw.utils.decryptFromMetamaskPrompt(json.compressed, json.keccak256, json.signature, function (decrypted) {
            $tw.utils.inflateTiddlers(decrypted, function (tiddlers) {
              if (tiddlers) {
                callback(tiddlers)
              }
            })
          })
          return true
        } else {
          $tw.utils.inflateTiddlers(json.compressed, function (tiddlers) {
            if (tiddlers) {
              callback(tiddlers)
            }
          })
          return true
        }
      }
    }
    return false
  }

  exports.inflateTiddlers = function (b64, callback) {
    if (b64) {
      const data = $tw.ipfs.inflate(b64)
      if (data) {
        const tiddlers = $tw.utils.loadTiddlers(data)
        if (tiddlers) {
          callback(tiddlers)
        }
      }
    }
  }
})()
