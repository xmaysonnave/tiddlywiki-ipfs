/*\
title: $:/plugins/ipfs/macros/normalize-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'normalize-url'

  exports.params = [{ name: 'title' }, { name: 'field' }]

  exports.run = function (title, field) {
    title = title || this.getVariable('currentTiddler')
    var tiddler = !!title && this.wiki.getTiddler(title)
    field = field !== undefined && field !== null && field.trim() !== '' ? field.trim() : '_canonical_uri'
    if (tiddler && tiddler.fields[field] !== undefined) {
      const url = $tw.ipfs.normalizeUrl(tiddler.fields[field], $tw.ipfs.getPublicGatewayUrl())
      if (url !== undefined && url !== null) {
        return url.toString()
      }
    }
    return ''
  }
})()
