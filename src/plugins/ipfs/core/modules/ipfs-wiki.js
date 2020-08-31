/*\
title: $:/core/modules/ipfs-wiki.js
type: application/javascript
tags: $:/ipfs/core
module-type: wikimethod

wikimethod

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*
   * Parse a block of text of a specified MIME type
   *  type: content type of text to be parsed
   *  text: text
   *  options: see below
   * Options include:
   *  parseAsInline: if true, the text of the tiddler will be parsed as an inline run
   *  _canonical_uri: optional string of the canonical URI of this content
   */
  exports.parseText = function (type, text, options) {
    text = text || ''
    options = options || {}
    // Select a parser
    var Parser = $tw.Wiki.parsers[type]
    if (!Parser && $tw.utils.getFileExtensionInfo(type)) {
      Parser = $tw.Wiki.parsers[$tw.utils.getFileExtensionInfo(type).type]
    }
    if (!Parser) {
      Parser = $tw.Wiki.parsers[options.defaultType || 'text/vnd.tiddlywiki']
    }
    if (!Parser) {
      return null
    }
    // Return the parser instance
    return new Parser(type, text, {
      parseAsInline: options.parseAsInline,
      wiki: this,
      tiddler: options.tiddler
    })
  }

  /*
   * Parse a tiddler according to its MIME type
   */
  exports.parseTiddler = function (title, options) {
    options = $tw.utils.extend({}, options)
    var cacheType = options.parseAsInline ? 'inlineParseTree' : 'blockParseTree'
    var tiddler = this.getTiddler(title)
    var self = this
    return tiddler
      ? this.getCacheForTiddler(title, cacheType, function () {
          options.tiddler = tiddler
          return self.parseText(
            tiddler.fields.type,
            tiddler.fields.text,
            options
          )
        })
      : null
  }

  /**
   * Lower level utility to read the content of a browser File object,
   * invoking callback(tiddlerFieldsArray) with an array of tiddler fields objects
   */
  exports.readFileContent = function (
    file,
    type,
    isBinary,
    deserializer,
    callback
  ) {
    var self = this
    // Create the FileReader
    var reader = new FileReader()
    // Onload
    reader.onload = function (event) {
      var text = event.target.result
      var tiddlerFields = { title: file.name || 'Untitled', type: type }
      if (isBinary) {
        var commaPos = text.indexOf(',')
        if (commaPos !== -1) {
          text = text.substr(commaPos + 1)
        }
      }
      // Check whether this is an encrypted TiddlyWiki file
      var encryptedJson = $tw.utils.extractEncryptedStoreArea(text)
      if (encryptedJson) {
        var json = JSON.parse(encryptedJson)
        if (json.iv) {
          // If so, attempt to decrypt it with the current password
          $tw.utils.decryptStoreAreaInteractive(encryptedJson, function (
            tiddlers
          ) {
            callback(tiddlers)
          })
        } else if (json.encrypted) {
          $tw.utils.decryptFromMetamaskPrompt(json, function (tiddlers) {
            callback(tiddlers)
          })
        }
      } else {
        // Otherwise, just try to deserialise any tiddlers in the file
        callback(
          self.deserializeTiddlers(type, text, tiddlerFields, {
            deserializer: deserializer
          })
        )
      }
    }
    // Kick off the read
    if (isBinary) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file)
    }
  }
})()
