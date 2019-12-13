/*\
title: $:/core/modules/parsers/textparser.js
type: application/javascript
module-type: parser

The plain text parser processes blocks of source text into a degenerate parse tree consisting of a single text node

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var TextParser = function() {
	this.init = false;
};

TextParser.prototype.initParser = function(type,text,options) {
	if (this.init) {
		return;
	}
	this.tree = [{
		type: "codeblock",
		attributes: {
			code: {type: "string", value: text},
			language: {type: "string", value: type}
		}
	}];
	this.init = true;
};

exports["text/plain"] = TextParser;
exports["text/x-tiddlywiki"] = TextParser;
exports["application/javascript"] = TextParser;
exports["application/json"] = TextParser;
exports["text/css"] = TextParser;
exports["application/x-tiddler-dictionary"] = TextParser;

exports.TextParser = TextParser;

})();

