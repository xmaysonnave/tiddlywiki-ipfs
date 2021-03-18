/*\
title: $:/plugins/ipfs/macros/boot-boot-version.js
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
  exports.name = 'boot-boot-version'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    return $tw.wiki.getTiddler('$:/boot/boot.js').fields.version
  }
})()
