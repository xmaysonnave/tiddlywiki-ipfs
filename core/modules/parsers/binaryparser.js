/*\
title: $:/core/modules/parsers/binaryparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The binary parser parses a binary tiddler into a warning message and download link

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ipfs-binaryparser'

  var BINARY_WARNING_MESSAGE = '$:/core/ui/BinaryWarning'
  var EXPORT_BUTTON_IMAGE = '$:/core/images/export-button'

  var BinaryParser = function (type, text, options) {
    var self = this
    var value = `data:${type};base64,`
    // Transclude the binary data tiddler warning message
    var warn = {
      type: 'element',
      tag: 'p',
      children: [
        {
          type: 'transclude',
          attributes: {
            tiddler: { type: 'string', value: BINARY_WARNING_MESSAGE },
          },
        },
      ],
    }
    // Create download link based on binary tiddler title
    var link = {
      type: 'element',
      tag: 'a',
      attributes: {
        title: { type: 'indirect', textReference: '!!title' },
        download: { type: 'indirect', textReference: '!!title' },
      },
      children: [
        {
          type: 'transclude',
          attributes: {
            tiddler: { type: 'string', value: EXPORT_BUTTON_IMAGE },
          },
        },
      ],
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
                    link.attributes.href = {
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
        link.attributes.href = {
          type: 'string',
          value: `${value}${text}`,
        }
      }
    }
    // Combine warning message and download link in a div
    var element = {
      type: 'element',
      tag: 'div',
      attributes: {
        class: { type: 'string', value: 'tc-binary-warning' },
      },
      children: [warn, link],
    }
    this.tree = [element]
  }

  exports['application/octet-stream'] = BinaryParser
})()
