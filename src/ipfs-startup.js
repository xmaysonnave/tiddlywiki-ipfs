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
      if (window.logger === undefined || window.logger == null) {
        try {
          window.logger = $tw.modules.execute(
            '$:/plugins/loglevel/loglevel.min.js'
          )
          if ($tw.utils.getIpfsVerbose()) {
            window.logger.setLevel('info', false)
          } else {
            window.logger.setLevel('warn', false)
          }
          window.logger.info('loglevel is starting up...')
        } catch (error) {
          console.error(error)
        }
      }
      if (window.logger !== undefined && window.logger !== null) {
        return window.logger
      }
      return console
    }
    // Missing Media Types
    $tw.utils.registerFileType('application/gzip', 'base64', '.gz')
    $tw.utils.registerFileType('audio/mpeg', 'base64', '.mp2')
    $tw.utils.registerFileType('image/jpg', 'base64', ['.jpg', '.jpeg'], {
      flags: ['image']
    })
    $tw.utils.registerFileType('text/csv', 'utf8', '.csv')
    $tw.utils.registerFileType('video/quicktime', 'base64', ['.mov', '.qt'])
    // Log
    getLogger().info('ipfs-startup is starting up...')
  }
})()
