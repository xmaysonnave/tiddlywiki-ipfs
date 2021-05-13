/*\
title: $:/plugins/ipfs/startup/ipfs-startup.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Startup initialisation

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'ipfs-startup'
  exports.platforms = ['browser']
  exports.after = ['startup']
  exports.synchronous = true

  exports.startup = function () {
    var getLogger = function () {
      if (globalThis.log !== undefined && globalThis.log !== null) {
        const loggers = globalThis.log.getLoggers()
        if (loggers.ipfs !== undefined && loggers.ipfs !== null) {
          return loggers.ipfs
        }
      }
      return console
    }
    // Logger
    if (globalThis.log !== undefined && globalThis.log !== null) {
      const loggers = globalThis.log.getLoggers()
      var ipfs = loggers.ipfs
      if (ipfs === undefined || ipfs == null) {
        ipfs = globalThis.log.getLogger('ipfs')
        ipfs.info('Loglevel is starting up...')
      }
      if ($tw.utils.getIpfsVerbose()) {
        ipfs.setLevel('info', false)
      } else {
        ipfs.setLevel('warn', false)
      }
      ipfs.info('Loglevel is set up...')
    }
    // Missing Media Types
    $tw.utils.registerFileType('application/gzip', 'base64', '.gz')
    $tw.utils.registerFileType('application/x-tiddler-dictionary', 'utf8', '.dict')
    $tw.utils.registerFileType('application/zlib', 'base64', '.zlib')
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
