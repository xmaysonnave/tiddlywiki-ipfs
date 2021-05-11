/*\
title:  $:/plugins/ipfs/macros/ipfs-edition-version.js
type: application/javascript
module-type: macro

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.name = 'ipfs-edition-version'

  exports.params = []

  exports.run = function () {
    if ($tw && $tw.wiki) {
      const build = $tw.wiki.getTiddler('$:/ipfs/edition-build')
      if (build !== undefined && build !== null) {
        return build.fields.version
      }
      if ($tw.utils && $tw.utils.getIpfsEditionVersion) {
        return $tw.utils.getIpfsEditionVersion()
      }
    }
    return ''
  }
})()
