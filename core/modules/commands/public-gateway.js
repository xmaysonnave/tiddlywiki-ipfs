/*\
title: $:/core/modules/commands/public-gateway.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.info = {
    name: 'public-gateway',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    if (this.params.length < 1) {
      return 'Missing public gateway url'
    }
    $tw.ipfs.setPublicGateway(this.params[0])
    return null
  }

  exports.Command = Command
})()
