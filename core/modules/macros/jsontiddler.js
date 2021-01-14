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

  /*
Information about this macro
*/

  exports.name = 'jsontiddler'

  exports.params = [{ name: 'title' }]

  /*
Run the macro
*/
  exports.run = function (title) {
    title = title || this.getVariable('currentTiddler')
    var tiddler = !!title && this.wiki.getTiddler(title)
    var fields = {}
    if (tiddler) {
      for (var field in tiddler.fields) {
        fields[field] = tiddler.getFieldString(field)
      }
    }
    var content = JSON.stringify(fields, null, $tw.config.preferences.jsonSpaces)
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
