/*\
title: $:/core/modules/commands/tree-layout.js
type: application/javascript
tags: $:/ipfs/core
module-type: command

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.info = {
    name: 'tree-layout',
    synchronous: true,
  }

  var Command = function (params, commander, callback) {
    this.params = params
    this.commander = commander
    this.callback = callback
  }

  Command.prototype.execute = function () {
    var treeLayout = false
    if (this.params.length > 0) {
      treeLayout = this.params[0] === 'yes'
    }
    $tw.layoutState.setLayoutState(treeLayout)
    return null
  }

  exports.Command = Command
})()
