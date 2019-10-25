/*\
title: $:/plugins/ipfs/ipfs-utils.js
type: application/javascript
module-type: utils

utils

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.parseUrlFull = function(url) {
	var parser = document.createElement('a');
	var searchObject = {};
	var queries, split, i;
	// Let the browser do the work
	parser.href = url;
	// Convert query string to object
	queries = parser.search.replace(/^\?/, '').split('&');
	for( i = 0; i < queries.length; i++ ) {
			split = queries[i].split('=');
			searchObject[split[0]] = split[1];
	}
	return {
			UrlProtocol: parser.protocol,
			UrlHost: parser.host,
			UrlHostname: parser.hostname,
			UrlPort: parser.port,
			UrlPathname: parser.pathname,
			UrlSearch: parser.search,
			UrlSearchObject: searchObject,
			UrlHash: parser.hash
	};
}

exports.parseUrlShort = function(url) {
	// Check
	if (url == undefined || url == null || url.trim() == "") {
		throw new Error("Undefined Url.");
	}				
	const { UrlProtocol, UrlHost, UrlHostname, UrlPort, UrlPathname, UrlSearch, UrlSearchObject, UrlHash } = this.parseUrlFull(url);
	const protocol = UrlProtocol;
	const hostname = UrlHostname;
	const pathname = UrlPathname;
	const port =  UrlPort;
	return { protocol, hostname, pathname, port };
}

exports.Base64ToUint8Array = function(base64) {
	var raw = atob(base64);
	var uint8Array = new Uint8Array(raw.length);
	for (var i = 0; i < raw.length; i++) {
		uint8Array[i] = raw.charCodeAt(i);
	}
	return uint8Array;
}

exports.Uint8ArrayToBase64 = function(uint8) {
  var CHUNK_SIZE = 0x8000; //arbitrary number
  var index = 0;
  var length = uint8.length;
  var base64 = '';
  var slice;
  while (index < length) {
    slice = uint8.subarray(index, Math.min(index + CHUNK_SIZE, length)); 
    base64 += String.fromCharCode.apply(null, slice);
    index += CHUNK_SIZE;
  }
  return btoa(base64);
}

// String to uint array
exports.StringToUint8Array = function(string) {
	var escstr = encodeURIComponent(string);
	var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
			return String.fromCharCode('0x' + p1);
	});
	var ua = new Uint8Array(binstr.length);
	Array.prototype.forEach.call(binstr, function (ch, i) {
			ua[i] = ch.charCodeAt(0);
	});
	return ua;
}

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt

/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

exports.Utf8ArrayToStr = function(array) {
	var c, char2, char3;
	var out = "";
	var len = array.length;
	var i = 0;
	while(i < len) {
		c = array[i++];
		switch(c >> 4) { 
		case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
			// 0xxxxxxx
			out += String.fromCharCode(c);
			break;
		case 12: case 13:
			// 110x xxxx   10xx xxxx
			char2 = array[i++];
			out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
			break;
		case 14:
			// 1110 xxxx  10xx xxxx  10xx xxxx
			char2 = array[i++];
			char3 = array[i++];
			out += String.fromCharCode(((c & 0x0F) << 12) 
				| ((char2 & 0x3F) << 6) 
				| ((char3 & 0x3F) << 0));
			break;
		}
	}
	return out;
}

exports.DecryptStringToBase64 = function(content, password) {
	var encryptedText = this.Utf8ArrayToStr(content);
	var decryptedText = $tw.crypto.decrypt(encryptedText, password);
	var base64 = btoa(decryptedText);
	return base64;
}

exports.updateIpfsPriority = function() {
	// Locate Ipfs saver
	var saver;
	for (var i = 0; i < $tw.saverHandler.savers.length; i++) {
		var saver = $tw.saverHandler.savers[i];
		if (saver.info.name == "ipfs") {
			saver = $tw.saverHandler.savers[i];
			break;
		}
	}
	// Process ipfs saver verbose property
	if (saver == undefined) {
		return;
	}	
	// Load priority property
	saver.info.priority = $tw.utils.getIpfsPriority();
	// Sort the savers into priority order
	$tw.saverHandler.savers.sort(function(a, b) {
		if (a.info.priority < b.info.priority) {
			return -1;
		} else {
			if (a.info.priority > b.info.priority) {
				return +1;
			} else {
				return 0;
			}
		}
	});
	return saver.info.priority;
}

/*
Retrieve ipfs saver priority with default value if applicable
*/
exports.getIpfsPriority = function() {
	var priority = $tw.wiki.getTiddler("$:/ipfs/saver/priority/default");
	if (priority != undefined) {
		priority = priority.getFieldString("text");
	}
	priority = $tw.wiki.getTiddler(priority);
	if (priority != undefined) {
	 	priority = priority.getFieldString("text");
	}	
	if (priority == undefined || priority == null || priority.trim() == "") {
		priority = $tw.utils.getIpfsDefaultPriority();
	} else {
		try {
			priority = parseInt(priority);
		} catch (error) {
			console.log(error);
			priority = -1;
		}
	}
	return priority;
}

