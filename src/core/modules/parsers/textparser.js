/*\
title: $:/plugins/ipfs/modules/parsers/textparser.js
type: application/javascript
module-type: parser

The plain text parser processes blocks of source text into a degenerate parse tree consisting of a single text node

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  var TextParser = function (type, text, options) {
    var self = this
    var element = {
      type: 'codeblock',
      attributes: {
        code: { type: 'string', value: '' },
        language: { type: 'string', value: type }
      }
    }
    if (
      $tw.browser &&
      options.tiddler !== undefined &&
      options.tiddler !== null
    ) {
      var canonicalUri = options.tiddler.fields._canonical_uri
      canonicalUri =
        canonicalUri === undefined ||
        canonicalUri == null ||
        canonicalUri.trim() === ''
          ? null
          : canonicalUri.trim()
      if (canonicalUri !== null) {
        var password = options.tiddler.fields._password
        password =
          password === undefined || password == null || password.trim() === ''
            ? null
            : password.trim()
        $tw.ipfs
          .resolveUrl(false, true, canonicalUri)
          .then(data => {
            var { normalizedUrl, resolvedUrl } = data
            var url =
              resolvedUrl !== null
                ? resolvedUrl.toString()
                : normalizedUrl !== null
                ? normalizedUrl.toString()
                : null
            if (url !== null) {
              $tw.ipfs
                .loadToUtf8(url, password)
                .then(data => {
                  if (data) {
                    element.attributes.code.value = data
                    var parsedTiddler = $tw.utils.getChangedTiddler(
                      options.tiddler
                    )
                    $tw.rootWidget.refresh(parsedTiddler)
                  }
                })
                .catch(error => {
                  self.getLogger().error(error)
                  $tw.utils.alert(name, error.message)
                })
            }
          })
          .catch(error => {
            self.getLogger().error(error)
          })
      } else if (text) {
        element.attributes.code.value = text
      }
    }
    // Return the parsed tree
    this.tree = [element]
  }

  TextParser.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  exports['application/javascript'] = TextParser
  exports['application/json'] = TextParser
  exports['application/x-tiddler-dictionary'] = TextParser
  exports['text/css'] = TextParser
  exports['text/plain'] = TextParser
  exports['text/x-tiddlywiki'] = TextParser
})()
