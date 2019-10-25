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

var IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

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
	// Event management
	$tw.wiki.addEventListener("change", function(changes) { 
		return self.handleChangeEvent(self, changes);
	});
	$tw.rootWidget.addEventListener("tm-ipfs-tiddler", function(event) {
		return self.handleUploadCanonicalUri(self, event);
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

IpfsSaver.prototype.save = async function(text, method, callback, options) {

	try {

		// Init
		var hash = null;
		var unpin = null;
		var ipfsProtocol = 'ipfs';
		var ensDomain = null;		
		var ipnsKey = null;
		var ipnsName = null;
		options = options || {};
	
		// Process document URL
		var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(document.URL);
		var currentUrlProtocol = protocol;
		var currentUrlHostname = hostname;
		var currentUrlPathname = pathname;
		var currentUrlPort = port;

		// Check
		const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
		if (currentUrlProtocol == "file:" && (gatewayUrl == undefined || gatewayUrl == null || gatewayUrl.trim() == "")) {
			const message = "Undefined Ipfs Gateway url";
			console.log(message);
			callback(message);
			return false;
		}		
		
		// Process Gateway URL
		var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(gatewayUrl);
		var gatewayUrlProtocol = protocol;
		var gatewayUrlHostname = hostname;
		var gatewayUrlPort = port;		

		//Is there anything to do
		if (currentUrlProtocol != "file:" && !$tw.saverHandler.isDirty()) {
			return false;
		}

		// Extract and check URL Ipfs protocol and hash
		if (currentUrlProtocol != "file:") {
			// Prevent any disruption
			try  {
				hash = currentUrlPathname.substring(6);
				ipfsProtocol = currentUrlPathname.substring(1, 5);
			} catch (error) {
				hash = null;
				ipfsProtocol = "ipfs";
			}
			// Process if any
			if (hash != null) {
				if (ipfsProtocol == "ipfs") {
					if (this.needTobeUnpinned.indexOf(hash) == -1) {
						unpin = hash;
						this.needTobeUnpinned.push(hash);
						if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + hash);
					}
				} else if (ipfsProtocol == "ipns") {
					// Fallback to default protocol										
					if (this.ipfsWrapper.isCID(hash) == false) {
						hash = null;
						ipfsProtocol = "ipfs";
					}
				// Fallback to default protocol					
				} else if (ipfsProtocol != "ipns") {
					hash = null;
					ipfsProtocol = "ipfs";
				}
			}
		}
		
		// Getting an Ipfs client
		var { error, ipfs, provider } = await this.ipfsWrapper.getIpfsClient();
		if (error != null)  {
			console.log(error);
			callback(error.message);
			return false;
		}

		// Retrieve the default empty directory to check if the connection is alive
		var { error, empty } = await this.ipfsWrapper.getEmptyDirectory(ipfs);
		if (error != null)  {
			console.log(error);
			callback(error.message);
			return false;
		}

		// Check Ipns Key and Ipns Name
		if (ipfsProtocol == "ipns" || $tw.utils.getIpfsProtocol() == "ipns") {
			
			// Getting default ipns key and ipns name
			ipnsKey = $tw.utils.getIpfsIpnsKey() != null ? $tw.utils.getIpfsIpnsKey().trim() == "" ? null : $tw.utils.getIpfsIpnsKey().trim() : null;
			ipnsName = $tw.utils.getIpfsIpnsName() != null ? $tw.utils.getIpfsIpnsName().trim() == "" ? null : $tw.utils.getIpfsIpnsName().trim() : null;
			// Check if available
			if (ipfsProtocol == "ipfs" && (ipnsName == null || ipnsKey == null)) {
				const message = "Undefined Ipns name and key...";
				console.log(message);
				callback(message);
				return false;				
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Ipns name: " + ipnsName + ", Ipns key: /ipns/" + ipnsKey);

			// Check default ipns key and default ipns name
			// If the check failed we log and continue
			var { error, keys } = await this.ipfsWrapper.getKeys(ipfs);
			if (error == null) {
				var foundKeyName = false;;
				for (var index = 0; index < keys.length; index++) { 
					if (keys[index].id == ipnsKey && keys[index].name == ipnsName) {
						foundKeyName = true;
						break;
					}
				}
				if (foundKeyName == false) {
					console.log("Unknown Ipns name and key");
				}
			} else {
				console.log(error);	
			};

			// Check if available
			// If the process failed we log and continue
			if (ipnsKey != null) {			
				// Resolve ipnsKey
				var { error, resolved } = await this.ipfsWrapper.resolveFromIpfs(ipfs, ipnsKey);
				if (error == null) {
					// Store to unpin previous	
					unpin = resolved.substring(6);
					if (this.needTobeUnpinned.indexOf(unpin) == -1) {
						this.needTobeUnpinned.push(unpin);
						if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + unpin);
					}
				} else {
					console.log(error);
				}
			}

			// Current ipns
			if (ipfsProtocol == "ipns") {
				// Check current ipns key and default ipnskey
				// If the check is failing we log and continue
				if (hash != null && ipnsKey != hash) {
					console.log("Current Ipns key: " + hash + " do not match the Ipns key: /ipns/" + ipnsKey);
				}
			} 	

		// Check Ens domain
		} else if ($tw.utils.getIpfsProtocol() == "ens") {

			// Getting default ens domain
			ensDomain = $tw.utils.getIpfsEnsDomain() != null ? $tw.utils.getIpfsEnsDomain().trim() == "" ? null : $tw.utils.getIpfsEnsDomain().trim() : null;
			// Check if available
			if (ensDomain == null) {
				const message  ="Undefined Ens Domain...";
				console.log(message);
				callback(message);
				return false;				
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Ens Domain: " + ensDomain);
			
			// Fetch Ens domain content
			var { error, resolver } = await this.ipfsWrapper.getContentHash(ensDomain);
			if (error != null)  {
				console.log(error);
				callback(error.message);
				return false;
			}
			
		}

		// Upload	current document
		if ($tw.utils.getIpfsVerbose()) console.log("Uploading current document...");	
		// Transform the document text into a Blob
		var blob = null;
		try {
			blob = new Blob([text], {type: "text/html"});
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
		// If the process failed we log and continue
		if (unpin != added[0].hash && ($tw.utils.getIpfsProtocol() == "ipns" || ipfsProtocol == "ipns")) {
			// Publish to Ipns if ipnsKey match the current hash or current protocol is ipfs	
			if (hash == ipnsKey || ipfsProtocol == "ipfs") {
				// Getting default ipns name
				var ipnsName = $tw.utils.getIpfsIpnsName();
				if ($tw.utils.getIpfsVerbose()) console.log("Publishing Ipns name: " + ipnsName);
				var { error, published } = await this.ipfsWrapper.publishToIpfs(ipfs, ipnsName, added[0].hash);
				if (error == null) {
					console.log(error);
				}
			}
		}

		// Unpin
		// If the process failed we log and continue
		if (this.needTobeUnpinned.length > 0) {
			for (var i = 0; i < this.needTobeUnpinned.length; i++) {
				var { error, unpined } = await this.ipfsWrapper.unpinFromIpfs(ipfs, this.needTobeUnpinned[i]);
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
		if ($tw.utils.getIpfsProtocol() == "ipns") {
			if (ipfsProtocol == "ipfs" || hash == null) {
				cid = "/ipns/" + ipnsKey;
			} else {
				cid = "/ipns/" + hash;
			}
		} else {
			cid = "/ipfs/" + added[0].path;
		}
		if (currentUrlProtocol == "file:") {
			var url;
			url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + cid;
			// Assign
			if ($tw.utils.getIpfsVerbose()) console.log("Assigning new location: " + url);
			window.location.assign(url);
		} else if ($tw.utils.getIpfsProtocol() == "ipns" && ipfsProtocol != "ipns") {
			var url;
			if (currentUrlHostname == gatewayUrlHostname) {
				url = currentUrlProtocol + "//" + currentUrlHostname + currentUrlPort + cid;
			} else {
				url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + cid;
			}
			// Assign			
			if ($tw.utils.getIpfsVerbose()) console.log("Assigning new location: " + url);
			window.location.assign(url);						
		} else if (($tw.utils.getIpfsProtocol() == "ipfs" || ipfsProtocol == "ipfs") && cid != added[0].hash) {
			var url;
			if (currentUrlHostname == gatewayUrlHostname) {
				url = currentUrlProtocol + "//" + currentUrlHostname + currentUrlPort + cid;
			} else {
				url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + cid;
			}			
			// Assign
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
	var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isAttachment") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isAttachment");	
	}	
	// Add isEmbedded tag
	index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isEmbedded") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isEmbedded");	
	}
	return new $tw.Tiddler(tiddler, addition);
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleDeleteTiddler = async function(self, tiddler) {
	// Process if _canonical_uri is set
	const uri = tiddler.getFieldString("_canonical_uri");
	if (uri == undefined || uri == null || uri.trim() == "") {
		return tiddler;
	}
	const { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(uri);
	const cid = pathname.substring(6);
	// Store cid as it needs to be unpined when the wiki is saved			
 	if (self.needTobeUnpinned.indexOf(cid) == -1) {
		self.needTobeUnpinned.push(cid);
		if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + cid);
	}
	return tiddler;
}

/* Beware you are in a widget, not in the instance of this saver */
IpfsSaver.prototype.handleSaveTiddler = async function(self, tiddler) {

	// oldTiddler
	var oldTiddler = self.wiki.getTiddler(tiddler.fields.title);
	if (oldTiddler == undefined || oldTiddler == null) {
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}
	// Process if _canonical_uri is set
	var oldUri = oldTiddler.getFieldString("_canonical_uri");
	if (oldUri == undefined || oldUri == null || oldUri.trim() == "") {
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	// newTiddler _canonical_uri
	var newUri = tiddler.getFieldString("_canonical_uri");
	// Nothing to do
	if (oldUri == newUri) {
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	const { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(oldUri);
	var cid = pathname.substring(6);

	// Getting an Ipfs client
	var { error, ipfs, provider } = await self.ipfsWrapper.getIpfsClient();
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	// Retrieve the default empty directory to check if the connection is alive
	var { error, empty } = await self.ipfsWrapper.getEmptyDirectory(ipfs);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}

	// Download
	if (newUri == undefined || newUri == null || newUri.trim() == "") {

		// Fetch the old cid
		var { error, fetched } = await self.ipfsWrapper.fetch(ipfs, cid);
		if (error != null)  {
			console.log(error);
			self.errorDialog(error.message);
			$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
			return tiddler;
		}
		
		// Store old cid as it needs to be unpined when the wiki is saved			
		if (self.needTobeUnpinned.indexOf(cid) == -1) {
			self.needTobeUnpinned.push(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Request to unpin: " + cid);
		}

		// Content
		var content = fetched;
		
		// Decrypt
		var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isEncrypted") : -1;
		if (index != -1) {			
			// Request for password if unknown
			var password = null;
			if ($tw.crypto.hasPassword() == false) {
				// Prompt
				$tw.passwordPrompt.createPrompt({
					serviceName: "Enter a password to decrypt the imported attachment",
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
						var base64 = $tw.utils.DecryptStringToBase64(content, password);
						self.updateSaveTiddler(self, tiddler, base64);														
						// Exit and remove the password prompt
						return true;
					}
				});
			} else {
				// Decrypt
				var base64 = $tw.utils.DecryptStringToBase64(content, null);
				self.updateSaveTiddler(self, tiddler, base64);
			}
		} else {
			var base64 = $tw.utils.Uint8ArrayToBase64(content);
			self.updateSaveTiddler(self, tiddler, base64);			
		}
		
		// Return
		return tiddler;

	}

}

IpfsSaver.prototype.updateSaveTiddler = function(self, tiddler, content) {
		// Update tiddler	
		var addition = $tw.wiki.getModificationFields();
		addition.title = tiddler.fields.title;
		addition.tags = (tiddler.fields.tags || []).slice(0);					
		// Add isAttachment tag
		var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isAttachment") : -1;
		if (index == -1) {
			$tw.utils.pushTop(addition.tags, "$:/isAttachment");
		}		
		// Add isEmbedded tag
		var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isEmbedded") : -1;
		if (index == -1) {
			$tw.utils.pushTop(addition.tags, "$:/isEmbedded");
		}
		// Remove isIpfs tag
		var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isIpfs") : -1;
		if (index != -1) {
			addition.tags = self.arrayRemove(addition.tags, "$:/isIpfs");
		}	
		// Remove isEncrypted tag
		var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isEncrypted") : -1;
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
	var tiddler = self.wiki.getTiddler(event.tiddlerTitle);
	if (tiddler == undefined || tiddler == null) {
		return false;			
	}

	// Do not process if _canonical_uri is set
	var uri = tiddler.getFieldString("_canonical_uri");
	if (uri != undefined && uri != null && uri.trim() != "") {
		return false;
	}

	// Check content type, only base64 is suppported yet
	var type = tiddler.getFieldString("type");
	// default
	if (type == undefined || type.trim() == "") {
		type = "text/html";
	}
	var info = $tw.config.contentTypeInfo[type];
	if (info == undefined || info.encoding != "base64") {
		const message = "Upload to Ipfs is only supported for attached files";
		console.log(message);
		self.errorDialog(message);
		return false;
	}

	// Process document URL
	var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(document.URL);
	var currentUrlProtocol = protocol;
	var currentUrlHostname = hostname;
	var currentUrlPathname = pathname;
	var currentUrlPort = port;

	// Check
	var gatewayUrl = $tw.utils.getIpfsGatewayUrl();
	if (currentUrlProtocol == "file:" && (gatewayUrl == undefined || gatewayUrl == null || gatewayUrl.trim() == "")) {
		const msg = "Undefined Ipfs gateway url";
		console.log(msg);
		self.errorDialog(msg);
		return false;
	}		
	
	// Process Gateway URL
	var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(gatewayUrl);
	var gatewayUrlProtocol = protocol;
	var gatewayUrlHostname = hostname;
	var gatewayUrlPort = port;	

	// Getting an Ipfs client
	var { error, ipfs, provider } = await self.ipfsWrapper.getIpfsClient();
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Retrieve the default empty directory to check if the connection is alive
	var { error, empty } = await self.ipfsWrapper.getEmptyDirectory(ipfs);
	if (error != null)  {
		console.log(error);
		self.errorDialog(error.message);
		return false;
	}

	// Upload	current attachment
	if ($tw.utils.getIpfsVerbose()) console.log("Uploading attachment");
	// Transform the base64 encoded file into a Blob
	var blob = null;
	try {
		// Content
		var content = tiddler.getFieldString("text");
		// Encrypt if tiddlywiki is password protected
		if ($tw.crypto.hasPassword()) {
			var decodedBase64 = atob(content);
			var encryptedText = $tw.crypto.encrypt(decodedBase64, null);
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
	var cid = added[0].hash;

	// Update current tiddler
	var addition = $tw.wiki.getModificationFields();
	addition.title = tiddler.fields.title;
	addition.tags = (tiddler.fields.tags || []).slice(0);
	// Add isAttachment tag
	var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isAttachment") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isAttachment");
	}	
	// Add isIpfs tag
	var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isIpfs") : -1;
	if (index == -1) {
		$tw.utils.pushTop(addition.tags, "$:/isIpfs");
	}
	// Add isEncrypted tag
	if ($tw.crypto.hasPassword()) {
		$tw.utils.pushTop(addition.tags, "$:/isEncrypted");
	}
	// Remove Embedded tag
	var index = tiddler.fields.tags != undefined ? tiddler.fields.tags.indexOf("$:/isEmbedded") : -1;
	if (index != -1) {
		addition.tags = self.arrayRemove(addition.tags, "$:/isEmbedded");
	}
	// Process _canonical_uri
	var url;	
	if (currentUrlProtocol == "file:") {
		url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + "/ipfs/" + cid;
	} else {
		if (currentUrlHostname == gatewayUrlHostname) {
			url = currentUrlProtocol + "//" + currentUrlHostname + currentUrlPort + "/ipfs/" + cid;
		} else {
			url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + "/ipfs/" + cid;
		}			
	}	
	addition["_canonical_uri"] = url;
	// Reset text
	addition["text"] = undefined;
	$tw.wiki.addTiddler(new $tw.Tiddler(tiddler, addition));
	
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
	if (priority != undefined) {
		// Load priority property
		var priority = $tw.utils.updateIpfsPriority()
		if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver priority: " + priority);
	}
	// process verbose		
	var verbose = changes["$:/ipfs/saver/verbose"];
	if (verbose != undefined) {
		if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver is verbose");
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
