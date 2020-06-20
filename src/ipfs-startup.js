/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Startup initialisation

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /**
   * https://github.com/purposeindustries/window-or-global
   * The MIT License (MIT) Copyright (c) Purpose Industries
   * version: 1.0.1
   */
  const root =
    (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global) ||
    this

  exports.platforms = ['browser']
  exports.after = ['load-modules']
  exports.synchronous = true

  exports.startup = function () {
    // Missing Media Types
    $tw.utils.registerFileType('application/gzip', 'base64', '.gz')
    $tw.utils.registerFileType('audio/mpeg', 'base64', '.mp2')
    $tw.utils.registerFileType('image/jpg', 'base64', ['.jpg', '.jpeg'], {
      flags: ['image']
    })
    $tw.utils.registerFileType('video/quicktime', 'base64', ['.mov', '.qt'])
    if (root.logger !== undefined && root.logger !== null) {
      root.logger.info('ipfs-startup is starting up...')
    } else {
      console.info('ipfs-startup is starting up...')
    }
  }
})()
