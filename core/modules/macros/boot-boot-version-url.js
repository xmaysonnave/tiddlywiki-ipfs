/*\
title: $:/plugins/ipfs/macros/boot-boot-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'boot-boot-version-url'

  exports.params = []

  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const boot = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/boot/boot.js') : null
    if (buildName !== undefined && buildName !== null && boot !== undefined && boot !== null) {
      return `${buildName.fields.text}/tiddlywiki-ipfs/boot/${boot.fields.build}/`
    }
    return ''
  }
})()
