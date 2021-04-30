/*\
title: $:/plugins/ipfs/macros/plugins-ipfs-version.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'plugins-ipfs-version'

  exports.params = []

  exports.run = function () {
    var tiddler = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/plugins/ipfs') : null
    if (tiddler !== undefined && tiddler !== null && tiddler.fields.version !== undefined) {
      return $tw.wiki.getTiddler('$:/plugins/ipfs').fields.version
    }
    return ''
  }
})()
