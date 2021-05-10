/*\
title: $:/plugins/ipfs/macros/version-url.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  exports.name = 'version-url'

  exports.params = [{ name: 'title' }, { name: 'ipath' }]

  exports.run = function (title, ipath) {
    title = title !== undefined && title !== null && title.trim() !== '' ? title.trim() : null
    if (title === null) {
      return ''
    }
    ipath = ipath !== undefined && ipath !== null && ipath.trim() !== '' ? ipath.trim() : ''
    const rootBuild = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler('$:/ipfs/build/ipns/cid') : null
    const tiddler = $tw !== undefined && $tw !== null ? $tw.wiki.getTiddler(title) : null
    if (rootBuild !== undefined && rootBuild !== null && tiddler !== undefined && tiddler !== null) {
      if (ipath === 'editions') {
        return `${rootBuild.fields.text}/editions/${tiddler.fields.name}/${tiddler.fields.build}/`
      } else {
        return `${rootBuild.fields.text}/${ipath}/${tiddler.fields.build}/`
      }
    }
    return ''
  }
})()
