/*\
title: $:/plugins/ipfs/macro/ipfs-console-tooltip.js
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
  exports.name = 'ipfs-console-tooltip'

  exports.params = []

  /*
   * Run the macro
   */
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
