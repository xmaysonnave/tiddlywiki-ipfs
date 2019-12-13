/*\
title: $:/plugins/ipfs/parsers/imageparser.js
type: application/javascript
module-type: parser

The image parser parses an image into an embeddable HTML element

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ImageParser = function() {
  this.init = false;
};

ImageParser.prototype.initParser = function(type,text,options) {
  if (this.init) {
    return;
  }
  const uri = options._canonical_uri;
  const tiddler = options.tiddler;
  const isEncrypted = tiddler.hasTag("$:/isEncrypted");
  var value = "data:" + type + ";base64,";
  var element = {
      type: "element",
      tag: "img",
      attributes: {}
    };
  // Decrypt or not external resource
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

exports["image/jpg"] = ImageParser;
exports["image/jpeg"] = ImageParser;
exports["image/png"] = ImageParser;
exports["image/gif"] = ImageParser;
exports["image/webp"] = ImageParser;
exports["image/heic"] = ImageParser;
exports["image/heif"] = ImageParser;
exports["image/x-icon"] = ImageParser;

exports.ImageParser = ImageParser;

})();

