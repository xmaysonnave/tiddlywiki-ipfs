/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

Ipfs Library

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {
	// Ipfs Provider
	const getIpfs = require("ipfs-provider");	
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url");
	}	
	const toMultiaddr = require("uri-to-multiaddr");
	var multi;
	try {
		 multi = toMultiaddr(apiUrl);
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
			apiAddress: multi,			// set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   					// set true to attempt js-ipfs initialisation
			getJsIpfs: null, 							// must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      					// set the js-ipfs options you want if tryJsIpfs is true
		});
		// Enhance provider message
		provider = provider + ", " + multi;
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs client is unavailable: " + error.message);
	}
}

// WebExtension
IpfsLibrary.prototype.getWebExtensionIpfs = async function() {
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
		throw new Error("Ipfs WebExtension is unavailable: " + error.message);
	}
}

// window.enable
IpfsLibrary.prototype.getWindowIpfs = async function() {
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
IpfsLibrary.prototype.getHttpIpfs = async function() {
	// Ipfs Http Client
	var ipfsClient = require('ipfs-http-client');
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url");
	}	
	const toMultiaddr = require("uri-to-multiaddr");
	var multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.log(error);
		throw new Error("Invalid Ipfs api url: " + apiUrl);
	}
	// Getting
	try {
		const ipfs = ipfsClient(multi);
		const provider = "IPFS_HTTP_API, " + multi;
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs Http client is unavailable: " + error.message);
	}
}

IpfsLibrary.prototype.isCID = function(hash) {
	const { CID } = require('ipfs-http-client');
	const cid = new CID(hash);
	return CID.isCID(cid);
}

IpfsLibrary.prototype.add = async function(client, content) {
  return new Promise((resolve, reject) => {
		const reader = new FileReader();
		// Process
    reader.onloadend = async function () {
			if ($tw.utils.getIpfsVerbose()) console.log("Processing buffer result...");
			const { Buffer } = require('ipfs-http-client');
			const buffer = await Buffer.from(reader.result);
			if ($tw.utils.getIpfsVerbose()) console.log("Buffer result has been processed...");
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
				client.add(buffer, { progress: function(len) {
							if ($tw.utils.getIpfsVerbose()) console.log("Ipfs upload progress:", len);  	
						}
					})
					.then (result => {
						if ($tw.utils.getIpfsVerbose()) console.log("Processing add result...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing add content...");
			reader.readAsArrayBuffer(content);
		} catch (error) {
			console.log(error);
			reject(error.message);
		}
  });
}

IpfsLibrary.prototype.get = async function(client, cid) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing get result...");
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

IpfsLibrary.prototype.cat = async function(client, cid) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing cat result...");
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

IpfsLibrary.prototype.pin = async function(client, cid) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing pin result...");
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

IpfsLibrary.prototype.unpin = async function(client, cid) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing unpin result...");
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

IpfsLibrary.prototype.publish = async function(client, name, cid) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing publish result...");
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

IpfsLibrary.prototype.resolve = async function(client, cid) {
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
			client.name.resolve(cid)
			.then (result => {
				if ($tw.utils.getIpfsVerbose()) console.log("Processing resolve result...");
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

IpfsLibrary.prototype.id = async function(client) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing id result...");
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

IpfsLibrary.prototype.keys = async function(client) {
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
				if ($tw.utils.getIpfsVerbose()) console.log("Processing key result...");
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

exports.IpfsLibrary = IpfsLibrary;

})();
