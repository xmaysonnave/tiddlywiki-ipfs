/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
module-type: saver

Ipfs Saver

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Select the appropriate saver module and set it up
*/
var ipfsSaver = function(wiki) {
	var self = this;
	this.wiki = wiki;
	this.verbose = true;
	this.apiUrl = null;
	this.ipfsProvider = null;
	this.needTobeUnpinned = null;
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

ipfsSaver.prototype.errorDialog = function(error) {
	if (error) {
		alert($tw.language.getString("Error/WhileSaving") + ":\n\n" + error);
	}
}

ipfsSaver.prototype.uploadProgress = function(len) {
  console.log("Ipfs upload progress:", len);  	
}

ipfsSaver.prototype.base64ToUint8Array = function(base64) {
	var raw = atob(base64);
	var uint8Array = new Uint8Array(raw.length);
	for (var i = 0; i < raw.length; i++) {
		uint8Array[i] = raw.charCodeAt(i);
	}
	return uint8Array;
}

ipfsSaver.prototype.Uint8ArrayToBase64 = function(uint8) {
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
ipfsSaver.prototype.StringToUint8Array = function(string) {
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

ipfsSaver.prototype.Utf8ArrayToStr = function(array) {
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

ipfsSaver.prototype.updatePriority = function() {
	this.info.priority = this.getPriority();
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
}

ipfsSaver.prototype.updateVerbose = function() {
	this.verbose = this.getVerbose();
}

ipfsSaver.prototype.parseUrl = function(url) {
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

ipfsSaver.prototype.parseDocumentUrl = function() { 
		const { UrlProtocol, UrlHost, UrlHostname, UrlPort, UrlPathname, UrlSearch, UrlSearchObject, UrlHash } = this.parseUrl(document.URL);
		const protocol = UrlProtocol;
		const hostname = UrlHostname;
		const pathname = UrlPathname;
		var port =  UrlPort;
		if (port == undefined || port == null || port.trim() == "") {
			port = "";
		} else {
			port = ":" + port;
		}
		return { protocol, hostname, pathname, port };
}

ipfsSaver.prototype.parseGatewayUrl = function() { 
	const gatewayUrl = this.getGatewayUrl();
	const { UrlProtocol, UrlHost, UrlHostname, UrlPort, UrlPathname, UrlSearch, UrlSearchObject, UrlHash } = this.parseUrl(gatewayUrl);
	const protocol = UrlProtocol;
	const hostname = UrlHostname;
	var port =  UrlPort;
	if (port == undefined || port == null || port.trim() == "") {
		port = "";
	} else {
		port = ":" + port;
	}
	return { protocol, hostname, port };	
}

ipfsSaver.prototype.parseApiUrl = function() { 
	const apiUrl = this.getApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url.");
	}		
	// Process	
	const { UrlProtocol, UrlHost, UrlHostname, UrlPort, UrlPathname, UrlSearch, UrlSearchObject, UrlHash } = this.parseUrl(apiUrl);
	const protocol = UrlProtocol.substring(0, UrlProtocol.length - 1);
	const hostname = UrlHostname;
	var port = UrlPort;
	if ((port == undefined || port == null || port.trim() == "") && protocol == "https") {
		port = "443";
	} else if ((port == undefined || port == null || port.trim() == "") && protocol == "http") {
		port = "80";
	} else if (port == undefined || port == null || port.trim() == "") {
		port = "80";
	}
	return { protocol, hostname, port };	
}

// Default
ipfsSaver.prototype.getDefaultIpfs = async function() {
	// Ipfs Provider
	const getIpfs = require("ipfs-provider");	
	const apiUrl = this.getApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url");
	}	
	const toMultiaddr = require("uri-to-multiaddr");	
	var apiMultiAddr;
	try {
		 apiMultiAddr = toMultiaddr(apiUrl);
	} catch (error) {
		console.log(error);
		throw new Error("Invalid Ipfs api url: " + apiUrl);
	}
	// Getting
	try {
		var { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: true,    					// set false to bypass WebExtension verification
			tryWindow: true,    					// set false to bypass window.ipfs verification
			tryApi: true,       					// set false to bypass js-ipfs-http-client verification
			apiAddress: apiMultiAddr,			// set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   					// set true to attempt js-ipfs initialisation
			getJsIpfs: null, 							// must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      					// set the js-ipfs options you want if tryJsIpfs is true
		});
		// Enhance provider message
		provider = provider + ", " + apiMultiAddr;
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs client is unavailable: " + error.message);
	}
}

// Webext
ipfsSaver.prototype.getWebextIpfs = async function() {
	// Ipfs Provider
	const getIpfs = require('ipfs-provider');
	// Getting
	try {
		const { ipfs, provider } = await getIpfs({
			// These is webext only
			tryWebExt: true,    			// set false to bypass WebExtension verification
			tryWindow: false,    			// set false to bypass window.ipfs verification
			tryApi: false,       			// set false to bypass js-ipfs-http-client verification
			apiAddress: null, 				// set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   			// set true to attempt js-ipfs initialisation
			getJsIpfs: null,    			// must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      			// set the js-ipfs options you want if tryJsIpfs is true
		});
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs Webextension is unavailable: " + error.message);
	}
}

// window.enable
ipfsSaver.prototype.getWindowIpfs = async function() {
	// IPFS Provider
	const getIpfs = require('ipfs-provider');	
	// Getting
	try {
		const { ipfs, provider } = await getIpfs({
			// These is window only
			tryWebExt: false,   // set false to bypass WebExtension verification
			tryWindow: true,    // set false to bypass window.ipfs verification
			tryApi: false,      // set false to bypass js-ipfs-http-client verification
			apiAddress: null,   // set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   // set true to attempt js-ipfs initialisation
			getJsIpfs: null,    // must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      // set the js-ipfs options you want if tryJsIpfs is true
		});
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs Companion is unavailable: " + error.message);
	}
}

// ipfs-http-client
ipfsSaver.prototype.getHttpIpfs = async function() {
	// Ipfs Provider
	const getIpfs = require("ipfs-provider");	
	const apiUrl = this.getApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url");
	}	
	const toMultiaddr = require("uri-to-multiaddr");	
	var apiMultiAddr;
	try {
		 apiMultiAddr = toMultiaddr(apiUrl);
	} catch (error) {
		console.log(error);
		throw new Error("Invalid Ipfs api url: " + apiUrl);
	}
	// Getting
	try {
		var { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,    					// set false to bypass WebExtension verification
			tryWindow: false,    					// set false to bypass window.ipfs verification
			tryApi: true,       					// set false to bypass js-ipfs-http-client verification
			apiAddress: apiMultiAddr,			// set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   					// set true to attempt js-ipfs initialisation
			getJsIpfs: null, 							// must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      					// set the js-ipfs options you want if tryJsIpfs is true
		});
		// Enhance provider message
		provider = provider + ", " + apiMultiAddr;
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs Http client is unavailable: " + error.message);
	}
}

