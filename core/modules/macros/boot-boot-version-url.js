/*\
title: $:/plugins/ipfs/macros/boot-boot-version-url.js
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
  exports.name = 'boot-boot-version-url'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const boot = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/boot/boot.js') : null
    if (buildName !== undefined && boot !== undefined) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/boot/${boot.fields.build}/`
    }
    return 'Unavailable...'
  }
})()
