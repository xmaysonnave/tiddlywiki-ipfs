/*\
title: $:/plugins/ipfs/ipfs-parser.js
type: application/javascript
module-type: utils

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.httpGetToUint8Array = async function(url) {
	var xhr = new XMLHttpRequest();
	var self = this;
	xhr.responseType = "arraybuffer";
	return new Promise(function(resolve, reject) {
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if (xhr.status >= 300) {
					reject(new Error($tw.language.getString("Error/XMLHttpRequest") + ": " + xhr.status, null, self));
				} else {
					var array = new Uint8Array(this.response);
					if ($tw.utils.getIpfsVerbose()) console.info(
						"Success/XMLHttpRequest: "
						+ xhr.status
						+ ", "
						+ url
					);
					resolve(array);
				}
			}
		};
		xhr.open("get", url, true);
		xhr.send();
	});
};

/*
 * Load and decrypt to Base64
*/
exports.loadAndDecryptToBase64 = function(tiddler, type, element) {
	// Decrypt
	const uri = tiddler.fields._canonical_uri;
	$tw.utils.httpGetToUint8Array(uri)
	.then( (array) => {
		if (array instanceof Uint8Array && array.length > 0) {
			$tw.utils.decryptUint8ArrayToBase64(array)
			.then( (base64) => {
				element.attributes.src = { type: "string", value: type + base64 };
				$tw.rootWidget.refresh([tiddler]);
			})
			.catch( (error) => {
				console.error(error);
				element.attributes.src = { type: "string", value: uri };
				$tw.rootWidget.refresh([tiddler]);
			});
		} else {
			element.attributes.src = { type: "string", value: uri };
			$tw.rootWidget.refresh([tiddler]);
		}
	})
	.catch( (error) => {
		console.error(error);
		throw error;
	});
};

/*
 * Decrypt Uint8Array to Base64
*/
exports.decryptUint8ArrayToBase64 = async function(array) {
	return new Promise( async (resolve, reject) => {
		const content = $tw.utils.Utf8ArrayToStr(array);
		if ($tw.crypto.hasPassword() == false) {
			try {
				// Request for password if unknown
				const decrypted = await $tw.utils.decryptFromPasswordPrompt(content);
				const base64 = btoa(decrypted);
				resolve(base64);
			} catch (error) {
				reject(error);
			}
		} else {
			const decrypted = $tw.crypto.decrypt(content, $tw.crypto.currentPassword);
			const base64 = btoa(decrypted);
			resolve(base64);
		}
	});
};

/*
 * Load and decrypt to UTF-8
*/
exports.loadAndDecryptToUtf8 = function(tiddler, type, element) {
	// Decrypt
	const uri = tiddler.fields._canonical_uri;
	$tw.utils.httpGetToUint8Array(uri)
	.then( (array) => {
		if (array instanceof Uint8Array && array.length > 0) {
			$tw.utils.decryptUint8ArrayToUtf8(array)
			.then( (decrypted) => {
				element.attributes.src = { type: "string", value: type + encodeURIComponent(decrypted) };
				$tw.rootWidget.refresh([tiddler]);
			})
			.catch( (error) => {
				console.error(error);
				$tw.rootWidget.refresh([tiddler]);
			});
		}
	})
	.catch( (error) => {
		console.error(error);
		throw error;
	});
};

/*
 * Load to UTF-8
*/
exports.loadToUtf8 = function(tiddler, type, element) {
	const uri = tiddler.fields._canonical_uri;
	$tw.utils.httpGetToUint8Array(uri)
	.then( (array) => {
		const content = $tw.utils.Utf8ArrayToStr(array);
		element.attributes.src = { type: "string", value: type + encodeURIComponent(content) };
		$tw.rootWidget.refresh([]);
	})
	.catch( (error) => {
		console.error(error);
		throw error;
	});
};

exports.decryptUint8ArrayToUtf8 = async function(array) {
	return new Promise( async (resolve, reject) => {
		const content = $tw.utils.Utf8ArrayToStr(array);
		if ($tw.crypto.hasPassword() == false) {
			try {
				// Request for password if unknown
				const decrypted = await $tw.utils.decryptFromPasswordPrompt(content);
				resolve(decrypted);
			} catch (error) {
				reject(error);
			}
		} else {
			try {
				const decrypted = $tw.crypto.decrypt(content, $tw.crypto.currentPassword);
				resolve(decrypted);
			} catch (error) {
				reject(error);
			}
		}
	});
};

exports.decryptFromPasswordPrompt = async function(content) {
	return new Promise( (resolve, reject) => {
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
				try {
					const decrypted = $tw.crypto.decrypt(content, password);
					resolve(decrypted);
				} catch (error) {
					reject(error);
					return false;
				}
				return true;
			}
		});
	});
}

})();
