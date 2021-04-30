/*\
title: $:/core/modules/macros/jsontiddlers.js
type: application/javascript
module-type: macro

Macro to output tiddlers matching a filter to JSON

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.name = 'jsontiddlers'

  exports.params = [{ name: 'filter' }, { name: 'spaces' }]

  exports.run = function (filter, spaces) {
    var content = this.wiki.getTiddlersAsJson(filter, $tw.utils.parseInt(spaces))
    var compress = $tw.wiki.getTiddler('$:/isCompressed')
    compress = compress !== undefined ? compress.fields.text === 'yes' : false
    if (compress) {
      content = { compressed: $tw.compress.deflate(content) }
    }
    var encrypt = $tw.wiki.getTiddler('$:/isEncrypted')
    encrypt = encrypt !== undefined ? encrypt.fields.text === 'yes' : false
    if (encrypt) {
      content.compressed = $tw.crypto.encrypt(compress ? content.compressed : content)
      if ($tw.crypto.hasEncryptionPublicKey()) {
        content.keccak256 = $tw.crypto.keccak256(compress ? content.compressed : content)
      }
    }
    if (compress || encrypt) {
      content = JSON.stringify(content)
    }
    return content
  }
})()
