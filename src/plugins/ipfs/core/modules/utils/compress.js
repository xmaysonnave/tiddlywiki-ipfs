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

  exports.inflateCompressedStoreArea = function (b64, callback) {
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
