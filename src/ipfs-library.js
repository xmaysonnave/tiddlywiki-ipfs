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

IpfsLibrary.prototype.getWeb3 = async function() {
	// Check if Metamask is available
	if (typeof window.ethereum == undefined) {
		throw new Error("Non-ENS browser detected. You should consider installing MetaMask...");			
	}
	// https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider#ethereum.autorefreshonnetworkchange		
	window.ethereum.autoRefreshOnNetworkChange = false;
	// Web3
	var web3;
	try {
		web3 = new Web3(window.ethereum);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to instantiate Web3...");
	}						
	// Enable
	var accounts;
	try {
		accounts = await window.ethereum.enable();
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to enable MetaMask...");
	}				
	// Mainnet
	if (window.ethereum.networkVersion !== "1") {
		throw new Error("The network should be Ethereum Main...");
	}	
	// Return a web3 instance and the current owner
	return { 
		web3: web3, 
		owner: accounts[0]
	};
}

IpfsLibrary.prototype.fetchEnsDomainResolver = async function(domain) {
	// Retrieve a web3 instance and Metamask owner
	const { web3, owner } = await this.getWeb3();
	// Fetch Resolver	
	var result;
	try {
		result = await web3.eth.ens.resolver(domain);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain resolver...");
	}		
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver...");
	// Exist
	if (result._address == undefined || /^0x0+$/.test(result._address) == true) {
		throw new Error("Unknown Ens domain...");
	}
	// Ownership
	var address;
	try {
		address = await web3.eth.ens.getAddress(domain);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain address...");
	}		
	if (address == undefined) {
		throw new Error("Undefined Ethereum Ens domain address...");			
	}				
	if (web3.utils.toChecksumAddress(address) != web3.utils.toChecksumAddress(owner)) {
		throw new Error("Ens Domain non-ownership...");
	}		
	return (result._address);	
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {	
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs Api Url...");
	}	
	var multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.log(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
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
		console.log(error.message);
		throw new Error("Ipfs default is unavailable...");
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
		console.log(error.message);
		throw new Error("Ipfs WebExtension is unavailable...");
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
		console.log(error.message);
		throw new Error("Ipfs Companion is unavailable...");
	}
}

// ipfs-http-client
IpfsLibrary.prototype.getHttpIpfs = async function() {
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs Api Url...");
	}	
	var multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.log(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
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
		console.log(error.message);
		throw new Error("Ipfs Http is unavailable...");
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
					console.log(error.message);
					reject("Unable to enable Ipfs add...");
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
					console.log(error.message);
					reject("Unable to Ipfs add...");
				}							
			} else {
				reject("Undefined Ipfs add...");
			}
		};
		try {
			// Read						
			if ($tw.utils.getIpfsVerbose()) console.log("Processing content...");
			reader.readAsArrayBuffer(content);
		} catch (error) {
			console.log(error.message);
			reject("Unable to read content...");
		}
  });
}

IpfsLibrary.prototype.get = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["get"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs get...");
		}
	}
	// Process
	if (client != undefined && client.get != undefined) {
		try {
			const result = await client.get(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs get...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs get...");
		}
	}
	throw new Error("Undefined Ipfs get...");
}

IpfsLibrary.prototype.cat = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["cat"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs cat...");
		}
	}
	// Process
	if (client != undefined && client.cat != undefined) {		
		try {
		const result = await client.cat(cid);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs cat...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs cat...");
		}
	}
	throw new Error("Undefined Ipfs cat...");
}

IpfsLibrary.prototype.pin = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["pin"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs pin...");
		}
	}
	// Process
	if (client != undefined && client.pin != undefined && client.pin.add != undefined) {
		try {
			const result = await client.pin.add(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs pin...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs pin...");
		}
	}
	throw new Error("Undefined Ipfs pin...");
}

IpfsLibrary.prototype.unpin = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["pin"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs pin...");
		}
	}
	// Process
	if (client != undefined && client.pin != undefined && client.pin.rm != undefined) {
		try {
			const result = await client.pin.rm(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs unpin...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs unpin...");
		}
	}
	throw new Error("Undefined Ipfs unpin");
}

IpfsLibrary.prototype.publish = async function(client, name, cid) {
	// Window Ipfs policy
	if (client.enable) {		
		try {
			client = await client.enable({commands: ["name"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipns name...");
		}								
	}
	if (client != undefined && client.name != undefined && client.name.publish != undefined) {
		try {
			const result = await client.name.publish(cid, { key: name });
			if ($tw.utils.getIpfsVerbose()) console.log("Processing publish Ipns name...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to publish Ipns name...");
		}
	}
	throw new Error("Undefined Ipns publish name...");
}

IpfsLibrary.prototype.resolve = async function(client, cid) {
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["name"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipns name...");
		}				
	}
	if (client != undefined && client.name != undefined && client.name.resolve != undefined) {
		try {
			const result = await client.name.resolve(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing resolve Ipns name...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to resolve Ipns name...");
		}
	}
	throw new Error("Undefined Ipns name resolve...");
}

IpfsLibrary.prototype.id = async function(client) {
	// Window Ipfs policy
	if (client.enable) {
		try {		
			client = await client.enable({commands: ["id"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs id...");
		}
	}
	if (client != undefined && client.id != undefined) {
		try {
			const result = await client.id();
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs id...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs id...");
		}						
	}
	throw new Error("Undefined Ipfs id...");
}

IpfsLibrary.prototype.keys = async function(client) {
	// Window Ipfs policy
	if (client.enable) {
		try {		
			client = await client.enable({commands: ["key"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs key...");
		}
	}
	if (client != undefined && client.key != undefined && client.key.list != undefined) {
		try {
			const result = await client.key.list();
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs key list...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs key list...");
		}
	}
	throw new Error("Undefined Ipfs key list...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
