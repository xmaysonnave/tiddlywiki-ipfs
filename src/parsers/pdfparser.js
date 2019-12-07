/*\
title: $:/plugins/ipfs/parsers/pdfparser.js
type: application/javascript
module-type: parser

The PDF parser embeds a PDF viewer

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ImageParser = function(type,text,options) {
  const canonical_uri =  options._canonical_uri;
  const tiddler =  options.tiddler;
  const value = "data:application/pdf;base64,";
  var element = {
      type: "element",
      tag: "embed",
      attributes: {}
    },
    src;
  // Decrypt or not external resource
  if (tiddler && canonical_uri && tiddler.hasTag("$:/isEncrypted")) {
    $tw.utils.parserDecryptBase64(tiddler, value, element);
  } else {
    if (canonical_uri) {
      element.attributes.src = {type: "string", value: canonical_uri};
    } else if (text) {
      element.attributes.src = {type: "string", value: value + text};
    }
  }
  this.tree = [element];
};

exports["application/pdf"] = ImageParser;

})();
