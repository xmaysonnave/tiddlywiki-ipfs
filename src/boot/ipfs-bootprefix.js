/*\
title: $:/boot/ipfs-bootprefix.js
type: application/javascript
tags: $:/ipfs/core

\*/
var ipfsBootPrefix = function ($tw) {
  /*jslint node: true, browser: true */
  'use strict'

  $tw = $tw || Object.create(null)
  $tw.boot = $tw.boot || Object.create(null)
  $tw.boot.suppressBoot = true

  return $tw
}

if (typeof exports === 'undefined') {
  // Set up $tw global for the browser
  window.$tw = ipfsBootPrefix(window.$tw)
} else {
  // Export functionality as a module
  exports.ipfsBootPrefix = ipfsBootPrefix
}
