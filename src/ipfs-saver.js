/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
module-type: saver

IpfsSaver

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;
const fileProtocol = "file:";
const ensKeyword = "ens";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

/*
Select the appropriate saver module and set it up
*/
var IpfsSaver = function(wiki) {
	var self = this;
	this.wiki = wiki;
	this.apiUrl = null;
	this.ipfsProvider = null;
	this.needTobeUnpinned = [];
	this.ipfsWrapper = new IpfsWrapper();
	this.ensWrapper = new EnsWrapper();
	this.ipfsLibrary = new IpfsLibrary();
	// Event management
	$tw.wiki.addEventListener("change", function(changes) {
		return self.handleChangeEvent(self, changes);
	});
	$tw.rootWidget.addEventListener("tm-ipfs-tiddler", function(event) {
		return self.handleUploadCanonicalUri(self, event);
	});
	$tw.rootWidget.addEventListener("tm-publish-to-ens", function(event) {
		return self.handlePublishToEns(self, event);
	});
	$tw.rootWidget.addEventListener("tm-publish-to-ipns", function(event) {
		return self.handlePublishToIpns(self, event);
	});
	$tw.hooks.addHook("th-deleting-tiddler", function(tiddler) {
		return self.handleDeleteTiddler(self, tiddler);
	});
	$tw.hooks.addHook("th-saving-tiddler", function(tiddler) {
		return self.handleSaveTiddler(self, tiddler);
	});
	$tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
		return self.handleFileImport(self, tiddler);
	});
}

IpfsSaver.prototype.errorDialog = function(error) {
	if (error) {
		alert($tw.language.getString("Error/WhileSaving") + ":\n\n" + error);
	}
}

IpfsSaver.prototype.messageDialog = function(message) {
	if (message) {
		alert(message);
	}
}

