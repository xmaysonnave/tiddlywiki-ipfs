/*\
title:  $:/plugins/ipfs/macros/ipfs-edition-build.js
type: application/javascript
module-type: macro

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.name = 'ipfs-edition-build'

  exports.params = []

  exports.run = function () {
    if ($tw !== undefined && $tw.ipfs !== undefined && $tw.ipfs.editionBuild !== undefined) {
      return $tw.ipfs.editionBuild
    }
    return ''
  }
})()
