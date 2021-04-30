/*\
title: $:/plugins/ipfs/macros/ipfs-encryption-tooltip.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'ipfs-encryption-tooltip'

  exports.params = []

  exports.run = function () {
    var encrypted = $tw.wiki.getTiddler('$:/isEncrypted')
    if (encrypted !== undefined && encrypted !== null && encrypted.fields.text === 'yes') {
      encrypted = true
    } else {
      encrypted = false
    }
    var tiddler
    var encryption = $tw.wiki.getTiddler('$:/config/encryption')
    if (encrypted) {
      tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Encryption/ClearEncryptionPublicKey/Hint')
      if (encryption.fields.text === 'standford') {
        tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Encryption/ClearPassword/Hint')
      }
    } else {
      tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Encryption/SetEncryptionPublicKey/Hint')
      if (encryption.fields.text === 'standford') {
        tiddler = $tw.wiki.getTiddler('$:/language/Buttons/Encryption/SetPassword/Hint')
      }
    }
    return tiddler.fields.text
  }
})()
