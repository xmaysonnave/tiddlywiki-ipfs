/*\
title: $:/plugins/ipfs/macros/ipfs-console-tooltip.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'ipfs-console-tooltip'

  exports.params = []

  exports.run = function () {
    var tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Console/Mobile/Hint')
    if (typeof window.eruda === 'undefined') {
      tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Console/Mobile/Load')
    } else if ($tw.ipfs.ipfsAction !== undefined) {
      if ($tw.ipfs.ipfsAction.console) {
        tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Console/Mobile/Hide')
      } else {
        tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Console/Mobile/Show')
      }
    }
    return tiddler.fields.text
  }
})()
