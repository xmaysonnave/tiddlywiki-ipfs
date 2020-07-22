/*\
title: $:/plugins/ipfs/modules/parsers/csvparser.js
type: application/javascript
module-type: parser

The CSV text parser processes CSV files into a table wrapped in a scrollable widget

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  var CsvParser = function (type, text, options) {
    var self = this
    // Table framework
    this.tree = [
      {
        type: 'scrollable',
        children: [
          {
            type: 'element',
            tag: 'table',
            children: [
              {
                type: 'element',
                tag: 'tbody',
                children: []
              }
            ],
            attributes: {
              class: { type: 'string', value: 'tc-csv-table' }
            }
          }
        ]
      }
    ]
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
                .loadToUtf8(url)
                .then(data => {
                  self.split(text)
                  var parsedTiddler = $tw.utils.getChangedTiddler(
                    options.tiddler
                  )
                  $tw.rootWidget.refresh(parsedTiddler)
                })
                .catch(error => {
                  self.getLogger().error(error)
                  $tw.utils.alert(name, error.message)
                })
            }
          })
          .catch(error => {
            self.getLogger().error(error)
          })
      } else if (text) {
        this.split(text)
      }
    }
  }

  CsvParser.prototype.split = function (text) {
    // Split the text into lines
    var lines = text.split(/\r?\n/gm)
    var tag = 'th'
    for (var line = 0; line < lines.length; line++) {
      var lineText = lines[line]
      if (lineText) {
        var row = {
          type: 'element',
          tag: 'tr',
          children: []
        }
        var columns = lineText.split(',')
        for (var column = 0; column < columns.length; column++) {
          row.children.push({
            type: 'element',
            tag: tag,
            children: [
              {
                type: 'text',
                text: columns[column]
              }
            ]
          })
        }
        tag = 'td'
        this.tree[0].children[0].children[0].children.push(row)
      }
    }
  }

  exports['text/csv'] = CsvParser
})()
