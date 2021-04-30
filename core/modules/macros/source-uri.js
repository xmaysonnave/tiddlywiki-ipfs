/*\
title: $:/core/modules/macros/source-uri.js
type: application/javascript
module-type: macro

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.name = 'sourceuri'

  exports.params = [{ name: 'field' }]

  exports.run = function (field) {
    field = field !== undefined && field !== null && field.trim() !== '' ? field.trim() : null
    const title = this.getVariable('currentTiddler')
    var tiddler = !!title && $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler(`${title}-build`) : null
    if (field !== null && tiddler !== undefined && tiddler !== null && tiddler.fields[field] !== undefined) {
      return encodeURI(tiddler.fields[field])
    }
    return ''
  }
})()
