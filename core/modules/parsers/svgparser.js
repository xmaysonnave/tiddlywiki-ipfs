/*\
title: $:/core/modules/parsers/svgparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The image parser parses an image into an embeddable HTML element

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars: "off"*/
  const name = 'ipfs-svgparser'

  var SvgParser = function (type, text, options) {
    var value = 'data:image/svg+xml;utf8,'
    var element = {
      type: 'element',
      tag: 'img',
      attributes: {},
    }
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
                  if (data !== undefined && data !== null) {
                    var { content } = data
                    element.attributes.src = {
                      type: 'string',
                      value: `${value}${encodeURIComponent(content)}`,
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
        element.attributes.src = {
          type: 'string',
          value: `${value}${encodeURIComponent(text)}`,
        }
      }
    }
    // Return the parsed tree
    this.tree = [element]
  }

  exports['image/svg+xml'] = SvgParser
  exports['.svg'] = SvgParser
})()
