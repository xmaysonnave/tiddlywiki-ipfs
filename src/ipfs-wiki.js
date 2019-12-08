/*\
title: $:/plugins/ipfs/ipfs-wiki.js
type: application/javascript
module-type: wikimethod

Extension methods for the $tw.Wiki object

Adds the following properties to the wiki object:

* `eventListeners` is a hashmap by type of arrays of listener functions
* `changedTiddlers` is a hashmap describing changes to named tiddlers since wiki change events were last dispatched. Each entry is a hashmap containing two fields:
  modified: true/false
  deleted: true/false
* `changeCount` is a hashmap by tiddler title containing a numerical index that starts at zero and is incremented each time a tiddler is created changed or deleted
* `caches` is a hashmap by tiddler title containing a further hashmap of named cache objects. Caches are automatically cleared when a tiddler is modified or deleted
* `globalCache` is a hashmap by cache name of cache objects that are cleared whenever any tiddler change occurs

\*/
( function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Parse a block of text of a specified MIME type
  type: content type of text to be parsed
  text: text
  options: see below
Options include:
  parseAsInline: if true, the text of the tiddler will be parsed as an inline run
  _canonical_uri: optional string of the canonical URI of this content
*/
exports.parseText = function(type,text,options) {
  var text = text || "";
  var options = options || {};
  // Select a parser
  var Parser = $tw.Wiki.parsers[type];
  if(!Parser && $tw.utils.getFileExtensionInfo(type)) {
    Parser = $tw.Wiki.parsers[$tw.utils.getFileExtensionInfo(type).type];
  }
  if(!Parser) {
    Parser = $tw.Wiki.parsers[options.defaultType || "text/vnd.tiddlywiki"];
  }
  if(!Parser) {
    return null;
  }
  // Return the parser instance
  return new Parser(type,text, {
    parseAsInline: options.parseAsInline,
    wiki: this,
    _is_encrypted: options._is_encrypted,
    _canonical_uri: options._canonical_uri
  });
};

/*
Parse a tiddler according to its MIME type
*/
exports.parseTiddler = function(title,options) {
  options = $tw.utils.extend({},options);
  var cacheType = options.parseAsInline ? "inlineParseTree" : "blockParseTree",
    tiddler = this.getTiddler(title),
    self = this;
  return tiddler ? this.getCacheForTiddler(title,cacheType,function() {
      if(tiddler.hasField("_canonical_uri")) {
        options._canonical_uri = tiddler.fields._canonical_uri;
      }
      if(tiddler.hasTag("$:/isEncrypted")) {
        options._is_encrypted = true;
      }
      return self.parseText(tiddler.fields.type,tiddler.fields.text,options);
    }) : null;
};

})();
