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
      canonicalUri = canonicalUri !== undefined && canonicalUri !== null && canonicalUri.toString().trim() !== '' ? canonicalUri.toString().trim() : null
      if (canonicalUri !== null) {
        var password = options.tiddler.fields._password
        password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
        $tw.ipfs
          .resolveUrl(canonicalUri, false, false, true)
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
