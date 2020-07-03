/*\
title: $:/plugins/ipfs/macro/ipfs-console-tooltip.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

IPFS plugin version

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /*
   * Information about this macro
   */
  exports.name = 'ipfs-encryption-tooltip'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    var isEncrypted = $tw.wiki.getTiddler('$:/isEncrypted')
    if (
      isEncrypted !== undefined &&
      isEncrypted !== null &&
      isEncrypted.fields.text === 'yes'
    ) {
      isEncrypted = true
    } else {
      isEncrypted = false
    }
    var isStandford = $tw.wiki.getTiddler('$:/config/Standford')
    if (isStandford.fields.text === 'yes') {
      isStandford = true
    } else {
      isStandford = false
    }
    var tiddler = $tw.wiki.getTiddler(
      '$:/language/Buttons/Encryption/SetPublicKey/Hint'
    )
    if (isEncrypted) {
      if (isStandford) {
        tiddler = $tw.wiki.getTiddler(
          '$:/language/Buttons/Encryption/ClearPassword/Hint'
        )
      } else {
        tiddler = $tw.wiki.getTiddler(
          '$:/language/Buttons/Encryption/ClearPublicKey/Hint'
        )
      }
    } else {
      if (isStandford) {
        tiddler = $tw.wiki.getTiddler(
          '$:/language/Buttons/Encryption/SetPassword/Hint'
        )
      }
    }
    return tiddler.fields.text
  }
})()
