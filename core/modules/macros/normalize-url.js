/*\
title: $:/core/modules/macros/normalize-url.js
type: application/javascript
module-type: macro

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  exports.name = 'normalizeurl'

  exports.params = [{ name: 'field' }, { name: 'suffix' }, { name: 'normalize' }]

  exports.run = function (field, suffix, normalize) {
    field = field !== undefined && field !== null && field.trim() !== '' ? field.trim() : null
    if (field == null) {
      return ''
    }
    suffix = suffix !== undefined && suffix !== null && suffix.trim() !== '' ? `-${suffix.trim()}` : ''
    normalize = normalize === 'yes' || false
    const currentTitle = this.getVariable('currentTiddler')
    const currentTiddler = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler(currentTitle) : null
    var suffixedTiddler = null
    if (suffix !== '') {
      suffixedTiddler = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler(`${currentTitle}${suffix}`) : null
    }
    if (suffixedTiddler !== undefined && suffixedTiddler !== null && suffixedTiddler.fields[field] !== undefined) {
      if (normalize) {
        const url = $tw.ipfs.normalizeUrl(suffixedTiddler.fields[field])
        return url !== undefined && url !== null ? decodeURI(url.toString()) : ''
      }
      return suffixedTiddler.fields[field]
    }
    if (currentTiddler.fields[field] !== undefined) {
      if (normalize) {
        const url = $tw.ipfs.normalizeUrl(currentTiddler.fields[field])
        return url !== undefined && url !== null ? decodeURI(url.toString()) : ''
      }
      return currentTiddler.fields[field]
    }
    return ''
  }
})()
