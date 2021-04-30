/*\
title: $:/plugins/ipfs/macros/ipfs-edition-version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'ipfs-edition-version-url'

  exports.params = []

  exports.run = function () {
    const buildName = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const editionBuild = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/edition/build') : null
    if (buildName !== undefined && buildName !== null && editionBuild !== undefined && editionBuild !== null) {
      return `${buildName.fields.text}/editions/${editionBuild.fields.name}/${editionBuild.fields.build}/`
    }
    return ''
  }
})()
