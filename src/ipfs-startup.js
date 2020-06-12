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

  exports.platforms = ['browser']
  exports.after = ['startup']
  exports.synchronous = true

  exports.startup = function () {
    // Missing Media Types
    $tw.utils.registerFileType('application/gzip', 'base64', '.gz')
    $tw.utils.registerFileType('audio/mpeg', 'base64', '.mp2')
    $tw.utils.registerFileType('image/jpg', 'base64', ['.jpg', '.jpeg'], {
      flags: ['image']
    })
    $tw.utils.registerFileType('video/quicktime', 'base64', ['.mov', '.qt'])
    if (window.logger !== undefined && window.logger !== null) {
      window.logger.info('ipfs-startup is starting up...')
    } else {
      console.info('ipfs-startup is starting up...')
    }
  }
})()
