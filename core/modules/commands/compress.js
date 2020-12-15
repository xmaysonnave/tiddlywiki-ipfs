/*\
title: $:/core/modules/commands/compress.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

Set compression state

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.info = {
    name: 'compress',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    var compress = false
    if (this.params.length > 0) {
      compress = this.params[0] === 'yes'
    }
    if ($tw.compress && typeof $tw.compress.setCompressState === 'function') {
      $tw.compress.setCompressState(compress)
    }
    return null
  }

  exports.Command = Command
})()
