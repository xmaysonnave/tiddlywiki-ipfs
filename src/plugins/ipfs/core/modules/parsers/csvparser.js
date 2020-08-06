/*\
title: $:/core/modules/parsers/csvparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The CSV text parser processes CSV files into a table wrapped in a scrollable widget

\*/

/**
 * TiddlyWiki created by Jeremy Ruston, (jeremy [at] jermolene [dot] com)
 *
 * Copyright (c) 2004-2007, Jeremy Ruston
 * Copyright (c) 2007-2018, UnaMesa Association
 * Copyright (c) 2019-2020, Blue Light
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

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
                    self.split(data)
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
