/*\
title: $:/plugins/loglevel/startup.js
type: application/javascript
module-type: startup

Load the loglevel library on startup

\*/

exports.startup = function () {
  $tw.modules.execute('$:/plugins/loglevel/loglevel.min.js')
}
