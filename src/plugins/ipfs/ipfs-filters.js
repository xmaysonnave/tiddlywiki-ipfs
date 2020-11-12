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
  exports.normalizetitle = function (source, operator, options) {
    var results = []
    source(function (tiddler, title) {
      results.push(title.replace(/[:/]/g, '_'))
    })
    return results
  }
})()
