/*\
title: $:/plugins/ipfs/ipfs-normalize.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
 * Information about this macro
 */
exports.name = "ipfs-normalize-uri";

exports.params = [
  "uri"
];

/*
 * Run the macro
 */
exports.run = function(uri) {
  // Check
  if (uri == undefined || uri == null || uri.trim() === "") {
    return "_canonical_uri";
  }
  const title = this.getVariable("currentTiddler");
  if (title == undefined || title == null || title.trim() === "") {
    return "";
  }
  const tiddler = this.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    return "";
  }
  const field = tiddler.getFieldString(uri);
  if (field == undefined || field == null || field.trim() === "") {
    return "";
  }
  // Process
  return $tw.ipfs.normalizeUrl(field);
};

exports.getLogger = function() {
  return window.log.getLogger(name);
}

})();