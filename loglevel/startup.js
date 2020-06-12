/*\
title: $:/plugins/loglevel/startup.js
type: application/javascript
module-type: startup

Load the loglevel library on startup

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

  // Export name and synchronous status
  exports.name = 'loglevel'
  exports.before = ['startup']
  exports.synchronous = true

  exports.startup = function () {
    // Loglevel
    if (
      root !== undefined &&
      (root.logger === undefined || root.logger == null)
    ) {
      root.logger = $tw.modules.execute('$:/plugins/loglevel/loglevel.min.js')
      if ($tw.utils.getIpfsVerbose()) {
        root.logger.setLevel('info', true)
      } else {
        root.logger.setLevel('warn', true)
      }
      root.logger.info('loglevel is starting up...')
    }
  }
})()
