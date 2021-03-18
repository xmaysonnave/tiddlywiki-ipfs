/*\
title: $:/plugins/ipfs/macros/boot-boot-build-version-url.js
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
  exports.name = 'boot-boot-build-version-url'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    return `${$tw.wiki.getTiddler('$:/boot/boot.js-build').fields._source_uri}`
  }
})()
