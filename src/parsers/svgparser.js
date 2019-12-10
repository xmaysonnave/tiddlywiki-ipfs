/*\
title: $:/plugins/ipfs/parsers/svgparser.js
type: application/javascript
module-type: parser

The image parser parses an image into an embeddable HTML element

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ImageParser = function(type,text,options) {
  const canonical_uri = options._canonical_uri;
  const tiddler = options.tiddler;
  const isEncrypted = tiddler.hasTag("$:/isEncrypted");
  var value = "data:image/svg+xml,";
  var element = {
      type: "element",
      tag: "img",
      attributes: {}
    };
  // Decrypt or not external resource
  if (canonical_uri && isEncrypted) {
    $tw.utils.loadAndDecryptToUtf8(tiddler, value, element);
  } else {
    if (canonical_uri) {
      $tw.utils.loadToUtf8(tiddler, value, element);
    } else if (text) {
      element.attributes.src = { type: "string", value: value + encodeURIComponent(text) };
    }
  }
  this.tree = [element];
};

exports["image/svg+xml"] = ImageParser;

})();

