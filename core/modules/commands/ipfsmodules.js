/*\
title: $:/core/modules/commands/ipfsmodules.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.info = {
    name: 'ipfsmodules',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    var ipfsmodules = false
    if (this.params.length > 0) {
      ipfsmodules = this.params[0] === 'yes'
    }
    $tw.utils.setOnModuleState(ipfsmodules)
    return null
  }

  exports.Command = Command
})()
