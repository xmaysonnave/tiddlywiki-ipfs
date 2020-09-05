/*\
title: $:/boot/boothandler.js
type: application/javascript

\*/
var bootHandler = function ($tw) {
  /*jslint node: true, browser: true */
  'use strict'
  if (!$tw) {
    throw new Error('Undefined TiddlyWiki...')
  }
  if (!$tw.boot) {
    throw new Error('Undefined TiddlyWiki boot...')
  }
  if ($tw.browser && !$tw.boot.suppressBoot) {
    $tw.boot.boot()
  }
}

if (typeof exports === 'undefined') {
  bootHandler(window.$tw)
} else {
  // Export functionality as a module
  exports.bootHandler = bootHandler
}
