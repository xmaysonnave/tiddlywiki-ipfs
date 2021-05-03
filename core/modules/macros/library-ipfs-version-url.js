/*\
title: $:/plugins/ipfs/macros/library-ipfs-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'library-ipfs-version-url'

  exports.params = []

  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const library = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/library/ipfs.js') : null
    if (buildName !== undefined && buildName !== null && library !== undefined && library !== null) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/library/${library.fields.build}/`
    }
    return ''
  }
})()
