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
    if ($tw && $tw.wiki) {
      const build = $tw.wiki.getTiddler('$:/ipfs/edition-build')
      if (build !== undefined && build !== null) {
        return build.fields.build
      }
      if ($tw.utils && $tw.utils.getIpfsEditionBuild) {
        return $tw.utils.getIpfsEditionBuild()
      }
    }
    return ''
  }
})()
