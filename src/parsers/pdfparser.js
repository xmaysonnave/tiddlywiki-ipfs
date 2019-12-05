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
	let canonical_uri =  options._canonical_uri;
	let tiddler =  options.tiddler;
	let element = {
			type: "element",
			tag: "embed",
			attributes: {}
		},
		src;
	// Check for an externally encrypted linked pdf
	if(canonical_uri && tiddler.hasTag("$:/isEncrypted")) {
		// Decrypt
		const ipfsWrapper = new IpfsWrapper();
		ipfsWrapper.loadFromIpfs(canonical_uri)
		.then( (encrypted) => {
			$tw.utils.decrypt(encrypted)
			.then( (content) => {
				const base64 = btoa(content);
				element.attributes.src = {type: "string", value: "data:application/pdf;base64," + base64};
				$tw.rootWidget.refresh([tiddler]);
			})
			.catch( (error) => {
				if ($tw.utils.getIpfsVerbose()) console.warn(error.message);
				element.attributes.src = {type: "string", value: canonical_uri};
				$tw.rootWidget.refresh([tiddler]);
			});
		});
	} else {
		if(canonical_uri && ((text || "") === "")) {
			element.attributes.src = {type: "string", value: canonical_uri};
		} else if (text) {
			element.attributes.src = {type: "string", value: "data:application/pdf;base64," + text};
		}
	}
	this.tree = [element];
};

exports["application/pdf"] = ImageParser;

})();
