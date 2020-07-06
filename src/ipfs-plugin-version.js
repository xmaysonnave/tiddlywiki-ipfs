/*\
title: $:/plugins/ipfs/macro/ipfs-plugin-version.js
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
  exports.name = 'ipfs-plugin-version'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    return $tw.wiki.getTiddler('$:/plugins/ipfs').fields.version
  }
})()
