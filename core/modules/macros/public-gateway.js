/*\
title: $:/plugins/ipfs/macros/public-gateway.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'public-gateway'

  exports.params = []

  exports.run = function () {
    var tiddler = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/public/gateway') : null
    if (tiddler !== undefined && tiddler !== null && tiddler.fields.text !== '') {
      return tiddler.fields.text
    }
    return 'https://dweb.link'
  }
})()
