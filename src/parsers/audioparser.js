/*\
title: $:/core/modules/parsers/audioparser.js
type: application/javascript
module-type: parser

The audio parser parses an audio tiddler into an embeddable HTML element

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var AudioParser = function(type,text,options) {
  let self = this;
  let uri = options._canonical_uri;
  let tiddler = options.tiddler;
  let isEncrypted = tiddler !== undefined ? tiddler.hasTag("$:/isEncrypted") : false;
  let value = "data:" + type + ";base64,";
  let element = {
    type: "element",
    tag: "audio",
    attributes: {
      controls: { type: "string", value: "controls" },
      style: { type: "string", value: "width: 100%; object-fit: contain" }
    }
  };
  // Decrypt or not external resource
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
      element.attributes.src = { type: "string", value: uri} ;
    } else if (text) {
      element.attributes.src = { type: "string", value: value + text} ;
    }
  }
  this.tree = [element];
}

exports["audio/ogg"] = AudioParser;
exports["audio/mpeg"] = AudioParser;
exports["audio/mp3"] = AudioParser;
exports["audio/mp4"] = AudioParser;

})();
