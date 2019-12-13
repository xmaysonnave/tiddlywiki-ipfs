/*\
title: $:/ipfs/plugins/parsers/wikiparser/ipfs-wikiparser.js
type: application/javascript
module-type: parser

The wiki text parser processes blocks of source text into a parse tree.

The parse tree is made up of nested arrays of these JavaScript objects:

  {type: "element", tag: <string>, attributes: {}, children: []} - an HTML element
  {type: "text", text: <string>} - a text node
  {type: "entity", value: <string>} - an entity
  {type: "raw", html: <string>} - raw HTML

Attributes are stored as hashmaps of the following objects:

  {type: "string", value: <string>} - literal string
  {type: "indirect", textReference: <textReference>} - indirect through a text reference
  {type: "macro", macro: <TBD>} - indirect through a macro invocation

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const WikiParser = require("$:/ipfs/plugins/parsers/wikiparser/wikiparser.js").WikiParser;

var IpfsWikiParser = function() {
  IpfsWikiParser.call(this);
};

IpfsWikiParser.prototype = Object.create(WikiParser.prototype);
IpfsWikiParser.prototype.constructor = IpfsWikiParser;

/*
*/
IpfsWikiParser.prototype.loadRemoteTiddler = function(options) {
  const uri = options._canonical_uri;
  const hostTiddler = options.tiddler;
  const isEncrypted = hostTiddler.hasTag("$:/isEncrypted");
  var self = this;
  if (isEncrypted) {
    $tw.utils.loadAndDecryptToUtf8(uri)
    .then( (data) => {
      self.importTiddlers(self, hostTiddler, uri, data);
    })
    .catch( (error) => {
      console.error(error);
    });
  } else {
    $tw.utils.loadToUtf8(uri)
    .then( (data) => {
      self.importTiddlers(self, hostTiddler, uri, data);
    })
    .catch( (error) => {
      console.error(error);
    });
  }
};

IpfsWikiParser.prototype.importTiddlers = function(self, tiddler, uri, data) {
  const importedTiddlers = self.wiki.deserializeTiddlers(".tid",data,self.wiki.getCreationFields());
  const addTags = (tiddler.fields.tags || []).slice(0);
  const title = tiddler.getFieldString("title");
  $tw.utils.each(importedTiddlers, function(importedTiddler) {
    importedTiddler["_canonical_uri"] = uri;
    var importedTags = importedTiddler["tags"] == undefined ? "" : importedTiddler["tags"];
    for (var i = 0; i < addTags.length; i++) {
      const tag = addTags[i];
      if (importedTags.includes(tag) == false) {
        importedTags = importedTags + " " + tag;
      }
    }
    importedTiddler["tags"] = importedTags;
    if (importedTiddler["title"] !== title) {
      importedTiddler["_imported_title"] = importedTiddler["title"];
    }
    importedTiddler["title"] = title;
    self.wiki.addTiddler(importedTiddler);
  });
}

exports["text/vnd.tiddlywiki"] = IpfsWikiParser;

exports.IpfsWikiParser = IpfsWikiParser;

})();

