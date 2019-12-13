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

var PdfParser = function() {
  this.init = false;
};

PdfParser.prototype.initParser = function(type,text,options) {
  if (this.init) {
    return;
  }
  const uri = options._canonical_uri;
  const tiddler = options.tiddler;
  const isEncrypted = tiddler.hasTag("$:/isEncrypted");
  const value = "data:application/pdf;base64,";
  var element = {
      type: "element",
      tag: "embed",
      attributes: {}
    },
    src;
  if (uri && isEncrypted) {
    $tw.utils.loadAndDecryptToBase64(uri)
    .then( (base64) => {
      element.attributes.src = { type: "string", value: value + base64 };
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    })
    .catch( (error) => {
      console.error(error);
      element.attributes.src = { type: "string", value: uri };
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    });
  } else {
    if (uri) {
      element.attributes.src = { type: "string", value: uri };
    } else if (text) {
      element.attributes.src = { type: "string", value: value + text };
    }
  }
  this.tree = [element];
  this.init = true;
};

exports["application/pdf"] = PdfParser;

exports.PdfParser = PdfParser;

})();
