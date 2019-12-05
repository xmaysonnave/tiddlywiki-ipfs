/*\
title: $:/core/modules/parsers/imageparser.js
type: application/javascript
module-type: parser

The image parser parses an image into an embeddable HTML element

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ImageParser = function(type,text,options) {
	const canonical_uri =  options._canonical_uri;
	const tiddler =  options.tiddler;
	var value = "data:" + type + ";base64,";
	var element = {
			type: "element",
			tag: "img",
			attributes: {}
		};
	// Decrypt or not external resource
	if (tiddler && canonical_uri && tiddler.hasTag("$:/isEncrypted")) {
		$tw.utils.parserDecryptBase64(tiddler, value, element);
	} else {
		if (canonical_uri) {
			element.attributes.src = {type: "string", value: canonical_uri};
		} else if (text) {
			element.attributes.src = {type: "string", value: value + text};
		}
	}
	this.tree = [element];
};

exports["image/jpg"] = ImageParser;
exports["image/jpeg"] = ImageParser;
exports["image/png"] = ImageParser;
exports["image/gif"] = ImageParser;
exports["image/webp"] = ImageParser;
exports["image/heic"] = ImageParser;
exports["image/heif"] = ImageParser;
exports["image/x-icon"] = ImageParser;

})();

