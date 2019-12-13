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

var SvgParser = function() {
  this.init = false;
};

SvgParser.prototype.initParser = function(type,text,options) {
  if (this.init) {
    return;
  }
  const uri = options._canonical_uri;
  const tiddler = options.tiddler;
  const isEncrypted = tiddler.hasTag("$:/isEncrypted");
  const value = "data:image/svg+xml,";
  var element = {
      type: "element",
      tag: "img",
      attributes: {}
    };
  // Decrypt or not external resource
  if (uri && isEncrypted) {
    $tw.utils.loadAndDecryptToUtf8(uri)
    .then( (data) => {
      element.attributes.src = { type: "string", value: value + encodeURIComponent(data) };
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    })
    .catch( (error) => {
      console.error(error);
      const changedTiddlers = $tw.utils.getChangedTiddlers(tiddler);
      $tw.rootWidget.refresh(changedTiddlers);
    });
  } else {
    if (uri) {
      $tw.utils.loadToUtf8(uri)
      .then( (data) => {
        element.attributes.src = { type: "string", value: value + encodeURIComponent(data) };
        $tw.rootWidget.refresh([tiddler]);
      })
      .catch( (error) => {
        console.error(error);
        $tw.rootWidget.refresh([tiddler]);
      });
    } else if (text) {
      element.attributes.src = { type: "string", value: value + encodeURIComponent(text) };
    }
  }
  this.tree = [element];
  this.init = true;
};

exports["image/svg+xml"] = SvgParser;

exports.SvgParser = SvgParser;

})();

