/*\
title: $:/core/modules/macros/jsontiddler.js
type: application/javascript
module-type: macro

Macro to output a single tiddler to JSON

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.name = 'jsontiddler'

  exports.params = [{ name: 'title' }]

  exports.run = function (title) {
    title = title || this.getVariable('currentTiddler')
    var info = null
    var tiddler = !!title && this.wiki.getTiddler(title)
    var type = null
    var fields = {}
    if (tiddler) {
      var { type, info } = $tw.utils.getContentType(tiddler)
      for (var field in tiddler.fields) {
        fields[field] = tiddler.getFieldString(field)
      }
    }
    var content = JSON.stringify(fields, null, $tw.config.preferences.jsonSpaces)
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
