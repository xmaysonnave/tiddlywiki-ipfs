/*\
title: $:/plugins/ipfs/parsers/videoparser.js
type: application/javascript
module-type: parser

The video parser parses a video tiddler into an embeddable HTML element

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var VideoParser = function(type,text,options) {
  const uri = options._canonical_uri;
  const tiddler = options.tiddler;
  const isEncrypted = tiddler.hasTag("$:/isEncrypted");
  const value = "data:" + type + ";base64,";
  var element = {
      type: "element",
      tag: "video",
      attributes: {
        controls: {type: "string", value: "controls"},
        style: {type: "string", value: "width: 100%; object-fit: contain"}
      }
    },
    src;
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
};

exports["video/mp4"] = VideoParser;
exports["video/quicktime"] = VideoParser;

})();

