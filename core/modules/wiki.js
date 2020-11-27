/*\
title: $:/plugins/ipfs/ipfs-wiki.js
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
   * Parse text from a tiddler and render it into another format
   * outputType: content type for the output
   * title: title of the tiddler to be rendered
   * options: see below
   * Options include:
   * variables: hashmap of variables to set
   * parentWidget: optional parent widget for the root node
   */
  exports.renderTiddlerAndSign = async function (outputType, title, options) {
    options = options || {}
    var parser = this.parseTiddler(title, options)
    var widgetNode = this.makeWidget(parser, options)
    var container = $tw.fakeDocument.createElement('div')
    widgetNode.render(container, null)
    var sign = $tw.wiki.locateTWElement(container, 'sign')
    if (sign) {
      var content = JSON.parse($tw.utils.htmlDecode(sign.textContent))
      content.signature = await $tw.ipfs.personalSign(content.keccak256)
      content.signature = $tw.crypto.encrypt(content.signature)
      content = JSON.stringify(content)
      sign.textContent = $tw.utils.htmlEncode(content)
    }
    return outputType === 'text/html'
      ? container.innerHTML
      : outputType === 'text/plain-formatted'
      ? container.formattedTextContent
      : container.textContent
  }

  exports.locateTWElement = function (element, type) {
    if (element.children) {
      for (var i = 0; i < element.children.length; i++) {
        const current = element.children[i]
        if (current[type]) {
          return current
        }
        if (current.children) {
          const found = $tw.wiki.locateTWElement(current, type)
          if (found) {
            return found
          }
        }
      }
    }
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
      // Check whether this is a compressed TiddlyWiki file
      var compressedStoreArea = $tw.utils.extractCompressedStoreArea(text)
      if (compressedStoreArea) {
        if (
          !$tw.utils.inflateCompressedStoreArea(compressedStoreArea, callback)
        ) {
          // Otherwise, just try to deserialise any tiddlers in the file
          callback(
            self.deserializeTiddlers(type, compressedStoreArea, tiddlerFields, {
              deserializer: deserializer
            })
          )
        }
      } else {
        // Check whether this is an encrypted TiddlyWiki file
        var encryptedStoreArea = $tw.utils.extractEncryptedStoreArea(text)
        if (encryptedStoreArea) {
          if (
            !$tw.utils.decryptEncryptedStoreArea(encryptedStoreArea, callback)
          ) {
            callback(
              self.deserializeTiddlers(
                type,
                encryptedStoreArea,
                tiddlerFields,
                {
                  deserializer: deserializer
                }
              )
            )
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
    }
    // Kick off the read
    if (isBinary) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file)
    }
  }
})()
