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
  exports.name = 'ipfs-encryption-tooltip'

  exports.params = []

  /*
   * Run the macro
   */
  exports.run = function () {
    var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
    if (
      encrypted !== undefined &&
      encrypted !== null &&
      encrypted.fields.text === 'yes'
    ) {
      encrypted = true
    } else {
      encrypted = false
    }
    var standford = $tw.wiki.getTiddler('$:/config/Standford')
    if (standford.fields.text === 'yes') {
      standford = true
    } else {
      standford = false
    }
    var tiddler = $tw.wiki.getTiddler(
      '$:/language/Buttons/Encryption/SetPublicKey/Hint'
    )
    if (encrypted) {
      if (standford) {
        tiddler = $tw.wiki.getTiddler(
          '$:/language/Buttons/Encryption/ClearPassword/Hint'
        )
      } else {
        tiddler = $tw.wiki.getTiddler(
          '$:/language/Buttons/Encryption/ClearPublicKey/Hint'
        )
      }
    } else {
      if (standford) {
        tiddler = $tw.wiki.getTiddler(
          '$:/language/Buttons/Encryption/SetPassword/Hint'
        )
      }
    }
    return tiddler.fields.text
  }
})()
