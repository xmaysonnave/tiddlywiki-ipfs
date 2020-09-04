/*\
title: $:/boot/boothandler.js
type: application/javascript
tags: $:/ipfs/core

\*/
var bootHandler = function ($tw) {
  /*jslint node: true, browser: true */
  'use strict'
  if ($tw.browser && !$tw.boot.suppressBoot) {
    $tw.boot.boot()
  }
  return $tw
}

if (typeof exports === 'undefined') {
  // Set up $tw global for the browser
  window.$tw = bootHandler(window.$tw)
} else {
  // Export functionality as a module
  exports.bootHandler = bootHandler
}
