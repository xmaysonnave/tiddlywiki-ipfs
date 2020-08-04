/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Startup initialisation

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.platforms = ['browser']
  exports.before = ['startup']
  exports.synchronous = true

  exports.startup = function () {
    var getLogger = function () {
      if (window.logger !== undefined && window.logger !== null) {
        return window.logger
      }
      return console
    }
    // Logger
    if (window.logger !== undefined && window.logger !== null) {
      if ($tw.utils.getIpfsVerbose()) {
        window.logger.setLevel('info', false)
      } else {
        window.logger.setLevel('warn', false)
      }
      window.logger.info('loglevel is set up...')
    }
    // Missing Media Types
    $tw.utils.registerFileType('application/gzip', 'base64', '.gz')
    $tw.utils.registerFileType(
      'application/x-tiddler-dictionary',
      'utf8',
      '.dict'
    )
    $tw.utils.registerFileType('audio/mpeg', 'base64', '.mp2')
    $tw.utils.registerFileType('image/jpg', 'base64', ['.jpg', '.jpeg'], {
      flags: ['image']
    })
    $tw.utils.registerFileType('text/csv', 'utf8', '.csv')
    $tw.utils.registerFileType('video/quicktime', 'base64', ['.mov', '.qt'])
    $tw.utils.registerFileType('text/x-tiddlywiki', 'utf8', '.tid', {
      deserializerType: 'text/html'
    })
    // Log
    getLogger().info('ipfs-startup is starting up...')
  }
})()
