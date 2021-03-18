/*\
title: $:/plugins/ipfs/macros/plugins-ipfs-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

IPFS plugin version

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const buildName = 'ipns://k51qzi5uqu5dmj8zym08576inkibqy8apl49xg888d1x0q5vhk1lt2uj6sp2wl/'

  /*
   * Information about this macro
   */
  exports.name = 'plugins-ipfs-version-url'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    return `${buildName}${$tw.wiki.getTiddler('$:/plugins/ipfs').fields.version}/tiddlywiki-ipfs/plugin/`
  }
})()
