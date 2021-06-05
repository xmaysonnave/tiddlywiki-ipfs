/*\
title: $:/core/modules/commands/remote-layout.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.info = {
    name: 'remote-layout',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    var remoteLayout = false
    if (this.params.length > 0) {
      remoteLayout = this.params[0] === 'yes'
    }
    $tw.layoutState.setLayoutState(remoteLayout)
    return null
  }

  exports.Command = Command
})()
