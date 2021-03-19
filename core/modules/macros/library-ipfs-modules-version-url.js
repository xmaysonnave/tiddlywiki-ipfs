/*\
title: $:/plugins/ipfs/macros/library-ipfs-modules-version-url.js
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
  exports.name = 'library-ipfs-modules-version-url'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/name') : null
    const library = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/library/ipfs-modules.js') : null
    if (buildName !== null && library !== null) {
      return `${buildName.fields.text}/${library.fields.version}/tiddlywiki-ipfs/library/`
    }
    return 'Unavailable...'
  }
})()
