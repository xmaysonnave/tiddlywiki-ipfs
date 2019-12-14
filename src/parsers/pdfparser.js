/*\
title: $:/core/modules/parsers/pdfparser.js
type: application/javascript
module-type: parser

The PDF parser embeds a PDF viewer

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var PdfParser = function(type,text,options) {
  let self = this;
  let uri = options._canonical_uri;
  let tiddler = options.tiddler;
  let isEncrypted = tiddler !== undefined ? tiddler.hasTag("$:/isEncrypted") : false;
  let value = "data:application/pdf;base64,";
  let element = {
    type: "element",
    tag: "embed",
    attributes: {}
  };
  if (uri && isEncrypted) {
    $tw.utils.loadAndDecryptToBase64(uri)
    .then( (base64) => {
      element.attributes.src = { type: "string", value: value + base64 };
      self.tree = [element];
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    })
    .catch( (error) => {
      console.error(error);
      element.attributes.src = { type: "string", value: uri };
      self.tree = [element];
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
};

exports["application/pdf"] = PdfParser;

})();
