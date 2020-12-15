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
      if (window.log !== undefined && window.log !== null) {
        return window.log.getLogger('ipfs')
      }
      return console
    }
    // Logger
    if (window.log !== undefined && window.log !== null) {
      const log = window.log.getLogger('ipfs')
      if ($tw.utils.getIpfsVerbose()) {
        log.setLevel('info', false)
      } else {
        log.setLevel('warn', false)
      }
      log.info('loglevel is set up...')
    }
    // Missing Media Types
    $tw.utils.registerFileType('application/gzip', 'base64', '.gz')
    $tw.utils.registerFileType('application/x-tiddler-dictionary', 'utf8', '.dict')
    $tw.utils.registerFileType('audio/mpeg', 'base64', '.mp2')
    $tw.utils.registerFileType('image/jpg', 'base64', ['.jpg', '.jpeg'], {
      flags: ['image'],
    })
    $tw.utils.registerFileType('text/csv', 'utf8', '.csv')
    $tw.utils.registerFileType('video/quicktime', 'base64', ['.mov', '.qt'])
    $tw.utils.registerFileType('text/x-tiddlywiki', 'utf8', '.tid', {
      deserializerType: 'text/html',
    })
    // Log
    getLogger().info('ipfs-startup is starting up...')
  }
})()
