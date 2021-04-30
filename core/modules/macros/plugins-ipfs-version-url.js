/*\
title: $:/plugins/ipfs/macros/plugins-ipfs-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'plugins-ipfs-version-url'

  exports.params = []

  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const plugin = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/plugins/ipfs') : null
    if (buildName !== undefined && buildName !== null && plugin !== undefined && plugin !== null) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/plugin/${plugin.fields.build}/`
    }
    return ''
  }
})()
