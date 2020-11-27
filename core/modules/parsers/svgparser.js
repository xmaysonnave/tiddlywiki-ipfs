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

  const name = 'ipfs-svgparser'

  var SvgParser = function (type, text, options) {
    var value = 'data:image/svg+xml,'
    var element = {
      type: 'element',
      tag: 'img',
      attributes: {}
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
                    element.attributes.src = {
                      type: 'string',
                      value: value + encodeURIComponent(data)
                    }
                    var parsedTiddler = $tw.utils.getChangedTiddler(
                      options.tiddler
                    )
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
      } else {
        element.attributes.src = {
          type: 'string',
          value: value + encodeURIComponent(text)
        }
      }
    }
    // Return the parsed tree
    this.tree = [element]
  }

  exports['image/svg+xml'] = SvgParser
  exports['.svg'] = SvgParser
})()
