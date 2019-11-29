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

/*
Update a saver priority
*/
exports.updateSaver = function(name, priority) {
	if (priority !== undefined && name !== undefined) {
		// Locate saver
		var saver = null;
		for (var i = 0; i < $tw.saverHandler.savers.length; i++) {
			var saver = $tw.saverHandler.savers[i];
			if (saver.info.name === name) {
				saver = $tw.saverHandler.savers[i];
				break;
			}
		}
		if (saver != null) {
			// Update saver priority info
			saver.info.priority = priority;
			// Sort savers
			$tw.utils.sortSavers();
		}
	}
};

/*
Sort the savers into priority order
*/
exports.sortSavers = function() {
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
	return;
}

/*
Retrieve ipfs saver priority with default value if applicable
*/
exports.getIpfsPriority = function() {
	var priority = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/priority/default") !== undefined) {
		priority = $tw.wiki.getTiddler("$:/ipfs/saver/priority/default").getFieldString("text");
	}
	if (priority !== null && $tw.wiki.getTiddler(priority) !== undefined) {
	 	priority = $tw.wiki.getTiddler(priority).getFieldString("text");
	}
	if (priority === null || priority.trim() === "") {
		priority = $tw.utils.getIpfsDefaultPriority();
	} else {
		try {
			priority = parseInt(priority);
		} catch (error) {
			console.error(error.message);
			priority = -1;
		}
	}
	return priority;
}

/*
Default Priority
*/
exports.getIpfsDefaultPriority = function() {
	return 3100;
}

/*
Retrieve ipfs saver protocol with default value if applicable
*/
exports.getIpfsProtocol = function() {
	var protocol = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/protocol") !== undefined) {
		protocol = $tw.wiki.getTiddler("$:/ipfs/saver/protocol").getFieldString("text");
	}
	if (protocol === null || protocol.trim() === "") {
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
	var api = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/api/default") !== undefined) {
		api = $tw.wiki.getTiddler("$:/ipfs/saver/api/default").getFieldString("text");
	}
	if (api !== null && $tw.wiki.getTiddler(api) !== undefined) {
		api = $tw.wiki.getTiddler(api).getFieldString("text");
	}
	if (api === null || api.trim() === "") {
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
	var gateway = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/gateway/default") !== undefined) {
		gateway = $tw.wiki.getTiddler("$:/ipfs/saver/gateway/default").getFieldString("text");
	}
	if (gateway !== null && $tw.wiki.getTiddler(gateway) !== undefined) {
		gateway = $tw.wiki.getTiddler(gateway).getFieldString("text");
	}
	if (gateway === null || gateway.trim() === "") {
		gateway = $tw.utils.getIpfsDefaultGatewayUrl();
	}
	return gateway;
}

/*
Default Gateway Url
*/
exports.getIpfsDefaultGatewayUrl = function() {
	return "https://ipfs.infura.io";
}

/*
Retrieve ipfs saver ens domain with default value if applicable
*/
exports.getIpfsEnsDomain = function() {
	var ensDomain = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ens/domain") !== undefined) {
		ensDomain = $tw.wiki.getTiddler("$:/ipfs/saver/ens/domain").getFieldString("text");
	}
	return ensDomain;
}

/*
Retrieve ipfs saver ipns name with default value if applicable
*/
exports.getIpfsIpnsName = function() {
	var ipnsName = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/name") !== undefined) {
		ipnsName = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name").getFieldString("text");
	}
	return ipnsName;
}

/*
Retrieve ipfs saver ipns key with default value if applicable
*/
exports.getIpfsIpnsKey = function() {
	var ipnsKey = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/ipns/key") !== undefined) {
		ipnsKey = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key").getFieldString("text");
	}
	return ipnsKey;
}

/*
Retrieve ipfs saver verbose with default value if applicable
*/
exports.getIpfsVerbose = function() {
	var verbose = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/verbose") !== undefined) {
		verbose = $tw.wiki.getTiddler("$:/ipfs/saver/verbose").getFieldString("text");
	}
	if (verbose === null || verbose.trim() === "") {
		verbose = true; // default, see ipfs-saver.tid
	} else {
		verbose = ( verbose === "yes" );
	}
	return verbose;
}

/*
Retrieve ipfs saver unpin with default value if applicable
*/
exports.getIpfsUnpin = function() {
	var unpin = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/unpin") !== undefined) {
		unpin = $tw.wiki.getTiddler("$:/ipfs/saver/unpin").getFieldString("text");
	}
	if (unpin === null || unpin.trim() === "") {
		unpin = false; // default, see ipfs-saver.tid
	} else {
		unpin = ( unpin === "yes" );
	}
	return unpin;
}

/*
Retrieve ipfs saver policy with default value if applicable
*/
exports.getIpfsPolicy = function() {
	var policy = null;
	if ($tw.wiki.getTiddler("$:/ipfs/saver/policy") !== undefined) {
		policy = $tw.wiki.getTiddler("$:/ipfs/saver/policy").getFieldString("text");
	}
	if (policy === null || policy.trim() === "") {
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

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
exports.loadLibrary = async function(id, url, sri, module) {
	const err = "Unable to load: " + url;
  return new Promise((resolve, reject) => {
		try {
			if (document.getElementById(id) == null) {
				const script = document.createElement("script");
				const cleanup = () => {
					delete window[id];
					script.onerror = null;
					script.onload = null;
					script.remove();
					URL.revokeObjectURL(script.src);
					script.src = "";
				};
				if (module == undefined) {
					script.type = "text/javascript";
				} else {
					script.type = "module";
				}
        script.id = id;
        script.async = false;
        script.defer = "defer";
				script.src = url;
				if (sri) {
					script.integrity = sri;
				}
				script.crossOrigin = "anonymous";
				document.head.appendChild(script);
				script.onload = () => {
					resolve(window[id]);
					cleanup();
					if ($tw.utils.getIpfsVerbose()) console.info("Loaded: " + url);
				}
				script.onerror = () => {
					reject(new Error("Failed to load: " + url));
					cleanup();
				}
			} else {
				return resolve(window[id]);
			}
		} catch (error) {
			reject(new Error(err));
		}
	});
};

})();
