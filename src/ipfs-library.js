/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

Ipfs Library

\*/

const Buffer = require("buffer/").Buffer
const CID = require("cids");
const toMultiaddr = require("uri-to-multiaddr");
const getIpfs = require("ipfs-provider");
var Web3 = require('web3');

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {}

IpfsLibrary.prototype.fetchEnsDomainResolver = async function(domain) {
	// Check if Metamask is available
	if (typeof window.ethereum == undefined) {
		throw new Error("Non-ENS browser detected. You should consider installing MetaMask!");			
	}
	// https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider#ethereum.on(eventname%2C-callback
	// https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider#ethereum.autorefreshonnetworkchange		
	window.ethereum.autoRefreshOnNetworkChange = false;
	// Web3
	const web3 = new Web3(window.ethereum);
	// Enable
	try {
		const accounts = await window.ethereum.enable();
	} catch (error) {
		console.log(error);
		throw new Error(error.message);
	}		
	// Fetch Resolver
	try {
		const result = await web3.eth.ens.resolver(domain);
		if ($tw.utils.getIpfsVerbose()) console.log("Fetch Ens Domain Resolver...");
		if (result._address != undefined && /^0x0+$/.test(result._address) == false) {
			return (result._address);
		}
		throw new Error("Unknown Ens Domain: " + domain);
	} catch (error) {
		console.log(error);
		throw new Error(error.message);
	}
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {	
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url");
	}	
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
			apiAddress: multi,						// set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   					// set true to attempt js-ipfs initialisation
			getJsIpfs: null, 							// must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      					// set the js-ipfs options you want if tryJsIpfs is true
		});
		// Enhance provider message
		provider = provider + ", " + multi;
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs default client is unavailable: " + error.message);
	}
}

// WebExtension
IpfsLibrary.prototype.getWebExtensionIpfs = async function() {
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
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs api url");
	}	
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
			tryWebExt: false,    					// set false to bypass WebExtension verification
			tryWindow: false,    					// set false to bypass window.ipfs verification
			tryApi: true,       					// set false to bypass js-ipfs-http-client verification
			apiAddress: multi,						// set this to use an api in that address if tryApi is true
			tryJsIpfs: false,   					// set true to attempt js-ipfs initialisation
			getJsIpfs: null, 							// must be set to a js-ipfs instance if tryJsIpfs is true
			jsIpfsOpts: {}      					// set the js-ipfs options you want if tryJsIpfs is true
		});
		// Enhance provider message
		provider = provider + ", " + multi;
		return { ipfs, provider };	
	} catch (error) {
		console.log(error);
		throw new Error("Ipfs HTTP client is unavailable: " + error.message);
	}
}

IpfsLibrary.prototype.isCID = function(hash) {
	const cid = new CID(hash);
	return CID.isCID(cid);
}

IpfsLibrary.prototype.add = async function(client, content) {
  return new Promise((resolve, reject) => {
		const reader = new FileReader();
		// Process
    reader.onloadend = async function () {
			// Window Ipfs policy
			if (client.enable) {
				try {
					client = await client.enable({commands: ["add"]});
				} catch (error) {
					console.log(error);
					reject(error.message);
				}
			}
			if (client != undefined && client.add != undefined) {
				try {
					if ($tw.utils.getIpfsVerbose()) console.log("Processing buffer...");
					const buffer = await Buffer.from(reader.result);
					if ($tw.utils.getIpfsVerbose()) console.log("Buffer has been processed...");					
					const result = await client.add(buffer, { progress: function(len) {
							if ($tw.utils.getIpfsVerbose()) console.log("Ipfs upload progress:", len);  	
						}
					});
					if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs add...");
					resolve(result);
				} catch (error) {
					console.log(error);
					reject(error.message);
				}							
			} else {
				reject("Undefined Ipfs client or client add");
			}
		};
		try {
			// Read						
			if ($tw.utils.getIpfsVerbose()) console.log("Processing content...");
			reader.readAsArrayBuffer(content);
		} catch (error) {
			console.log(error);
			reject(error.message);
		}
  });
}

IpfsLibrary.prototype.get = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["get"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);				
		}
	}
	// Process
	if (client != undefined && client.get != undefined) {
		try {
			const result = await client.get(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs get...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client get");
}

IpfsLibrary.prototype.cat = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["cat"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);				
		}
	}
	// Process
	if (client != undefined && client.cat != undefined) {		
		try {
		const result = await client.cat(cid);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs cat...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client cat");
}

IpfsLibrary.prototype.pin = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["pin"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	// Process
	if (client != undefined && client.pin != undefined && client.pin.add != undefined) {
		try {
			const result = await client.pin.add(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs pin add...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client pin or client pin add");
}

IpfsLibrary.prototype.unpin = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["pin"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	// Process
	if (client != undefined && client.pin != undefined && client.pin.rm != undefined) {
		try {
			const result = await client.pin.rm(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs pin rm...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client pin or client pin rm");
}

IpfsLibrary.prototype.publish = async function(client, name, cid) {
	// Window Ipfs policy
	if (client.enable) {		
		try {
			client = await client.enable({commands: ["name"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}								
	}
	if (client != undefined && client.name != undefined && client.name.publish != undefined) {
		try {
			const result = await client.name.publish(cid, { key: name });
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs name publish...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client name or client name publish");
}

IpfsLibrary.prototype.resolve = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["name"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}				
	}
	if (client != undefined && client.name != undefined && client.name.resolve != undefined) {
		try {
			const result = await client.name.resolve(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs name resolve...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client name or client name resolve");
}

IpfsLibrary.prototype.id = async function(client) {
	// Window Ipfs policy
	if (client.enable) {
		try {		
			client = await client.enable({commands: ["id"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	if (client != undefined && client.id != undefined) {
		try {
			const result = await client.id();
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs id...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}						
	}
	throw new Error("Undefined Ipfs client or client id");
}

IpfsLibrary.prototype.keys = async function(client) {
	// Window Ipfs policy
	if (client.enable) {
		try {		
			client = await client.enable({commands: ["key"]});
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	if (client != undefined && client.key != undefined && client.key.list != undefined) {
		try {
			const result = await client.key.list();
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs key list...");
			return result;
		} catch (error) {
			console.log(error);
			throw new Error(error.message);
		}
	}
	throw new Error("Undefined Ipfs client or client key or client key list");
}

exports.IpfsLibrary = IpfsLibrary;

})();
