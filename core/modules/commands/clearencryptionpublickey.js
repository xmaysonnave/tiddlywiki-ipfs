/*\
title: $:/core/modules/commands/clearencryptionpublickey.js
type: application/javascript
module-type: command

Clear encryption public key for crypto operations

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.info = {
    name: 'clearencryptionpublickey',
    synchronous: true
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    $tw.crypto.setEncryptionPublicKey(null)
    return null
  }

  exports.Command = Command
})()
