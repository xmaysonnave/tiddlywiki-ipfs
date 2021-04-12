/*\
title: $:/core/modules/parsers/pdfparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The PDF parser embeds a PDF viewer

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars: "off"*/
  const name = 'ipfs-pdfparser'

  var PdfParser = function (type, text, options) {
    var value = 'data:application/pdf;base64,'
    var element = {
      type: 'element',
      tag: 'embed',
      attributes: {},
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
                .loadToBase64(resolvedUrl, password)
                .then(data => {
                  if (data) {
                    element.attributes.src = {
                      type: 'string',
                      value: `${value}${data}`,
                    }
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
        element.attributes.src = { type: 'string', value: `${value}${text}` }
      }
    }
    // Return the parsed tree
    this.tree = [element]
  }

  exports['application/pdf'] = PdfParser
})()
