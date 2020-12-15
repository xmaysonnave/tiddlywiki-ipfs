/*\
title: $:/plugins/ipfs/ipfs-filters.js
type: application/javascript
module-type: filteroperator


\*/
;(function () {
  'use strict'

  /**
   * Export our filter functions
   */
  exports.filenamify = function (source, operator, options) {
    var results = []
    var filenamify = $tw.node ? globalThis.filenamify || require('filenamify') : $tw.ipfs.filenamify
    source(function (tiddler, title) {
      results.push(filenamify(title, { replacement: '_' }))
    })
    return results
  }
})()
