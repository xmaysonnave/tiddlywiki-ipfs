/*\
title: $:/plugins/eruda/startup.js
type: application/javascript
module-type: startup

Load the eruda library on startup

\*/

exports.startup = function () {
  if ($tw.browser && !$tw.node) {
    $tw.modules.execute('$:/plugins/eruda/eruda.min.js')
  }
}
