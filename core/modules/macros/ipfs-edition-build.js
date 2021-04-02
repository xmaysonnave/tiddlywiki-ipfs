/*\
title:  $:/plugins/ipfs/macros/ipfs-edition-build.js
type: application/javascript
module-type: macro


\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /*
Information about this macro
*/

  exports.name = 'ipfs-edition-build'

  exports.params = []

  /*
Run the macro
*/
  exports.run = function () {
    return $tw.ipfsEditionBuild
  }
})()
