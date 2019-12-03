/*\
title: $:/plugins/ipfs/parsers/pdfparser.js
type: application/javascript
module-type: parser

The PDF parser embeds a PDF viewer

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

var ImageParser = function(type,text,options) {
	const canonical_uri =  options._canonical_uri;
	const tiddler =  options.tiddler;
	let element = {
			type: "element",
			tag: "embed",
			attributes: {}
		},
		src;
	// Check for an externally encrypted linked pdf
	if($tw.browser && canonical_uri && tiddler.hasTag("$:/isEncrypted")) {
		// Decrypt
		if ((text || "") === "") {
			const ipfsWrapper = new IpfsWrapper();
			ipfsWrapper.loadTiddlerFromIpfsAndDecrypt(tiddler, canonical_uri);
			text = $tw.language.getRawString("LazyLoadingWarning");
			$tw.utils.updateTiddler(tiddler, "text/vnd.tiddlywiki", text, canonical_uri);
		} else {
			element.attributes.src = {type: "string", value: canonical_uri};
		}
	} else {
		if(canonical_uri) {
			element.attributes.src = {type: "string", value: canonical_uri};
		} else if(text) {
			element.attributes.src = {type: "string", value: "data:application/pdf;base64," + text};
		}
	}
	this.tree = [element];
};

exports["application/pdf"] = ImageParser;

})();
