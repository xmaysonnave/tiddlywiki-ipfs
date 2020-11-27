/*\
title: $:/core/modules/utils/compress.js
type: application/javascript
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
    var compressedStoreAreaStartMarker =
      '<pre id="compressedStoreArea" type="text/plain" style="display:none;">'
    var compressedStoreAreaStart = text.indexOf(compressedStoreAreaStartMarker)
    if (compressedStoreAreaStart !== -1) {
      var compressedStoreAreaEnd = text.indexOf(
        '</pre>',
        compressedStoreAreaStart
      )
      if (compressedStoreAreaEnd !== -1) {
        return $tw.utils.htmlDecode(
          text.substring(
            compressedStoreAreaStart + compressedStoreAreaStartMarker.length,
            compressedStoreAreaEnd - 1
          )
        )
      }
    }
    return null
  }

  exports.inflateCompressedStoreArea = function (
    compressedStoreArea,
    callback
  ) {
    if (compressedStoreArea) {
      if (compressedStoreArea.match(/{"compressed":/)) {
        var json = JSON.parse(compressedStoreArea)
        if (json.compressed.match(/{"iv":/)) {
          $tw.utils.decryptStoreAreaInteractive(json.compressed, function (
            decrypted
          ) {
            $tw.utils.inflateTiddlers(decrypted, callback)
          })
        } else if (json.compressed.match(/{"version":/)) {
          $tw.utils.decryptFromMetamaskPrompt(
            json.compressed,
            json.keccak256,
            json.signature,
            function (decrypted) {
              $tw.utils.inflateTiddlers(decrypted, callback)
            }
          )
        } else {
          $tw.utils.inflateTiddlers(json.compressed, callback)
        }
        return true
      }
    }
    return false
  }

  exports.inflateTiddlers = function (b64, callback) {
    if (b64) {
      const data = $tw.compress.inflate(b64)
      if (data) {
        var tiddlers = $tw.utils.loadTiddlers(data)
        if (tiddlers) {
          callback(tiddlers)
        }
      }
    }
  }
})()
