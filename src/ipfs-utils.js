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

exports.decrypt = async function(encrypted) {
	// Request for password if unknown
	var content = null;
	if ($tw.crypto.hasPassword() == false) {
			content = await $tw.utils.decryptFromPasswordPrompt(encrypted);
	} else {
		content = $tw.crypto.decrypt(encrypted, $tw.crypto.currentPassword);
	}
	return content;
};

exports.decryptFromPasswordPrompt = async function(encrypted) {
	return new Promise(function(resolve, reject) {
		$tw.passwordPrompt.createPrompt({
			serviceName: "Enter a password to decrypt the imported content!!",
			noUserName: true,
			canCancel: true,
			submitText: "Decrypt",
			callback: function(data) {
				if (!data) {
					reject(new Error("User canceled password input..."));
					return false;
				}
				// Decrypt
				const password = data.password;
				const decrypted = $tw.crypto.decrypt(encrypted, password);
				resolve(decrypted);
				return true;
			}
		});
	});
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