ipfsSaver.prototype.save = async function(text, method, callback, options) {

	try {

		// Init
		var hash = null;
		var unpin = null;
		var ipfsProtocol = 'ipfs';
		var ipnsKey = null;
		var ipnsName = null;
		options = options || {};
	
		// Process document URL
		var { protocol, hostname, pathname, port } = this.parseDocumentUrl();
		var currentUrlProtocol = protocol;
		var currentUrlHostname = hostname;
		var currentUrlPathname = pathname;
		var currentUrlPort = port;

		// Check
		var gatewayUrl = this.getGatewayUrl();
		if (currentUrlProtocol == "file:" && (gatewayUrl == undefined || gatewayUrl == null || gatewayUrl.trim() == "")) {
			console.log("Undefined Ipfs gateway url");
			callback("Undefined Ipfs gateway url");
			return false;
		}		
		
		// Process Gateway URL
		var { protocol, hostname, port } = this.parseGatewayUrl();
		var gatewayUrlProtocol = protocol;
		var gatewayUrlHostname = hostname;
		var gatewayUrlPort = port;		

		//Is there anything to do
		if (currentUrlProtocol != "file:" && !$tw.saverHandler.isDirty()) {
			return false;
		}

		// Extract and check URL Ipfs protocol and hash
		if (currentUrlProtocol != "file:") {
			hash = currentUrlPathname.substring(6);
			ipfsProtocol = currentUrlPathname.substring(1, 5);
			if (ipfsProtocol == "ipfs") {
				unpin = hash;
			} else if (ipfsProtocol != "ipns") {
				console.log("Ipfs protocol not supported: " + ipfsProtocol);
				callback("Ipfs protocol not supported: " + ipfsProtocol);
				return false;
			}
			if (this.verbose) console.log("Current: /" + ipfsProtocol + "/" + hash);
		}
		
		// Getting an Ipfs client
		var { error, message, ipfs, provider } = await this.getIpfsClient(this);
		if (error != null)  {
			if (message != undefined && message.trim() != "") console.log(message);
			console.log(error);
			callback(error);
			return false;
		}
		if (this.verbose) console.log(message);	

		// Fetch the default empty directory to check if the connection is alive
		var { error, message } = await this.fetchEmptyDirectory(this, ipfs);
		if (error != null)  {
			if (message != undefined && message.trim() != "") console.log(message);
			console.log(error);
			callback(error);
			return false;
		}
		if (this.verbose) console.log(message);		

		// Check Ipns Key and Ipns Name
		if (ipfsProtocol == "ipns" || this.getProtocol() == "ipns") {

			// Getting default ipns key and ipns name
			ipnsKey = this.getIpnsKey() != null ? this.getIpnsKey().trim() == "" ? null : this.getIpnsKey().trim() : null;
			ipnsName = this.getIpnsName() != null ? this.getIpnsName().trim() == "" ? null : this.getIpnsName().trim() : null;
			// Check if available
			if (ipnsName != null && ipnsKey != null) {
				if (this.verbose) console.log("Ipns name: " + ipnsName + ", Ipns key: /ipns/" + ipnsKey);
				// Check default ipns key and default ipns name
				// If the check is failing we log and continue
				try {	
					var keys = await this.keys(this, ipfs);
					if (keys != undefined) {
						var foundKeyName = false;;
						for (var index = 0; index < keys.length; index++) { 
							if (keys[index].id == ipnsKey && keys[index].name == ipnsName) {
								foundKeyName = true;
								break;
							}
						}
						if (!foundKeyName) {
							console.log("Unknown Ipns name and key");
						}
					} else {
						console.log("Failed to analyze Ipns keys");
					}
				} catch (error) {
					console.log("Failed to retrieve Ipns keys");
					console.log(error);
				};		
			} else {
				// if ipns is requested while in ipfs, Ipns name and key must be known
				if (ipfsProtocol == "ipfs") {
					console.log("Unknown Ipns name and key");
					callback("Unknown Ipns name and key");
					return false;
				}
			}			

			// Check if available
			// If the process is failing we log and continue
			if (ipnsKey != null) {			
				// Resolve ipnsKey
				try {	
					var resolved = await this.resolve(this, ipfs, "/ipns/" + ipnsKey);
					if (resolved != undefined) {
						// Store previous cid	
						unpin = resolved.substring(6);
						if (this.verbose) console.log("Successfully resolved Ipns key: /ipfs/" + unpin);
					} else {
						console.log("Failed to resolve Ipns key: /ipns/" + ipnsKey);
					}
				} catch (error) {
					console.log("Failed to resolve Ipns key: /ipns/" + ipnsKey);
					console.log(error);
				};
			}

			// Current ipns
			if (ipfsProtocol == "ipns") {
				// Check current ipns key and default ipnskey
				// If the check is failing we log and continue
				if (hash != ipnsKey) {
					console.log("Current Ipns key: " + hash + " do not match the Ipns key: /ipns/" + ipnsKey);
				}
			} 	

		}

		// Upload	current document
		if (this.verbose) console.log("Uploading current document...");	
		// Transform the document text into a Blob
		var blob = null;
		try {
			blob = new Blob([text], {type: "text/html"});
		} catch (error) {
			console.log("Failed to transform current document");
			console.log(error);
			callback(error, "Failed to transform current document");
			return false;
		};
		// Upload		
		var { error, message, added } = await this.addToIpfs(this, ipfs, blob);
		if (error != null)  {
			if (message != undefined && message.trim() != "") console.log(message);
			console.log(error);
			callback(error);
			return false;
		}	
		if (this.verbose) console.log(message);		

		// Publish to Ipns if ipnsKey match the current hash
		// Publish to Ipns if current protocol is ipfs and ipns is requested
		// If the process is failing we log and continue
		if (unpin != added[0].hash && (this.getProtocol() == "ipns" || ipfsProtocol == "ipns")) {
			if (hash == ipnsKey || ipfsProtocol == "ipfs") {
				// Getting default ipns name
				var ipnsName = this.getIpnsName();
				if (this.verbose) console.log("Publishing Ipns name: " + ipnsName);
				try {				
					var published = await this.publish(this, ipfs, ipnsName, "/ipfs/" + added[0].hash);
					if (published == undefined) {
						console.log("Failed to publish Ipns name: " + ipnsName);
					} else if (this.verbose) {
						console.log("Successfully published Ipns name: " + ipnsName);
					}
				} catch (error) {
						console.log("Failed to publish Ipns name: " + ipnsName);
						console.log(error);
				};	
			}
		}

		// Unpin Previous
		// If the process is failing we log and continue
		if (unpin != null && unpin != added[0].hash) {
			var { error, message, unpined } = await this.unpinFromIpfs(this, ipfs, unpin);
			if (error != null)  {
				if (message != undefined && message.trim() != "") console.log(message);
				console.log(error);
			} else if (this.verbose) {
				console.log(message);
			}
		}

		// Unpin
		// If the process is failing we log and continue
		if (this.needTobeUnpinned != null) {
			for (var i = 0; i < this.needTobeUnpinned.length; i++) {
				var { error, message, unpined } = await this.unpinFromIpfs(this, ipfs, this.needTobeUnpinned[i]);
				if (error != null)  {
					if (message != undefined && message.trim() != "") console.log(message);
					console.log(error);
				} else if (this.verbose) {
					console.log(message);
				}
			}
			this.needTobeUnpinned = null;
		}
	
		// Done
		callback(null);

		// Next location
		var cid;
		if (this.getProtocol() == "ipns") {
			if (ipfsProtocol == "ipfs") {
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
			if (this.verbose) console.log("Assigning new location: " + url);
			window.location.assign(url);
		} else if (this.getProtocol() == "ipns" && ipfsProtocol != "ipns") {
			var url;
			if (currentUrlHostname == gatewayUrlHostname) {
				url = currentUrlProtocol + "//" + currentUrlHostname + currentUrlPort + cid;
			} else {
				url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + cid;
			}
			// Assign			
			if (this.verbose) console.log("Assigning new location: " + url);
			window.location.assign(url);						
		} else if ((this.getProtocol() == "ipfs" || ipfsProtocol == "ipfs") && cid != added[0].hash) {
			var url;
			if (currentUrlHostname == gatewayUrlHostname) {
				url = currentUrlProtocol + "//" + currentUrlHostname + currentUrlPort + cid;
			} else {
				url = gatewayUrlProtocol + "//" + gatewayUrlHostname + gatewayUrlPort + cid;
			}			
			// Assign
			if (this.verbose) console.log("Assigning new location: " + url);
			window.location.assign(url);
		}

	} catch (error) {
		console.log("Unable to save current document to Ipfs");	
		console.log(error);
		callback("Unable to save current document to Ipfs: " + error.message);
		return false;
	}

	return false;

};

ipfsSaver.prototype.handleFileImport = function(self, tiddler) {
	// Update tiddler	
	var addition = self.wiki.getModificationFields();
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
	return new $tw.Tiddler(tiddler, addition);
}

/* Beware you are in a widget, not in the instance of this saver */
ipfsSaver.prototype.handleDeleteTiddler = async function(self, tiddler) {
	// Process if _canonical_uri is set
	var uri = tiddler.getFieldString("_canonical_uri");
	if (uri == undefined || uri == null || uri.trim() == "") {
		return tiddler;
	}
	var cid = uri.substring(6);
	// Store cid as it needs to be unpined when the wiki is saved			
	if (self.needTobeUnpinned == null) {
		self.needTobeUnpinned = [ cid ];
	} else if (self.needTobeUnpinned.indexOf(cid) == -1) {
		self.needTobeUnpinned.push(cid);
	}
	return tiddler;
}

/* Beware you are in a widget, not in the instance of this saver */
ipfsSaver.prototype.handleSaveTiddler = async function(self, tiddler) {

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

	// Getting an Ipfs client
	var { error, message, ipfs, provider } = await self.getIpfsClient(self);
	if (error != null)  {
		if (message != undefined && message.trim() != "") console.log(message);
		console.log(error);
		self.errorDialog(error);
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}
	if (self.verbose) console.log(message);

	// Fetch the default empty directory to check if the connection is alive
	var { error, message } = await self.fetchEmptyDirectory(self, ipfs);
	if (error != null)  {
		if (message != undefined && message.trim() != "") console.log(message);
		console.log(error);
		self.errorDialog(error);
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
		return tiddler;
	}
	if (self.verbose) console.log(message);

	// Download
	if (newUri == undefined || newUri == null || newUri.trim() == "") {

		// Fetch the old uri
		var { error, message, fetched } = await self.fetch(self, ipfs, oldUri);
		if (error != null)  {
			if (message != undefined && message.trim() != "") console.log(message);
			console.log(error);
			self.errorDialog(error);
			$tw.wiki.addTiddler(new $tw.Tiddler(tiddler));
			return tiddler;
		}
		var cid = oldUri.substring(6);
		if (self.verbose) console.log(message);
		
		// Store cid as it needs to be unpined when the wiki is saved			
		if (self.needTobeUnpinned == null) {
			self.needTobeUnpinned = [ cid ];
		} else if (self.needTobeUnpinned.indexOf(cid) == -1) {
			self.needTobeUnpinned.push(cid);
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
						var base64 = self.decryptStringToBase64(self, content, password);
						self.updateSaveTiddler(self, tiddler, base64);														
						// Exit and remove the password prompt
						return true;
					}
				});
			} else {
				// Decrypt
				var base64 = self.decryptStringToBase64(self, content, null);
				self.updateSaveTiddler(self, tiddler, base64);
			}
		} else {
			var base64 = self.Uint8ArrayToBase64(content);
			self.updateSaveTiddler(self, tiddler, base64);			
		}
		
		// Return
		return tiddler;

	}

}

