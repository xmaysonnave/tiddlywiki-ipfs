/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

IpfsLibrary

\*/

import toMultiaddr from "uri-to-multiaddr";
import getIpfs from"ipfs-provider";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {};

IpfsLibrary.prototype.loadCidLibrary = async function() {
	// https://github.com/ethers-io/ethers.js/
	return await $tw.utils.loadLibrary("cidLibrary", "https://unpkg.com/cids/dist/index.min.js");
}

IpfsLibrary.prototype.decodePathname = async function(pathname) {
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
	if (await this.isCid(cid) == false) {
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

IpfsLibrary.prototype.isCid = async function(cid) {
	try {
		if (window.Cid == undefined) {
			await this.loadCidLibrary();
		}
		return window.Cids.isCID(new window.Cids(cid));
	} catch (error) {
		return false;
	}
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {
	// Multiaddr
	const apiUrl = $tw.utils.getIpfsApiUrl();
	// Check
	if (apiUrl == undefined || apiUrl == null || apiUrl.trim() === "") {
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
					reject(new Error("Unable to enable Ipfs add..."));
				}
			}
			if (client !== undefined && client.add !== undefined) {
				try {
					const content = Buffer.from(reader.result);
					if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs add...");
					const result = await client.add(content, { progress: function(len) {
							if ($tw.utils.getIpfsVerbose()) console.log("Ipfs upload progress:", len);
						}
					});
					if ($tw.utils.getIpfsVerbose()) console.log("Processed Ipfs add...");
					resolve(result);
				} catch (error) {
					console.log(error.message);
					reject(new Error("Unable to Ipfs add..."));
				}
			} else {
				reject(new Error("Undefined Ipfs add..."));
			}
		};
		try {
			// Read
			if ($tw.utils.getIpfsVerbose()) console.log("Processing content...");
			reader.readAsArrayBuffer(content);
		} catch (error) {
			console.log(error.message);
			reject(new Error("Unable to process content..."));
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
	if (client !== undefined && client.get !== undefined) {
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
	if (client !== undefined && client.cat !== undefined) {
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
	if (client !== undefined && client.pin !== undefined && client.pin.add !== undefined) {
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
	if (client !== undefined && client.pin !== undefined && client.pin.rm !== undefined) {
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
	if (client !== undefined && client.name !== undefined && client.name.publish !== undefined) {
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
	if (client !== undefined && client.name !== undefined && client.name.resolve !== undefined) {
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
	if (client !== undefined && client.id !== undefined) {
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
	if (client !== undefined && client.key !== undefined && client.key.list !== undefined) {
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
