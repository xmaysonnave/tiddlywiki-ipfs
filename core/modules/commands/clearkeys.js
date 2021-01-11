/*\
title: $:/core/modules/commands/clearkeys.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

Clear encryption public key for crypto operations

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.info = {
    name: 'clearkeys',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    $tw.crypto.setEncryptionKey(null, null)
    return null
  }

  exports.Command = Command
})()
