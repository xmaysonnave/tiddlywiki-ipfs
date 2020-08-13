/*\
title: $:/core/modules/commands/publickey.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

Save publickey for crypto operations

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.info = {
    name: 'publickey',
    synchronous: true
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    if (this.params.length < 1) {
      return 'Missing publickey'
    }
    if ($tw.compress && typeof $tw.compress.setEncryptionKey === 'function') {
      $tw.crypto.setEncryptionKey(this.params[0])
    }
    return null
  }

  exports.Command = Command
})()