IpfsSaver.prototype.save = async function(text, method, callback, options) {

	//Is there anything to do
	if ($tw.saverHandler.isDirty() == false) {
		return false;
	}

	try {

		// Init
		var unpin = null;
		var ipfsCid = null;
		var ipfsProtocol = ipfsKeyword;
		var ensDomain = null;
		const ipnsKey = $tw.utils.getIpfsIpnsKey() != null ? $tw.utils.getIpfsIpnsKey().trim() === "" ? null : $tw.utils.getIpfsIpnsKey().trim() : null;
		const ipnsName = $tw.utils.getIpfsIpnsName() != null ? $tw.utils.getIpfsIpnsName().trim() === "" ? null : $tw.utils.getIpfsIpnsName().trim() : null;
		options = options || {};

		// Process document URL
		var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(document.URL);
		const currentProtocol = protocol;
		const currentHostname = hostname;
		const currentPathname = pathname;
		const currentPort = port;

		// Check
		const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
		if (gatewayUrl == undefined || gatewayUrl == null || gatewayUrl.trim() === "") {
			const msg = "Undefined Ipfs Gateway Url...";
			console.log(msg);
			callback(msg);
			return false;
		}

		// Process Gateway URL
		var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(gatewayUrl);
		const gatewayProtocol = protocol;
		const gatewayHostname = hostname;
		const gatewayPort = port;

		// Extract and check URL Ipfs protocol and cid
		if (currentProtocol !== fileProtocol) {
			// Decode pathname
			var { protocol, cid } = await this.ipfsLibrary.decodePathname(currentPathname);
			// Check
			if (protocol != null && cid != null) {
				ipfsProtocol = protocol;
				ipfsCid = cid;
				if ($tw.utils.getIpfsUnpin() && ipfsProtocol === ipfsKeyword) {
					if (this.needTobeUnpinned.indexOf(ipfsCid) == -1) {
						unpin = ipfsCid;
						this.needTobeUnpinned.push(unpin);
						if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + unpin);
					}
				}
			}
		}

		// Getting an Ipfs client
		var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
		if (error != null)  {
			console.log(error);
			callback(error.message);
			return false;
		}

		// Retrieve the default empty directory to check if the connection is alive
		var { error } = await this.ipfsWrapper.getEmptyDirectory(ipfs);
		if (error != null)  {
			console.log(error);
			callback(error.message);
			return false;
		}

		// Check Ipns Key and Ipns Name
		if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {

			// Check if available
			if (ipnsName == null || ipnsKey == null) {
				const msg = "Undefined default Ipns name or key...";
				console.log(msg);
				callback(msg);
				return false;
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Default Ipns name: " + ipnsName + ", Ipns key: " + ipnsKey);

			// Check default ipns key and default ipns name
			var { error, keys } = await this.ipfsWrapper.getKeys(ipfs);
			if (error != null)  {
				console.log(error);
				callback(error.message);
				return false;
			}
			var found = false;
			for (var index = 0; index < keys.length; index++) {
				if (keys[index].id === ipnsKey && keys[index].name === ipnsName) {
					found = true;
					break;
				}
			}
			if (found == false) {
				const msg = "Unknown default Ipns name and key...";
				console.log(msg);
				callback(msg);
				return false;
			}

			// Check
			// Resolve ipnsKey
			var { error, resolved } = await this.ipfsWrapper.resolveFromIpfs(ipfs, ipnsKey);
			if (error != null) {
				console.log(error);
				callback(error.message);
				return false;
			}
			// Store to unpin previous if any
			if ($tw.utils.getIpfsUnpin() && resolved != null) {
				if (this.needTobeUnpinned.indexOf(resolved.substring(6)) == -1) {
					unpin = resolved.substring(6);
					this.needTobeUnpinned.push(unpin);
					if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + unpin);
				}
			}

		// Check Ens domain
		} else if ($tw.utils.getIpfsProtocol() === ensKeyword) {

			// Getting default ens domain
			ensDomain = $tw.utils.getIpfsEnsDomain() != null ? $tw.utils.getIpfsEnsDomain().trim() === "" ? null : $tw.utils.getIpfsEnsDomain().trim() : null;
			// Check if available
			if (ensDomain == null) {
				const msg  ="Undefined Ens Domain...";
				console.log(msg);
				callback(msg);
				return false;
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Ens Domain: " + ensDomain);

			// Fetch Ens domain content
			const { error, protocol, content } = await this.ensWrapper.getContenthash(ensDomain);
			if (error != null)  {
				console.log(error);
				callback(error.message);
				return false;
			}

			// Check is content protocol is ipfs to unpin previous
			if ($tw.utils.getIpfsUnpin() && protocol === ipfsKeyword) {
				// Store to unpin previous
				unpin = content;
				if (this.needTobeUnpinned.indexOf(unpin) == -1) {
					this.needTobeUnpinned.push(unpin);
					if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + unpin);
				}
			}

		}

		// Upload	current document
		if ($tw.utils.getIpfsVerbose()) console.log("Uploading current...");

		// Transform the document text into a Blob
		var blob = null;
		try {
			blob = new Blob([text], { type: "text/html" });
		} catch (error) {
			console.log(error);
			callback(error.message);
			return false;
		};

		// Upload
		var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, blob);
		if (error != null)  {
			console.log(error);
			callback(error.message);
			return false;
		}

		// Publish to Ipns if current protocol is ipns or ipns is requested
		if ($tw.utils.getIpfsProtocol() === ipnsKeyword || ipfsProtocol === ipnsKeyword) {
			// Publish to Ipns if ipnsKey match the current hash or current protocol is ipfs
			if (ipfsCid === ipnsKey || ipfsProtocol === ipfsKeyword) {
				if ($tw.utils.getIpfsVerbose()) console.log("Publishing Ipns name: " + ipnsName);
				var { error, published } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, added[0].hash);
				if (error != null)  {
					console.log(error);
					callback(error.message);
					return false;
				}
			}
		// Publish to Ens if ens is requested
		} else if ($tw.utils.getIpfsProtocol() === ensKeyword) {
			if ($tw.utils.getIpfsVerbose()) console.log("Publishing Ens domain: " + ensDomain);
			var { error } = await this.ensWrapper.setContenthash(ensDomain, added[0].hash);
			if (error != null)  {
				console.log(error);
				callback(error.message);
				return false;
			}
		}

		// Unpin if applicable
		if ($tw.utils.getIpfsUnpin() && this.needTobeUnpinned.length > 0) {
			for (var i = 0; i < this.needTobeUnpinned.length; i++) {
				var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, this.needTobeUnpinned[i]);
				// Log and continue
				if (error != null)  {
					console.log(error);
				}
			}
			this.needTobeUnpinned = [];
		}

		// Done
		callback(null);

		// Next location
		var cid;
		if ($tw.utils.getIpfsProtocol() === ipnsKeyword) {
			if (ipfsProtocol == ipfsKeyword || ipfsCid == null) {
				cid = "/" + ipnsKeyword + "/" + ipnsKey;
			} else {
				cid = "/" + ipnsKeyword + "/" + ipfsCid;
			}
		} else {
			cid = "/" + ipfsKeyword + "/" + added[0].hash;
		}
		if (currentProtocol === fileProtocol) {
			var url;
			url = gatewayProtocol + "//" + gatewayHostname + gatewayPort + cid;
			if ($tw.utils.getIpfsVerbose()) console.log("Assigning new location: " + url);
			window.location.assign(url);
		} else if ($tw.utils.getIpfsProtocol() === ipnsKeyword && ipfsProtocol !== ipnsKeyword) {
			var url;
			if (currentHostname == gatewayHostname) {
				url = currentProtocol + "//" + currentHostname + currentPort + cid;
			} else {
				url = gatewayProtocol + "//" + gatewayHostname + gatewayPort + cid;
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Assigning new location: " + url);
			window.location.assign(url);
		} else if ($tw.utils.getIpfsProtocol() === ensKeyword) {
			const url = "https://" + ensDomain;
			if ($tw.utils.getIpfsVerbose()) console.log("Assigning new location: " + url);
			window.location.assign(url);
		} else if (($tw.utils.getIpfsProtocol() === ipfsKeyword || ipfsProtocol === ipfsKeyword) && cid != added[0].hash) {
			var url;
			if (currentHostname == gatewayHostname) {
				url = currentProtocol + "//" + currentHostname + currentPort + cid;
			} else {
				url = gatewayProtocol + "//" + gatewayHostname + gatewayPort + cid;
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Assigning new location: " + url);
			window.location.assign(url);
		}

	} catch (error) {
		console.log(error);
		callback(error.message);
		return false;
	}

	return false;

};

