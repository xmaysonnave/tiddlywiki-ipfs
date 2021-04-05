/*\
title: $:/core/modules/parsers/videoparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The video parser parses a video tiddler into an embeddable HTML element

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const name = 'ipfs-videoparser'

  var VideoParser = function (type, text, options) {
    var value = `data:${type};base64,`
    var element = {
      type: 'element',
      tag: 'video',
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

  exports['video/mp4'] = VideoParser
  exports['video/ogg'] = VideoParser
  exports['video/quicktime'] = VideoParser
  exports['video/webm'] = VideoParser
})()
