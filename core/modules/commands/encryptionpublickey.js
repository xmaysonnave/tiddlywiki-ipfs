/*\
title: $:/core/modules/commands/encryptionpublickey.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

Save encryption public key for crypto operations

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.info = {
    name: 'encryptionpublickey',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    if (this.params.length < 1) {
      return 'Missing encryption public key'
    }
    $tw.crypto.setEncryptionKey(this.params[0], null)
    return null
  }

  exports.Command = Command
})()
