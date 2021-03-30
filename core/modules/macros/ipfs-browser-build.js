/*\
title: $:/plugins/ipfs/macros/ipfs-browser-build.js
type: application/javascript
module-type: macro

Macro to return the TiddlyWiki core version number

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /*
Information about this macro
*/

  exports.name = 'ipfs-browser-build'

  exports.params = []

  /*
Run the macro
*/
  exports.run = function () {
    return $tw.ipfsBrowserBuild
  }
})()
