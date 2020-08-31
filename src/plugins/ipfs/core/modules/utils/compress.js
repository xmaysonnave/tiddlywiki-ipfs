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
  exports.extractCompressionStoreArea = function (text) {
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

  /**
   * Attempt to extract the tiddlers from a compressed store area
   */
  exports.inflateCompressedStoreArea = function (encryptedStoreArea, password) {
    var decryptedText = $tw.crypto.decrypt(encryptedStoreArea, password)
    if (decryptedText) {
      var json = JSON.parse(decryptedText)
      var tiddlers = []
      for (var title in json) {
        if (title !== '$:/isEncrypted') {
          tiddlers.push(json[title])
        }
      }
      return tiddlers
    } else {
      return null
    }
  }
})()