ipfsSaver.prototype.decryptStringToBase64 = function(self, content, password) {
		var encryptedText = self.Utf8ArrayToStr(content);
		var decryptedText = $tw.crypto.decrypt(encryptedText, password);
		var base64 = btoa(decryptedText);
		return base64;
}

ipfsSaver.prototype.updateSaveTiddler = function(self, tiddler, content) {
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
ipfsSaver.prototype.handleUploadCanonicalUri = async function(self, event) {

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
		console.log("Upload to Ipfs not supported: " + type);
		self.errorDialog("Upload to Ipfs not supported: " + type);
		return false;
	}

		// Process document URL
		var { protocol, hostname, pathname, port } = self.parseDocumentUrl();
		var currentUrlProtocol = protocol;
		var currentUrlHostname = hostname;
		var currentUrlPathname = pathname;
		var currentUrlPort = port;

		// Check
		var gatewayUrl = this.getGatewayUrl();
		if (currentUrlProtocol == "file:" && (gatewayUrl == undefined || gatewayUrl == null || gatewayUrl.trim() == "")) {
			console.log("Undefined Ipfs gateway url");
			self.errorDialog("Undefined Ipfs gateway url");
			return false;
		}		
		
		// Process Gateway URL
		var { protocol, hostname, port } = self.parseGatewayUrl();
		var gatewayUrlProtocol = protocol;
		var gatewayUrlHostname = hostname;
		var gatewayUrlPort = port;	

	// Getting an Ipfs client
	var { error, message, ipfs, provider } = await self.getIpfsClient(self);
	if (error != null)  {
		if (message != undefined && message.trim() != "") console.log(message);
		console.log(error);
		self.errorDialog(error);
		return false;
	}
	if (self.verbose) console.log(message);

	// Fetch the default empty directory to check if the connection is alive
	var { error, message } = await self.fetchEmptyDirectory(self, ipfs);
	if (error != null)  {
		if (message != undefined && message.trim() != "") console.log(message);
		console.log(error);
		self.errorDialog(error);
		return false;
	}
	if (self.verbose) console.log(message);

	// Upload	current attachment
	if (self.verbose) console.log("Uploading attachment");
	// Transform the base64 encoded file into a Blob
	var blob = null;
	try {
		// Content
		var content = tiddler.getFieldString("text");
		// Encrypt if tiddlywiki is password protected
		if ($tw.crypto.hasPassword()) {
			var decodedBase64 = atob(content);
			var encryptedText = $tw.crypto.encrypt(decodedBase64, null);
			content = self.StringToUint8Array(encryptedText);
		} else {
			content = self.base64ToUint8Array(content);
		}
		blob = new Blob([content], { type: type });	
	} catch (error) {
		console.log("Failed to transform attachment");
		console.log(error);
		self.errorDialog(error, "Failed to transform attachment");
		return false;
	};
	// Add
	var { error, message, added } = await self.addToIpfs(self, ipfs, blob);
	if (error != null)  {
		if (message != undefined && message.trim() != "") console.log(message);
		console.log(error);
		self.errorDialog(error);
		return false;
	}	
	var cid = added[0].hash;
	if (self.verbose) console.log(message);

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

ipfsSaver.prototype.arrayRemove = function(array, value) {
	return array.filter(function(element){
			return element != value;
	});
}

/* Beware you are in a widget, not in the saver */
ipfsSaver.prototype.handleChangeEvent = function(self, changes) {
	// process priority
	var priority = changes["$:/ipfs/saver/priority/default"];
	if (priority != undefined) {
		self.updatePriority();
		if (self.verbose) console.log("Ipfs Saver priority: " + self.getPriority());
	}
	// process verbose		
	var verbose = changes["$:/ipfs/saver/verbose"];
	if (verbose != undefined) {
		self.updateVerbose();
		if (self.verbose) console.log("Ipfs Saver is verbose");
	}
}

ipfsSaver.prototype.getIpfsClient = async function(self) {
	// Getting an Ipfs client
	try {
		var tmpIpfs;
		var tmpProvider;
		const policy = self.getPolicy();
		if (policy == "webext") {
			var { ipfs, provider } = await self.getWebextIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;
		} else if (policy == "window") {
			var { ipfs, provider } = await self.getWindowIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;			
		} else if (policy == "http") {
			var { ipfs, provider } = await self.getHttpIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;			
		} else  {
		 var { ipfs, provider }  = await self.getDefaultIpfs();		
		 tmpIpfs = ipfs;
		 tmpProvider = provider;		 
		}
		// Return if undefined
		if (tmpIpfs == undefined)  {
			return { 
				error: new Error("Ipfs is unavailable"), 
				message: "", 
				ipfs: null, 
				provider: null 
			};
		}			
		return { 
			error: null, 
			message: "Ipfs provider: " + provider, 
			ipfs: tmpIpfs, 
			provider: tmpProvider 
		};
	} catch (error) {
		return { 
			error: error, 
			message: "Unable to get an Ipfs client", 
			ipfs: null, 
			provider: null 
		};
	}
}

ipfsSaver.prototype.fetch = async function(self, ipfs, uri) {
	try {
		var fetched = await self.cat(self, ipfs, uri);
		if (fetched == undefined)  {
			return { 
				error: new Error("Unable to Ipfs fetch: " + uri), 
				message: "", 
				fetched: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully Ipfs fetched: " + uri, 
			fetched: fetched 
		};
	} catch (error) {
		return { 
			error: error, 
			message: "Unable to Ipfs fetch: " + uri, 
			fetched: 
			null 
		};
	}
}

ipfsSaver.prototype.fetchEmptyDirectory = async function(self, ipfs) {
		// Fetch the default empty directory to check if the connection is alive
		try {
			var empty = await self.get(self, ipfs, "/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn");
			if (empty == undefined)  {
				return { 
					error: new Error("Unable to fetch the default Ipfs empty directory"), 
					message: "", 
					empty: null 
				};
			}
			return { 
				error: null, 
				message: "Successfully fetched the default Ipfs empty directory", 
				empty: empty 
			};
		} catch (error) {
			return { 
				error: error, 
				message: "Unable to fetch the default Ipfs empty directory", 
				empty: null 
			};
		}
}

ipfsSaver.prototype.addToIpfs = async function(self, ipfs, blob) {
	// Add	
	try {
		var added = await self.add(self, ipfs, blob);
		if (added == undefined || added[0] == undefined || added[0].hash == undefined) {
			return { 
				error: new Error("Failed to Ipfs add"), 
				message: "", 
				added: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully Ipfs added: /ipfs/" + added[0].hash, 
			added: added 
		};
	} catch (error) {
		return { 
			error: error, 
			message: "Failed to Ipfs add", 
			added: null 
		};
	};
}

ipfsSaver.prototype.pinFromIpfs = async function(self, ipfs, pin) {
	// Unpin
	try {	
		var pined = await self.pin(self, ipfs, "/ipfs/" + pin);
		if (pined == undefined) {
			return { 
				error: new Error("Failed to Ipfs pin: /ipfs/" + pin), 
				message: "", 
				unpined: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully Ipfs pined: /ipfs/" + pin, 
			unpined: pined 
		};
	} catch (error) {
		return { 
			error: new Error("Failed to Ipfs pin: /ipfs/" + pin), 
			message: "", 
			unpined: null 
		};
	};	
}

ipfsSaver.prototype.unpinFromIpfs = async function(self, ipfs, unpin) {
	// Unpin
	try {	
		var unpined = await self.unpin(self, ipfs, "/ipfs/" + unpin);
		if (unpined == undefined) {
			return { 
				error: new Error("Failed to Ipfs unpin: /ipfs/" + unpin), 
				message: "", 
				unpined: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully Ipfs unpined: /ipfs/" + unpin, 
			unpined: unpined 
		};
	} catch (error) {
		return { 
			error: new Error("Failed to Ipfs unpin: /ipfs/" + unpin), 
			message: "", 
			unpined: null 
		};
	};	
}

ipfsSaver.prototype.add = async function(self, client, content) {
  return new Promise((resolve, reject) => {
		const reader = new FileReader();
		// Process
    reader.onloadend = async function () {
			if (self.verbose) console.log("Processing buffer result...");
			const buffer = await Buffer.from(reader.result);
			// Window Ipfs policy
			if (client.enable) {
				try {
					client = await client.enable({commands: ['add']});
				} catch (error) {
					console.log(error);
					reject(error.message);
				}
			}
			if (client != undefined && client.add != undefined) {
				client.add(buffer, { progress: self.uploadProgress })
					.then (result => {
						if (self.verbose) console.log("Processing add result...");
						resolve(result);
					})
					.catch (error => {
						console.log(error);
						reject(error.message);
					});
			} else {
				reject("Undefined Ipfs client or client add");
			}
		};
		try {
			// Read						
			if (self.verbose) console.log("Processing add content...");
			reader.readAsArrayBuffer(content);
		} catch (error) {
			console.log(error);
			reject(error.message);
		}
  });
}

ipfsSaver.prototype.get = async function(self, client, cid) {
	return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {
				client = await client.enable({commands: ['get']});
			} catch (error) {
				console.log(error);
				reject(error.message);				
			}
		}
		if (client != undefined && client.get != undefined) {		
			client.get(cid)
			.then (result => {
				if (self.verbose) console.log("Processing get result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});
		} else {
			reject("Undefined Ipfs client or client get");
		}
	});
}

ipfsSaver.prototype.cat = async function(self, client, cid) {
	return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {
				client = await client.enable({commands: ['cat']});
			} catch (error) {
				console.log(error);
				reject(error.message);				
			}
		}
		if (client != undefined && client.cat != undefined) {		
			client.cat(cid)
			.then (result => {
				if (self.verbose) console.log("Processing cat result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});
		} else {
			reject("Undefined Ipfs client or client cat");
		}
	});
}

ipfsSaver.prototype.pin = async function(self, client, cid) {
  return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {
				client = await client.enable({commands: ['pin']});
			} catch (error) {
				console.log(error);
				reject(error.message);
			}
		}
		if (client != undefined && client.pin != undefined && client.pin.add != undefined) {
			client.pin.add(cid)
			.then (result => {
				if (self.verbose) console.log("Processing pin result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});			
		} else {
			reject("Undefined Ipfs client or client pin or client pin add");
		}
  });
}

ipfsSaver.prototype.unpin = async function(self, client, cid) {
  return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {
				client = await client.enable({commands: ['pin']});
			} catch (error) {
				console.log(error);
				reject(error.message);
			}
		}
		if (client != undefined && client.pin != undefined && client.pin.rm != undefined) {
			client.pin.rm(cid)
			.then (result => {
				if (self.verbose) console.log("Processing unpin result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});			
		} else {
			reject("Undefined Ipfs client or client pin or client pin rm");
		}
  });
}

ipfsSaver.prototype.publish = async function(self, client, name, cid) {
  return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {		
			try {
				client = await client.enable({commands: ['name']});
			} catch (error) {
				console.log(error);
				reject(error.message);
			}								
		}
		if (client != undefined && client.name != undefined && client.name.publish != undefined) {
			client.name.publish(cid, { key: name })
			.then (result => {
				if (self.verbose) console.log("Processing publish result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});
		} else {
			reject("Undefined Ipfs client or client name or client name publish");
		}
  });
}

ipfsSaver.prototype.resolve = async function(self, client, hash) {
  return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {
				client = await client.enable({commands: ['name']});
			} catch (error) {
				console.log(error);
				reject(error.message);
			}				
		}
		if (client != undefined && client.name != undefined && client.name.resolve != undefined) {
			client.name.resolve(hash)
			.then (result => {
				if (self.verbose) console.log("Processing resolve result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});			
		} else {
			reject("Undefined Ipfs client or client name or client name resolve");
		}
  });
}

ipfsSaver.prototype.id = async function(self, client) {
  return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {		
				client = await client.enable({commands: ['id']});
			} catch (error) {
				console.log(error);
				reject(error.message);
			}
		}
		if (client != undefined && client.id != undefined) {
			client.id()
			.then (result => {
				if (self.verbose) console.log("Processing id result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});						
		} else {
			reject("Undefined Ipfs client or client id");
		}
  });
}

ipfsSaver.prototype.keys = async function(self, client) {
  return new Promise(async (resolve, reject) => {
		// Window Ipfs policy
		if (client.enable) {
			try {		
				client = await client.enable({commands: ['key']});
			} catch (error) {
				console.log(error);
				reject(error.message);
			}
		}
		if (client != undefined && client.key != undefined && client.key.list != undefined) {
			client.key.list()
			.then (result => {
				if (self.verbose) console.log("Processing key result...");
				resolve(result);
			})
			.catch (error => {
				console.log(error);
				reject(error.message);
			});						
		} else {
			reject("Undefined Ipfs client or client key or client key list");
		}
  });
}

ipfsSaver.prototype.sleep = function(seconds) {
	var waitUntil = new Date().getTime() + seconds*1000;
	while(new Date().getTime() < waitUntil) true;
}

/*
Information about this saver
*/
ipfsSaver.prototype.info = {
	name: "ipfs",
	priority: 3000,
	capabilities: ["save", "autosave"]
};

/*
Retrieve ipfs saver priority with default value if applicable
*/
ipfsSaver.prototype.getPriority = function() {
	var priority = this.wiki.getTiddler("$:/ipfs/saver/priority/default");
	if (priority != undefined) {
		priority = priority.getFieldString("text");
	}
	priority = this.wiki.getTiddler(priority);
	if (priority != undefined) {
	 	priority = priority.getFieldString("text");
	}	
	if (priority == undefined || priority == null || priority.trim() == "") {
		priority = this.getDefaultPriority();
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
ipfsSaver.prototype.getDefaultPriority = function() {
	return 3000;
}

/*
Retrieve ipfs saver protocol with default value if applicable
*/
ipfsSaver.prototype.getProtocol = function() {
	var protocol;
	if (this.wiki.getTiddler("$:/ipfs/saver/protocol") != undefined) {
		protocol = this.wiki.getTiddler("$:/ipfs/saver/protocol").getFieldString("text");
	}
	if (protocol == undefined || protocol == null || protocol.trim() == "") {
		protocol = this.getDefaultProtocol();
	}
	return protocol;
}

/*
Default Protocol
*/
ipfsSaver.prototype.getDefaultProtocol = function() {
	return "ipfs";
}

/*
Retrieve ipfs saver api url with default value if applicable
*/
ipfsSaver.prototype.getApiUrl = function() {
	var api = this.wiki.getTiddler("$:/ipfs/saver/api/default");
	if (api != undefined) {
		api = api.getFieldString("text");
	}
	api = this.wiki.getTiddler(api);
	if (api != undefined) {
	 	api = api.getFieldString("text");
	}	
	if (api == undefined || api == null || api.trim() == "") {
		api = this.getDefaultApiUrl();
	}
	return api;
}

/*
Default Api Url
*/
ipfsSaver.prototype.getDefaultApiUrl = function() {
	return "https://ipfs.infura.io:5001";
}

/*
Retrieve ipfs saver gateway url with default value if applicable
*/
ipfsSaver.prototype.getGatewayUrl = function() {
	var gateway = this.wiki.getTiddler("$:/ipfs/saver/gateway/default");
	if (gateway != undefined) {
		gateway = gateway.getFieldString("text");
	}
	gateway = this.wiki.getTiddler(gateway);
	if (gateway != undefined) {
	 	gateway = gateway.getFieldString("text");
	}	
	if (gateway == undefined || gateway == null || gateway.trim() == "") {
		gateway = this.getDefaultGatewayUrl();
	}
	return gateway;
}

/*
Default Gateway Url
*/
ipfsSaver.prototype.getDefaultGatewayUrl = function() {
	return "https://ipfs.infura.io";
}

/*
Retrieve ipfs saver ipns name with default value if applicable
*/
ipfsSaver.prototype.getIpnsName = function() {
	var ipnsName;
	if (this.wiki.getTiddler("$:/ipfs/saver/ipns/name") != undefined) {
		ipnsName = this.wiki.getTiddler("$:/ipfs/saver/ipns/name").getFieldString("text");
	}
	if (ipnsName == undefined || ipnsName == null || ipnsName.trim() == "") {
		ipnsName = this.getDefaultIpnsName();
	}
	return ipnsName;
}

/*
Default Ipns Name
*/
ipfsSaver.prototype.getDefaultIpnsName = function() {
	return "tiddly";
}

/*
Retrieve ipfs saver ipns key with default value if applicable
*/
ipfsSaver.prototype.getIpnsKey = function() {
	var ipnsKey;
	if (this.wiki.getTiddler("$:/ipfs/saver/ipns/key") != undefined) {
		ipnsKey = this.wiki.getTiddler("$:/ipfs/saver/ipns/key").getFieldString("text");
	}
	if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() == "") {
		ipnsKey = this.getDefaultIpnsKey();
	}
	return ipnsKey;
}

/*
Default Ipns Key
*/
ipfsSaver.prototype.getDefaultIpnsKey = function() {
	return "QmV8ZQH9s4hHxPUeFJH17xt7GjmjGj8tEg7uQLz8HNSvFJ";
}

/*
Retrieve ipfs saver verbose with default value if applicable
*/
ipfsSaver.prototype.getVerbose = function() {
	var verbose;
	if (this.wiki.getTiddler("$:/ipfs/saver/verbose") != undefined) {
		verbose = this.wiki.getTiddler("$:/ipfs/saver/verbose").getFieldString("text");
	}
	if (verbose == undefined || verbose == null || verbose.trim() == "") {
		verbose = true;
	} else {
		verbose = ( verbose == this.getDefaultVerbose() );
	}
	return verbose;
}

/*
Default Verbose
*/
ipfsSaver.prototype.getDefaultVerbose = function() {
	return "yes";
}

/*
Retrieve ipfs saver policy with default value if applicable
*/
ipfsSaver.prototype.getPolicy = function() {
	var policy;
	if (this.wiki.getTiddler("$:/ipfs/saver/policy") != undefined) {
		policy = this.wiki.getTiddler("$:/ipfs/saver/policy").getFieldString("text");
	}
	if (policy == undefined || policy == null || policy.trim() == "") {
		policy = this.getDefaultPolicy();
	}
	return policy;
}

/*
Default Policy
*/
ipfsSaver.prototype.getDefaultPolicy = function() {
		return "default";
}

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
	return new ipfsSaver(wiki);
};

})();
