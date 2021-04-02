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

  /*
   * Information about this macro
   */
  exports.name = 'plugins-ipfs-version-url'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/name') : null
    const plugin = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/plugins/ipfs') : null
    if (buildName !== null && plugin !== null) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/plugin/${plugin.fields.build}/`
    }
    return 'Unavailable...'
  }
})()
