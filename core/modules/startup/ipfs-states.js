/*\
title: $:/plugins/ipfs/startup/ipfs-states.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Compression handling

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  // Export name and synchronous status
  exports.name = 'ipfs-states'
  exports.platforms = ['browser']
  exports.after = ['ipfs-startup']
  exports.synchronous = true

  exports.startup = function () {
    // Ensure that $:/isCompressed and $:/isTreeLayout are maintained properly
    $tw.wiki.addEventListener('change', function (changes) {
      if ($tw.utils.hop(changes, '$:/isCompressed')) {
        const tiddler = $tw.wiki.getTiddler('$:/isCompressed')
        $tw.compress.setCompressState(tiddler.fields.text === 'yes')
      }
      if ($tw.utils.hop(changes, '$:/isTreeLayout')) {
        const tiddler = $tw.wiki.getTiddler('$:/isTreeLayout')
        $tw.layoutState.setLayoutState(tiddler.fields.text === 'yes')
      }
    })
  }
})()
