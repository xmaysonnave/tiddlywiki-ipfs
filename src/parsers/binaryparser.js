/*\
title: $:/plugins/ipfs/parsers/binaryparser.js
type: application/javascript
module-type: parser

The video parser parses a video tiddler into an embeddable HTML element

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var BINARY_WARNING_MESSAGE = "$:/core/ui/BinaryWarning";

var BinaryParser = function() {
	this.init = false;
};

BinaryParser.prototype.initParser = function(type,text,options) {
	if (this.init) {
		return;
	}
	this.tree = [{
		type: "transclude",
		attributes: {
			tiddler: {type: "string", value: BINARY_WARNING_MESSAGE}
		}
	}];
	this.init = false;
};

exports["application/octet-stream"] = BinaryParser;

exports.BinaryParser = BinaryParser;

})();

