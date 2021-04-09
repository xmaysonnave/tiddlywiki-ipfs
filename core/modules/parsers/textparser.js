/*\
title: $:/core/modules/parsers/textparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The plain text parser processes blocks of source text into a degenerate parse tree consisting of a single text node

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  var TextParser = function (type, text, options) {
    var element = {
      type: 'codeblock',
      attributes: {
        code: { type: 'string', value: text },
        language: { type: 'string', value: type },
      },
    }
    if ($tw.browser && options.tiddler !== undefined && options.tiddler !== null) {
      var canonicalUri = options.tiddler.fields._canonical_uri
      canonicalUri = canonicalUri !== undefined && canonicalUri !== null && canonicalUri.toString().trim() !== '' ? canonicalUri.toString().trim() : null
      if (canonicalUri !== null) {
        var password = options.tiddler.fields._password
        password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
        $tw.ipfs
          .resolveUrl(canonicalUri, false, false, false)
          .then(data => {
            var { resolvedUrl } = data
            if (resolvedUrl !== null) {
              $tw.ipfs
                .loadToUtf8(resolvedUrl, password)
                .then(data => {
                  if (data) {
                    element.attributes.code.value = data
                    var parsedTiddler = $tw.utils.getChangedTiddler(options.tiddler)
                    $tw.rootWidget.refresh(parsedTiddler)
                  }
                })
                .catch(error => {
                  $tw.ipfs.getLogger().error(error)
                  $tw.utils.alert(name, error.message)
                })
            }
          })
          .catch(error => {
            $tw.ipfs.getLogger().error(error)
          })
      }
    }
    // Return the parsed tree
    this.tree = [element]
  }

  exports['application/javascript'] = TextParser
  exports['application/json'] = TextParser
  exports['application/x-tiddler-dictionary'] = TextParser
  exports['text/css'] = TextParser
  exports['text/plain'] = TextParser
  exports['text/x-tiddlywiki'] = TextParser
})()
