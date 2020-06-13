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

  // Export name and synchronous status
  exports.name = 'loglevel'
  exports.platforms = ['browser']
  exports.before = ['startup']
  exports.synchronous = true

  exports.startup = function () {
    if (window.logger === undefined || window.logger == null) {
      window.logger = $tw.modules.execute('$:/plugins/loglevel/loglevel.min.js')
      if ($tw.utils.getIpfsVerbose()) {
        window.logger.setLevel('info', true)
      } else {
        window.logger.setLevel('warn', true)
      }
      window.logger.info('LogLevel is starting up...')
    }
  }
})()