/*
Default Priority
*/
exports.getIpfsDefaultPriority = function() {
	return 3000;
}

/*
Retrieve ipfs saver protocol with default value if applicable
*/
exports.getIpfsProtocol = function() {
	var protocol;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/protocol") != undefined) {
		protocol = $tw.wiki.getTiddler("$:/ipfs/saver/protocol").getFieldString("text");
	}
	if (protocol == undefined || protocol == null || protocol.trim() == "") {
		protocol = $tw.utils.getIpfsDefaultProtocol();
	}
	return protocol;
}

/*
Default Protocol
*/
exports.getIpfsDefaultProtocol = function() {
	return "ipfs";
}

/*
Retrieve ipfs saver api url with default value if applicable
*/
exports.getIpfsApiUrl = function() {
	var api = $tw.wiki.getTiddler("$:/ipfs/saver/api/default");
	if (api != undefined) {
		api = api.getFieldString("text");
	}
	api = $tw.wiki.getTiddler(api);
	if (api != undefined) {
	 	api = api.getFieldString("text");
	}	
	if (api == undefined || api == null || api.trim() == "") {
		api = $tw.utils.getIpfsDefaultApiUrl();
	}
	return api;
}

/*
Default Api Url
*/
exports.getIpfsDefaultApiUrl = function() {
	return "https://ipfs.infura.io:5001";
}

/*
Retrieve ipfs saver gateway url with default value if applicable
*/
exports.getIpfsGatewayUrl = function() {
	var gateway = $tw.wiki.getTiddler("$:/ipfs/saver/gateway/default");
	if (gateway != undefined) {
		gateway = gateway.getFieldString("text");
	}
	gateway = $tw.wiki.getTiddler(gateway);
	if (gateway != undefined) {
	 	gateway = gateway.getFieldString("text");
	}	
	if (gateway == undefined || gateway == null || gateway.trim() == "") {
		gateway = $tw.utils.getIpfsDefaultGatewayUrl();
	}
	return gateway;
}

/*
Default Gateway Url
*/
exports.getIpfsDefaultGatewayUrl = function() {
	return "https://gateway.ipfs.io";
}

/*
Retrieve ipfs saver ens domain with default value if applicable
*/
exports.getIpfsEnsDomain = function() {
	var ensDomain;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ens/domain") != undefined) {
		ensDomain = $tw.wiki.getTiddler("$:/ipfs/saver/ens/domain").getFieldString("text");
	}
	if (ensDomain == undefined || ensDomain == null || ensDomain.trim() == "") {
		ensDomain = $tw.getIpfsDefaultEnsDomain();
	}
	return ensDomain;
}

/*
Default Ens Domain
*/
exports.getIpfsDefaultEnsDomain = function() {
	return "bluelightav.eth";
}

/*
Retrieve ipfs saver ipns name with default value if applicable
*/
exports.getIpfsIpnsName = function() {
	var ipnsName;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/name") != undefined) {
		ipnsName = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name").getFieldString("text");
	}
	if (ipnsName == undefined || ipnsName == null || ipnsName.trim() == "") {
		ipnsName = $tw.getIpfsDefaultIpnsName();
	}
	return ipnsName;
}

/*
Default Ipns Name
*/
exports.getIpfsDefaultIpnsName = function() {
	return "tiddly";
}

/*
Retrieve ipfs saver ipns key with default value if applicable
*/
exports.getIpfsIpnsKey = function() {
	var ipnsKey;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/key") != undefined) {
		ipnsKey = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key").getFieldString("text");
	}
	if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() == "") {
		ipnsKey = $tw.utils.getIpfsDefaultIpnsKey();
	}
	return ipnsKey;
}

/*
Default Ipns Key
*/
exports.getIpfsDefaultIpnsKey = function() {
	return "QmV8ZQH9s4hHxPUeFJH17xt7GjmjGj8tEg7uQLz8HNSvFJ";
}

/*
Retrieve ipfs saver verbose with default value if applicable
*/
exports.getIpfsVerbose = function() {
	var verbose;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/verbose") != undefined) {
		verbose = $tw.wiki.getTiddler("$:/ipfs/saver/verbose").getFieldString("text");
	}
	if (verbose == undefined || verbose == null || verbose.trim() == "") {
		verbose = true;
	} else {
		verbose = ( verbose == $tw.utils.getIpfsDefaultVerbose() );
	}
	return verbose;
}

/*
Default Verbose
*/
exports.getIpfsDefaultVerbose = function() {
	return "yes";
}

/*
Retrieve ipfs saver policy with default value if applicable
*/
exports.getIpfsPolicy = function() {
	var policy;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/policy") != undefined) {
		policy = $tw.wiki.getTiddler("$:/ipfs/saver/policy").getFieldString("text");
	}
	if (policy == undefined || policy == null || policy.trim() == "") {
		policy = $tw.utils.getIpfsDefaultPolicy();
	}
	return policy;
}

/*
Default Policy
*/
exports.getIpfsDefaultPolicy = function() {
		return "http";
}

})();
