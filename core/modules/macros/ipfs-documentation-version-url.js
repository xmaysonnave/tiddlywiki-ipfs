/*\
title: $:/plugins/ipfs/macros/ipfs-documentation-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'ipfs-documentation-version-url'

  exports.params = []

  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const documentation = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('IPFS Documentation Assets') : null
    if (buildName !== undefined && buildName !== null && documentation !== undefined && documentation !== null) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/documentation/${documentation.fields.build}/`
    }
    return ''
  }
})()
