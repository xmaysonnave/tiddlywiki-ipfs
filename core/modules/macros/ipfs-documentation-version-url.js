/*\
title: $:/plugins/ipfs/macros/ipfs-documentation-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

IPFS plugin version

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*
   * Information about this macro
   */
  exports.name = 'ipfs-documentation-version-url'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const documentation = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('IPFS Documentation Assets') : null
    if (buildName !== undefined && documentation !== undefined) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/documentation/${documentation.fields.build}/`
    }
    return 'Unavailable...'
  }
})()
