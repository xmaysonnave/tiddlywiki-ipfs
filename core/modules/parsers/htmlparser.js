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
    var src = ''
    var self = this
    var value = 'data:text/html;charset=utf-8,'
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
              self.tree[0].attributes.src = { type: 'string', value: resolvedUrl.href }
              var parsedTiddler = $tw.utils.getChangedTiddler(options.tiddler)
              $tw.rootWidget.refresh(parsedTiddler)
            }
          })
          .catch(error => {
            $tw.ipfs.getLogger().error(error)
          })
      } else if (text !== undefined && text !== null) {
        src = `${value}${encodeURIComponent(text)}`
      }
    }
    this.tree = [
      {
        type: 'element',
        tag: 'iframe',
        attributes: {
          src: { type: 'string', value: src },
        },
      },
    ]
    if ($tw.wiki.getTiddlerText('$:/config/HtmlParser/DisableSandbox', 'no') !== 'yes') {
      var tokens = $tw.wiki.getTiddlerText('$:/config/HtmlParser/SandboxTokens', '')
      if ($tw.browser && options.tiddler !== undefined && options.tiddler !== null) {
        var tiddlerTokens = options.tiddler.getFieldString('_sandbox_tokens')
        tiddlerTokens = tiddlerTokens !== undefined && tiddlerTokens !== null && tiddlerTokens.trim() !== '' ? tiddlerTokens.trim() : null
        if (tiddlerTokens !== null) {
          tokens = tiddlerTokens
        }
      }
      this.tree[0].attributes.sandbox = { type: 'string', value: tokens }
    }
  }

  exports['text/html'] = HtmlParser
})()
