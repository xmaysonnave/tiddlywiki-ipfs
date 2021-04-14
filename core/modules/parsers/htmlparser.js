/*\
title: $:/core/modules/parsers/htmlparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The HTML parser displays text as raw HTML

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars: "off"*/
  const name = 'ipfs-htmlparser'

  var HtmlParser = function (type, text, options) {
    var value = 'data:text/html;charset=utf-8,'
    var src
    if ($tw.browser && options.tiddler !== undefined && options.tiddler !== null) {
      var canonicalUri = options.tiddler.fields._canonical_uri
      canonicalUri = canonicalUri !== undefined && canonicalUri !== null && canonicalUri.toString().trim() !== '' ? canonicalUri.toString().trim() : null
      if ((text || '') === '' && canonicalUri !== null) {
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
                    src = value + encodeURIComponent(data)
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
      } else if (text !== undefined && text !== null) {
        src = value + encodeURIComponent(text)
      }
    }
    this.tree = [
      {
        type: 'element',
        tag: 'iframe',
        attributes: {
          src: { type: 'string', value: src },
          sandbox: { type: 'string', value: 'allow-scripts' },
        },
      },
    ]
  }

  exports['text/html'] = HtmlParser
})()
