/*\
title: $:/core/modules/parsers/svgparser.js
type: application/javascript
module-type: parser

The image parser parses an image into an embeddable HTML element

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var SvgParser = function(type,text,options) {
  let self = this;
  let uri = options._canonical_uri;
  let tiddler = options.tiddler;
  let isEncrypted = tiddler !== undefined ? tiddler.hasTag("$:/isEncrypted") : false;
  let value = "data:image/svg+xml,";
  let element = {
    type: "element",
    tag: "img",
    attributes: {}
  };
  // Decrypt or not external resource
  if (uri && isEncrypted) {
    $tw.utils.loadAndDecryptToUtf8(uri)
    .then( (data) => {
      element.attributes.src = { type: "string", value: value + encodeURIComponent(data) };
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
      element.attributes.src = { type: "string", value: value + encodeURIComponent(text) };
    }
  }
  this.tree = [element];
};

exports["image/svg+xml"] = SvgParser;

})();

