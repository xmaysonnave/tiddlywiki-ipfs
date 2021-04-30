/*\
title: $:/core/modules/macros/infosaver.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'infosaver'

  exports.params = [{ name: 'tiddler' }]

  exports.run = function (tiddler) {
    return $tw.saverHandler.getSaver(tiddler).module.info.name
  }
})()
