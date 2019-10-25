/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

IpfsLibrary

\*/

const Buffer = require("buffer/").Buffer;
const CID = require("cids");
const toMultiaddr = require("uri-to-multiaddr");
const getIpfs = require("ipfs-provider");
const supportedCodecs = ["ipfs-ns", "swarm-ns", "onion", "onion3"];

import contentHash from "content-hash";
import { ethers, Contract, utils } from "ethers";
import { abi as ensAbi, bytecode as ensBytecode }  from "@ensdomains/resolver/build/contracts/ENS.json";
import { abi as publicResolverAbi, bytecode as publicResolverBytecode } from "@ensdomains/resolver/build/contracts/PublicResolver.json";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {}

// https://github.com/ensdomains/ui/blob/master/src/utils/contents.js


IpfsLibrary.prototype.decodeContenthash = function(encoded) {
	let decoded;
  if (encoded.error != undefined) {
		throw new Error(encoded.error);
  }
  if (encoded != undefined) {
		decoded = contentHash.decode(encoded);
		const codec = contentHash.getCodec(encoded);
		if (codec !== "ipfs-ns") {
			throw new Error("Unsupported Ens domain protocol: " + codec);
		}
  }
  return decoded; 
}

IpfsLibrary.prototype.validateContent = function(encoded){
  return contentHash.isHashOfType(encoded, contentHash.Types.ipfs) || contentHash.isHashOfType(encoded, contentHash.Types.swarm)
}

IpfsLibrary.prototype.isValidContenthash = function(encoded) {
	const codec = contentHash.getCodec(encoded)
	return utils.isHexString(encoded) && supportedCodecs.includes(codec)
}

IpfsLibrary.prototype.encodeContenthash = function(text) {
  let content, contentType;
  let encoded = false;
  if (!!text) {
    let matched = text.match(/^(ipfs|bzz|onion|onion3):\/\/(.*)/) || text.match(/\/(ipfs)\/(.*)/);
    if (matched) {
      contentType = matched[1];
      content = matched[2];
    }
		if (contentType === "ipfs") {
			if (content.length >= 4) {
				encoded = "0x" + contentHash.fromIpfs(content);
			}
		} else {
			throw new Error("Unsupported Ens domain protocol: " + contentType);
		}
  }
  return encoded; 
}

IpfsLibrary.prototype.enableMetamask = async function() {
	// Check if Metamask is available	
	if (window.ethereum == undefined) {
		throw new Error("Non-ENS browser detected. You should consider installing MetaMask...");
	}
	// Enable Metamask
	let accounts;
	try {
		accounts = await window.ethereum.enable();
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to enable Metamask...");
	}
	// Mainnet
	if (window.ethereum.networkVersion !== "1") {
		throw new Error("The network should be Ethereum Main...");
	}
	// Instantiate web3
	if (this.web3 == undefined) {
		this.web3 = new ethers.providers.Web3Provider(window.ethereum);
	}				
	if ($tw.utils.getIpfsVerbose()) console.log("Current Ethereum account: " + accounts[0]);
	// Return current owner
	return accounts[0];
}

IpfsLibrary.prototype.getContentHash = async function(domain) {
	// Enable Metmask
	await this.enableMetamask();
	// Retrieve Signer
	const signer = this.web3.getSigner();	
	// Load Ens
	let ens;
	try {
		// https://github.com/ensdomains/ui/blob/master/src/ens.js
		// Mainnet ENS Registry
		ens = new Contract("0x314159265dd8dbb310642f98f50c066173c1259b", ensAbi, signer);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to fetch Ens registry...");		
	}
	// Fetch Resolver
	let resolver;
	try {
		resolver = await ens.resolver(utils.namehash(domain));
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain resolver...");
	}		
	// Exist
	if (resolver == undefined || /^0x0+$/.test(resolver) == true) {
		throw new Error("Unknown Ens domain...");
	}
	// Only Mainnet PublicResolver is supported
	if (utils.getAddress("0xd3ddccdd3b25a8a7423b5bee360a42146eb4baf3") != utils.getAddress(resolver)) {
		throw new Error("Unsupported Ens resolver: " + resolver);
	}	
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver: " + resolver);	
	// Load Content
	let content;
	try {
		// Mainnet PublicResolver address
		const publicResolver = new Contract("0xd3ddccdd3b25a8a7423b5bee360a42146eb4baf3", publicResolverAbi, signer);
		content = await publicResolver.contenthash(utils.namehash(domain));
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to fetch Ens domain content...");		
	}
	return this.decodeContenthash(content);	
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {	
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() == "") {
		throw new Error("Undefined Ipfs Api Url...");
	}	
	let multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.log(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
	}
	// Getting
	try {
		let { ipfs, provider } = await getIpfs({
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
	let multi;
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
					if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs add...");					
					const result = await client.add(buffer, { progress: function(len) {
							if ($tw.utils.getIpfsVerbose()) console.log("Ipfs upload progress:", len);  	
						}
					});
					if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs add...");
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
			reject("Unable to process content...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs get...");
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
		if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs cat...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs pin...");			
			const result = await client.pin.add(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs pin...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs unpin...");						
			const result = await client.pin.rm(cid);
			if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs unpin...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing publish Ipns name: " + name);			
			const result = await client.name.publish(cid, { key: name });
			if ($tw.utils.getIpfsVerbose()) console.log("Processed publish Ipns name...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processed resolve Ipns name...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs id...");
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs keys...");
			return result;
		} catch (error) {
			throw new Error("Unable to process Ipfs keys...");
		}
	}
	throw new Error("Undefined Ipfs keys...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