IpfsSaver.prototype.handleFileImport = function(self, tiddler) {
	// Update tiddler
	const addition = self.wiki.getModificationFields();
	addition.title = tiddler.fields.title;
	addition.tags = (tiddler.fields.tags || []).slice(0);
	// Add isAttachment tag
	var index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isAttachment") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isAttachment");
	}
	// Add isEmbedded tag
	index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isEmbedded") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isEmbedded");
	}
	return new $tw.Tiddler(tiddler, addition);
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleDeleteTiddler = async function(self, tiddler) {
	// Process if _canonical_uri is set
	const uri = tiddler.getFieldString("_canonical_uri");
	if (uri == undefined || uri == null || uri.trim() === "") {
		return tiddler;
	}
	const { pathname } = $tw.utils.parseUrlShort(uri);
	const cid = pathname.substring(6);
	// Store cid as it needs to be unpined when the wiki is saved if applicable
 	if ($tw.utils.getIpfsUnpin() && self.needTobeUnpinned.indexOf(cid) == -1) {
		self.needTobeUnpinned.push(cid);
		if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + cid);
	}
	return tiddler;
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleSaveTiddler = async function(self, tiddler) {

	// oldTiddler
	const oldTiddler = self.wiki.getTiddler(tiddler.fields.title);
	if (oldTiddler == undefined || oldTiddler == null) {
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}
	// Process if _canonical_uri is set
	const oldUri = oldTiddler.getFieldString("_canonical_uri");
	if (oldUri == undefined || oldUri == null || oldUri.trim() === "") {
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	// newTiddler _canonical_uri
	const newUri = tiddler.getFieldString("_canonical_uri");
	// Nothing to do
	if (oldUri === newUri) {
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	const { pathname } = $tw.utils.parseUrlShort(oldUri);
	const cid = pathname.substring(6);

	// Getting an Ipfs client
	var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	// Retrieve the default empty directory to check if the connection is alive
	var { error } = await self.ipfsWrapper.getEmptyDirectory(ipfs);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	// Download
	if (newUri == undefined || newUri == null || newUri.trim() === "") {

		// Fetch the old cid
		var { error, fetched } = await self.ipfsWrapper.fetch(ipfs, cid);
		if (error != null)  {
			console.log(error);
			self.errorDialog(error.message);
			$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
			return tiddler;
		}

		// Store old cid as it needs to be unpined when the wiki is saved if applicable
		if ($tw.utils.getIpfsUnpin() && self.needTobeUnpinned.indexOf(cid) == -1) {
			self.needTobeUnpinned.push(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + cid);
		}

		// Content
		var content = fetched;

		// Decrypt
		var index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isEncrypted") : -1;
		if (index != -1) {
			// Request for password if unknown
			var password = null;
			if ($tw.crypto.hasPassword() == false) {
				// Prompt
				$tw.passwordPrompt.createPrompt({
					serviceName: "Enter a password to decrypt the imported attachment!!",
					noUserName: true,
					canCancel: true,
					submitText: "Decrypt",
					callback: function(data) {
						// Exit if the user cancelled
						if (!data) {
							return false;
						}
						// Store
						password = data.password;
						if($tw.config.usePasswordVault) {
							$tw.crypto.setPassword(data.password);
						}
						// Decrypt
						const base64 = $tw.utils.DecryptStringToBase64(content, password);
						self.updateSaveTiddler(self, tiddler, base64);
						// Exit and remove the password prompt
						return true;
					}
				});
			} else {
				// Decrypt
				const base64 = $tw.utils.DecryptStringToBase64(content, null);
				self.updateSaveTiddler(self, tiddler, base64);
			}
		} else {
			const base64 = $tw.utils.Uint8ArrayToBase64(content);
			self.updateSaveTiddler(self, tiddler, base64);
		}

		// Return
		return tiddler;

	}

}

IpfsSaver.prototype.updateSaveTiddler = function(self, tiddler, content) {
		// Update tiddler
		const addition = $tw.wiki.getModificationFields();
		addition.title = tiddler.fields.title;
		addition.tags = (tiddler.fields.tags || []).slice(0);
		// Add isAttachment tag
		var index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isAttachment") : -1;
		if (index == -1) {
			$tw.utils.pushTop(addition.tags, "$:/isAttachment");
		}
		// Add isEmbedded tag
		index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isEmbedded") : -1;
		if (index == -1) {
			$tw.utils.pushTop(addition.tags, "$:/isEmbedded");
		}
		// Remove isIpfs tag
		index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isIpfs") : -1;
		if (index != -1) {
			addition.tags = self.arrayRemove(addition.tags, "$:/isIpfs");
		}
		// Remove isEncrypted tag
		index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isEncrypted") : -1;
		if (index != -1) {
			addition.tags = self.arrayRemove(addition.tags, "$:/isEncrypted");
		}
		// Remaining attributes
		addition["_canonical_uri"] = undefined;
		addition["text"] = content;
		// Update tiddler
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler, addition));
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleUploadCanonicalUri = async function(self, event) {

	// Check
	if (event.tiddlerTitle == undefined) {
		return false;
	}

	// Current tiddler
	const tiddler = self.wiki.getTiddler(event.tiddlerTitle);
	if (tiddler == undefined || tiddler == null) {
		return false;
	}

	// Do not process if _canonical_uri is set
	const uri = tiddler.getFieldString("_canonical_uri");
	if (uri !== undefined && uri !== null && uri.trim() !== "") {
		return false;
	}

	// Check content type, only base64 is suppported yet
	var type = tiddler.getFieldString("type");
	// default
	if (type == undefined || type == null || type.trim() === "") {
		type = "text/html";
	}
	const info = $tw.config.contentTypeInfo[type];
	if (info == undefined || info.encoding !== "base64") {
		const msg = "Upload to Ipfs is only supported for attached files.";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Process document URL
	var { protocol, hostname, port } = $tw.utils.parseUrlShort(document.URL);
	const currentProtocol = protocol;
	const currentHostname = hostname;
	const currentPort = port;

	// Check
	const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
	if (currentProtocol === fileProtocol && (gatewayUrl == undefined || gatewayUrl == null || gatewayUrl.trim() === "")) {
		const msg = "Undefined Ipfs gateway Url.";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Process Gateway URL
	var { protocol, hostname, port } = $tw.utils.parseUrlShort(gatewayUrl);
	const gatewayProtocol = protocol;
	const gatewayHostname = hostname;
	const gatewayPort = port;

	// Getting an Ipfs client
	var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Retrieve the default empty directory to check if the connection is alive
	var { error } = await self.ipfsWrapper.getEmptyDirectory(ipfs);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Upload	current attachment
	if ($tw.utils.getIpfsVerbose()) console.log("Uploading attachment...");
	// Transform the base64 encoded file into a Blob
	var blob = null;
	try {
		// Content
		var content = tiddler.getFieldString("text");
		// Encrypt if tiddlywiki is password protected
		if ($tw.crypto.hasPassword()) {
			const decodedBase64 = atob(content);
			const encryptedText = $tw.crypto.encrypt(decodedBase64, null);
			content = $tw.utils.StringToUint8Array(encryptedText);
			type = "application/octet-stream";
		} else {
			content = $tw.utils.Base64ToUint8Array(content);
		}
		blob = new Blob([content], { type: type });
	} catch (error) {
		console.log(error);
		self.errorDialog("Failed to transform attachment...");
		return false;
	};
	// Add
	var { error, added } = await self.ipfsWrapper.addToIpfs(ipfs, blob);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}
	const cid = added[0].hash;

	// Update current tiddler
	const addition = $tw.wiki.getModificationFields();
	addition.title = tiddler.fields.title;
	addition.tags = (tiddler.fields.tags || []).slice(0);
	// Add isAttachment tag
	var index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isAttachment") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isAttachment");
	}
	// Add isIpfs tag
	var index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isIpfs") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isIpfs");
	}
	// Add isEncrypted tag
	if ($tw.crypto.hasPassword()) {
		$tw.utils.pushTop(addition.tags, "$:/isEncrypted");
	}
	// Remove Embedded tag
	var index = tiddler.fields.tags !== undefined ? tiddler.fields.tags.indexOf("$:/isEmbedded") : -1;
	if (index != -1) {
		addition.tags = self.arrayRemove(addition.tags, "$:/isEmbedded");
	}
	// Process _canonical_uri
	var url;
	if (currentProtocol === fileProtocol) {
		url = gatewayProtocol + "//" + gatewayHostname + gatewayPort + "/" + ipfsKeyword + "/" + cid;
	} else {
		if (currentHostname == gatewayHostname) {
			url = currentProtocol + "//" + currentHostname + currentPort + "/" + ipfsKeyword + "/" + cid;
		} else {
			url = gatewayProtocol + "//" + gatewayHostname + gatewayPort + "/" + ipfsKeyword + "/" + cid;
		}
	}
	addition["_canonical_uri"] = url;
	// Reset text
	addition["text"] = undefined;
	$tw.wiki.addTiddler(new $tw.Tiddler(tiddler, addition));

	return false;

}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handlePublishToEns = async function(self, event) {


	//Is there anything to do
	if ($tw.saverHandler.isDirty() == true) {
		const msg = "Unable to publish an unsaved wiki...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Process document URL
	var { protocol, pathname } = $tw.utils.parseUrlShort(document.URL);
	const currentProtocol = protocol;
	const currentPathname = pathname;

	// Check
	if (currentProtocol === fileProtocol) {
		const msg = "Undefined Ipfs wiki...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Extract and check URL Ipfs protocol and cid
	var { protocol, cid } = await self.ipfsLibrary.decodePathname(currentPathname);
	// Check
	if (protocol == null && cid == null) {
		const msg = "Unable to publish. Unknown Ipfs identifier...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Getting default ens domain
	const ensDomain = $tw.utils.getIpfsEnsDomain() != null ? $tw.utils.getIpfsEnsDomain().trim() === "" ? null : $tw.utils.getIpfsEnsDomain().trim() : null;
	// Check if available
	if (ensDomain == null) {
		const msg  ="Undefined Ens Domain...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Ens Domain: " + ensDomain);

	// Fetch Ens domain content
	var { error, protocol, content } = await self.ensWrapper.getContenthash(ensDomain);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Retrieve Ipfs identifier from Ipns identifier
	if (protocol === ipnsKeyword) {

		// Getting an Ipfs client
		var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
		if (error != null)  {
			console.log(error);
			self.errorDialog(error.message);
			return false;
		}

		// Retrieve the default empty directory to check if the connection is alive
		var { error } = await self.ipfsWrapper.getEmptyDirectory(ipfs);
		if (error != null)  {
			console.log(error);
			self.errorDialog(error.message);
			return false;
		}

		// Resolve ipnsKey
		var { error, resolved } = await self.ipfsWrapper.resolveFromIpfs(ipfs, cid);
		if (error != null)  {
			console.log(error);
			self.errorDialog(error.message);
			return false;
		} else if (resolved == null) {
			console.log(error);
			self.errorDialog("Nothing to publish. Unresolved current Ipns key...");
			return false;
		}

		// Store Ipfs cid
		cid = resolved.substring(6);

	}

	// Nothing to publish
	if (content !== null && content === cid) {
		const msg = "Nothing to publish. Ens content is up to date...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	if ($tw.utils.getIpfsVerbose()) console.log("Publishing Ens domain: " + ensDomain);
	var { error } = await self.ensWrapper.setContenthash(ensDomain, cid);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	self.messageDialog("Successfully set Ens domain content:\n\n" + cid);

	return false;

}

	/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handlePublishToIpns = async function(self, event) {

	//Is there anything to do
	if ($tw.saverHandler.isDirty() == true) {
		const msg = "Unable to publish an unsaved wiki...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Process document URL
	var { protocol, pathname } = $tw.utils.parseUrlShort(document.URL);
	const currentProtocol = protocol;
	const currentPathname = pathname;

	// Check
	if (currentProtocol === fileProtocol) {
		const msg = "Undefined Ipfs wiki...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Extract and check URL Ipfs protocol and cid
	var { protocol, cid } = await self.ipfsLibrary.decodePathname(currentPathname);
	// Check
	if (protocol == null || cid == null) {
		const msg = "Unable to publish. Unknown Ipfs identifier...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Getting default ipns key and ipns name
	const ipnsKey = $tw.utils.getIpfsIpnsKey() != null ? $tw.utils.getIpfsIpnsKey().trim() === "" ? null : $tw.utils.getIpfsIpnsKey().trim() : null;
	const ipnsName = $tw.utils.getIpfsIpnsName() != null ? $tw.utils.getIpfsIpnsName().trim() === "" ? null : $tw.utils.getIpfsIpnsName().trim() : null;

	// Check
	if (ipnsName == null || ipnsKey == null) {
		const msg = "Undefined default Ipns name or key...";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Default Ipns name: " + ipnsName + ", Ipns key: " + ipnsKey);

	// Check default
	if (protocol === ipnsKeyword && cid === ipnsKey) {
		const msg = "Nothing to publish. Ipns keys are matching....";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	// Getting an Ipfs client
	var { error, ipfs } = await self.ipfsWrapper.getIpfsClient();
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Retrieve the default empty directory to check if the connection is alive
	var { error } = await self.ipfsWrapper.getEmptyDirectory(ipfs);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Resolve current ipnsKey if applicable
	if (protocol === ipnsKeyword) {
		var { error, resolved } = await self.ipfsWrapper.resolveFromIpfs(ipfs, cid);
		if (error != null) {
			console.log(error);
			self.errorDialog(error.message);
			return false;
		}
		if (resolved == null) {
			const msg = "Nothing to publish. Unable to resolve the current Ipns key....";
			console.log(msg);
			self.errorDialog(msg);
			return false;
		}
		// Extract resolved cid
		cid = resolved.substring(6);
	}

	// Check default ipns key and default ipns name
	var { error, keys } = await self.ipfsWrapper.getKeys(ipfs);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}
	var found = false;
	for (var index = 0; index < keys.length; index++) {
		if (keys[index].id === ipnsKey && keys[index].name === ipnsName) {
			found = true;
			break;
		}
	}
	if (found == false) {
		const msg = "Unknown default Ipns name and key...";
		console.log(msg);
		self.errorDialog(error.message);
		return false;
	}

	// Resolve default ipnsKey
	var { error, resolved } = await self.ipfsWrapper.resolveFromIpfs(ipfs, ipnsKey);
	if (error != null) {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}
	// Extract resolved cid if available
	if (resolved != null) {
		resolved = resolved.substring(6);
	}

	// Check
	if (resolved === cid) {
		const msg = "Nothing to publish. Ipfs identifiers are matching....";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}

	if ($tw.utils.getIpfsVerbose()) console.log("Publishing Ipns name: " + ipnsName);
	var { error, published } = await self.ipfsWrapper.publishToIpfs(ipfs, ipnsName, cid);
	if (error != null) {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	self.messageDialog("Successfully published Ipns name: " + ipnsName + "\n" + cid);

	// Unpin previous
	if ($tw.utils.getIpfsUnpin() && resolved != null) {
		if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + resolved);
		var { error } = await self.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
		if (error != null)  {
			console.log(error);
			self.errorDialog(error.message);
			return false;
		}
	}

	return false;

}

IpfsSaver.prototype.arrayRemove = function(array, value) {
	return array.filter(function(element){
			return element != value;
	});
}

/* Beware you are in a widget, not in the saver */
IpfsSaver.prototype.handleChangeEvent = function(self, changes) {
	// process priority
	var priority = changes["$:/ipfs/saver/priority/default"];
	if (priority !== undefined) {
		// Update Ipfs saver
		$tw.utils.updateSaver("ipfs", $tw.utils.getIpfsPriority());
		if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver priority: " + $tw.utils.getIpfsPriority());
	}
	// process verbose
	var verbose = changes["$:/ipfs/saver/verbose"];
	if (verbose !== undefined) {
		if ($tw.utils.getIpfsVerbose()) {
			console.log("Ipfs Saver is verbose...");
		}
	}
	// process unpin
	var unpin = changes["$:/ipfs/saver/unpin"];
	if (unpin !== undefined) {
		if ($tw.utils.getIpfsUnpin()) {
			if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver will unpin previous content...");
		} else {
			if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver will not unpin previous content...");
		}
	}
}

IpfsSaver.prototype.sleep = function(seconds) {
	var waitUntil = new Date().getTime() + seconds*1000;
	while(new Date().getTime() < waitUntil) true;
}

/*
Information about this saver
*/
IpfsSaver.prototype.info = {
	name: "ipfs",
	priority: 3000,
	capabilities: ["save", "autosave"]
};

/*
Static method that returns true if this saver is capable of working
*/
exports.canSave = function(wiki) {
	return true;
};

/*
Create an instance of this saver
*/
exports.create = function(wiki) {
	return new IpfsSaver(wiki);
};

})();
