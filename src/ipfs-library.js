/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

IpfsLibrary

\*/

import toMultiaddr from "uri-to-multiaddr";
import getIpfs from"ipfs-provider";
import CID from "cids";
import contentHash from "content-hash";
import { ethers, Contract, utils } from "ethers";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {
	// https://github.com/ensdomains/ui/blob/master/src/ens.js
	this.contracts = {
		1: {
			registry: "0x314159265dd8dbb310642f98f50c066173c1259b",
			name: "Mainnet : Ethereum main network"
		},
		3: {
			registry: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
			name: "Ropsten : Ethereum test network (PoW)"
		},
		4: {
			registry: "0xe7410170f87102df0055eb195163a03b7f2bff4a",
			name: "Rinkeby : Ethereum test network (PoA)"
		},
		5: {
			registry: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
			name: "Goerli : Ethereum test network (PoA)"		
		}
	};
};

IpfsLibrary.prototype.decodePathname = function(pathname) {
	// Check
	if (pathname == undefined || pathname == null || pathname.trim() === "") {
		return {
			protocol: null,
			cid: null
		};
	}		
	// Check
	if (pathname.startsWith("/ipfs/") == false && pathname.startsWith("/ipns/") == false) {
		return {
			protocol: null,
			cid: null
		};
	}
	// Extract
	var cid = null;
	var protocol = null;
	try  {
		protocol = pathname.substring(1, 5);	
		cid = pathname.substring(6);
	} catch (error) {
		return {
			protocol: null,
			cid: null
		};
	}
	// Check
	if (this.isCid(cid) == false) {
		return {
			protocol: null,
			cid: null
		};
	}
	// All good
	return {
		protocol: protocol,
		cid: cid
	}
}

IpfsLibrary.prototype.isCid = function(cid) {
	try {
		return CID.isCID(new CID(cid));
	} catch (error) {
		return false;
	}
}

// https://github.com/ensdomains/ui/blob/master/src/utils/contents.js
IpfsLibrary.prototype.decodeContenthash = function(encoded) {
	let decoded, protocol;
  if (encoded.error) {
		throw new Error(encoded.error);
  }
  if (encoded) {
		decoded = contentHash.decode(encoded);
		const codec = contentHash.getCodec(encoded);
		if (codec === "ipfs-ns") {
			protocol = "ipfs";
		} else if (codec === "swarm-ns") {
			protocol = "bzz";
		} else if (codec === "onion") {
			protocol = "onion";
		} else if (codec === "onion3") {
			protocol = "onion3";		
		}
  }
  return {
		decoded: decoded,
		protocol: protocol
	}; 
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
	// Return current owner
	return accounts[0];
}

IpfsLibrary.prototype.getWeb3 = async function() {
	// EnableMetamask
	await this.enableMetamask();
	// web3
	if (this.web3 == undefined) {
		this.web3 = new ethers.providers.Web3Provider(window.ethereum);
	}			
	return this.web3;
}

IpfsLibrary.prototype.getEns = async function() {
	// Retrieve Signer
	const web3 = await this.getWeb3();
	const network = await web3.getNetwork();	
	const networkId = network.chainId;
	const signer = web3.getSigner();
	// Ethereum Ens Registry
	var ensNetwork;
	try {
		ensNetwork = this.contracts[networkId];
	} catch (error) {
		console.log(error.message);		
		throw new Error("Unsupported Ethereum network...");		
	}
	if ($tw.utils.getIpfsVerbose()) console.log(ensNetwork.name);
	// Load Ens contract
	if (this.ens == undefined) {
		try {
			// https://github.com/ensdomains/ui/blob/master/src/ens.js
			const ens = JSON.parse($tw.wiki.getTiddler("$:/ipfs/saver/contract/ens").fields.text);
			this.ens = new Contract(ensNetwork.registry, ens.abi, signer);
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to fetch Ens registry...");		
		}
	}
	return this.ens;
}

IpfsLibrary.prototype.getResolver = async function(resolverAddress) {
	if (resolverAddress == undefined || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	// Retrieve Signer
	const web3 = await this.getWeb3();			
	const signer = web3.getSigner();
	// Load Resolver contract
	if (this.resolver == undefined) {
		try {
			// Mainnet Resolver address
			const resolver = JSON.parse($tw.wiki.getTiddler("$:/ipfs/saver/contract/resolver").fields.text);
			this.resolver = new Contract(resolverAddress, resolver.abi, signer);
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to fetch Ens resolver...");
		}		
	}
	return this.resolver;
}

IpfsLibrary.prototype.getContenthash = async function(domain) {
	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}
	// Fetch Resolver
	const namehash = utils.namehash(domain);
	let resolver;
	try {
		const ens = await this.getEns();
		resolver = await ens.resolver(namehash);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain resolver...");
	}		
	// Check
	if (resolver == undefined || /^0x0+$/.test(resolver) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver: " + resolver);	
	// Load Contenthash
	let content;
	try {
		resolver = await this.getResolver(resolver);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Ens get content hash...");
		content = await resolver.contenthash(namehash);
		if ($tw.utils.getIpfsVerbose()) console.log("Processed Ens get content hash...");
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to fetch Ens domain content hash...");		
	}
	return this.decodeContenthash(content);	
}

IpfsLibrary.prototype.setContenthash = async function(domain, cid) {
	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}			
	// Fetch Resolver
	const namehash = utils.namehash(domain);
	const encoded = this.encodeContenthash("ipfs://" + cid);
	let resolver;
	try {
		const ens = await this.getEns();
		resolver = await ens.resolver(namehash);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain resolver...");
	}		
	// Exist
	if (resolver == undefined || /^0x0+$/.test(resolver) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver: " + resolver);
	// Set Contenthash
	try {
		resolver = await this.getResolver(resolver);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Ens set content hash...");
		var tx = await resolver.setContenthash(namehash, encoded);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Transaction: " + tx.hash);
		// Wait for transaction completion
		await tx.wait();
		if ($tw.utils.getIpfsVerbose()) console.log("Processed Ens set content hash...");		
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to set Ens domain content hash...");		
	}
	return;	
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

IpfsLibrary.prototype.add = async function(client, content) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (content == undefined) {
		throw new Error("Undefined Ipfs content...");
	}			
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
					if ($tw.utils.getIpfsVerbose()) console.log("Processed buffer...");					
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}			
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs get...");
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}			
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs cat...");			
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}			
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}			
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (name == undefined || name == null || name.trim() === "") {
		throw new Error("Undefined Ipns name...");
	}			
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}		
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing publish Ipns name...");			
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}	
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing resolve Ipns name...");			
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
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}	
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing id...");			
			const result = await client.id();
			if ($tw.utils.getIpfsVerbose()) console.log("Processed id...");
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs id...");
		}						
	}
	throw new Error("Undefined Ipfs id...");
}

IpfsLibrary.prototype.keys = async function(client) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing keys...");			
			const result = await client.key.list();
			if ($tw.utils.getIpfsVerbose()) console.log("Processed keys...");
			return result;
		} catch (error) {
			throw new Error("Unable to process Ipfs keys...");
		}
	}
	throw new Error("Undefined Ipfs keys...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
