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
    var content = null
    var info = null
    var type = null
    var tiddler = null
    var tiddlers = $tw.wiki.filterTiddlers(filter)
    if (tiddlers.length > 1) {
      content = $tw.wiki.getTiddlersAsJson(filter, $tw.utils.parseInt(spaces))
    } else {
      var fields = {}
      tiddler = $tw.wiki.getTiddler(tiddlers[0])
      var { type, info } = $tw.utils.getContentType(tiddler)
      for (var field in tiddler.fields) {
        fields[field] = tiddler.getFieldString(field)
      }
      content = JSON.stringify(fields, null, spaces)
    }
    var compress = $tw.wiki.getTiddler('$:/isCompressed')
    compress = compress !== undefined && compress !== null ? compress.fields.text === 'yes' : false
    if ((info !== null && info.encoding === 'base64') || (type !== null && type === 'image/svg+xml')) {
      compress = false
    }
    compress =
      tiddler !== undefined && tiddler !== null && tiddler.fields._compress !== undefined && tiddler.fields._compress !== null
        ? tiddler.fields._compress.trim() === 'yes'
        : compress
    if (compress) {
      content = { compressed: $tw.compress.deflate(content) }
    }
    var encrypt = $tw.wiki.getTiddler('$:/isEncrypted')
    encrypt = encrypt !== undefined && encrypt !== null ? encrypt.fields.text === 'yes' : false
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
