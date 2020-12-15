/*\
title: $:/core/modules/parsers/audioparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The audio parser parses an audio tiddler into an embeddable HTML element

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  var name = 'ipfs-audioparser'

  var AudioParser = function (type, text, options) {
    var value = `data:${type};base64,`
    var element = {
      type: 'element',
      tag: 'audio',
      attributes: {
        controls: { type: 'string', value: 'controls' },
        style: { type: 'string', value: 'width: 100%; object-fit: contain' },
      },
    }
    if ($tw.browser && options.tiddler !== undefined && options.tiddler !== null) {
      var canonicalUri = options.tiddler.fields._canonical_uri
      canonicalUri = canonicalUri === undefined || canonicalUri == null || canonicalUri.trim() === '' ? null : canonicalUri.trim()
      if (canonicalUri !== null) {
        var password = options.tiddler.fields._password
        password = password === undefined || password == null || password.trim() === '' ? null : password.trim()
        $tw.ipfs
          .resolveUrl(false, true, canonicalUri)
          .then(data => {
            var { normalizedUrl, resolvedUrl } = data
            var url = resolvedUrl !== null ? resolvedUrl.toString() : normalizedUrl !== null ? normalizedUrl.toString() : null
            if (url !== null) {
              $tw.ipfs
                .loadToBase64(url, password)
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
      } else if (text) {
        element.attributes.src = { type: 'string', value: `${value}${text}` }
      }
    }
    // Return the parsed tree
    this.tree = [element]
  }

  exports['audio/ogg'] = AudioParser
  exports['audio/mpeg'] = AudioParser
  exports['audio/mp3'] = AudioParser
  exports['audio/mp4'] = AudioParser
})()
