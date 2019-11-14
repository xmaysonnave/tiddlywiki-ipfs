/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

IpfsLibrary

\*/

import CID  from "cids";
import getIpfs from"ipfs-provider";
import toMultiaddr from "uri-to-multiaddr";
import Readable from "readable-stream";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {};

// https://www.srihash.org/
IpfsLibrary.prototype.loadIpfsHttpLibrary = async function() {
	// https://github.com/ipfs/js-ipfs-http-client
	await $tw.utils.loadLibrary(
		"IpfsHttpLibrary",
		"https://cdn.jsdelivr.net/npm/ipfs-http-client@39.0.2/dist/index.js",
		"sha384-SbtgpGuHo4HmMg8ZeX2IrF1c4cDnmBTsW84gipxDCzeFhIZaisgrVQbn3WUQsd0e"
	);
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
		return CID.isCID(new CID(cid));
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
	// Load Web3 if applicable
	if (typeof window.IpfsHttpClient === "undefined") {
		await this.loadIpfsHttpLibrary();
	}
	// Getting
	try {
		let { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,
			tryWindow: true,
			permissions: {},
			tryApi: true,
			apiIpfsOpts: {
				apiUrl: this.defaultApiUrl,
				apiAddress: multi,
				IpfsApi: window.IpfsHttpClient
			},
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		// Enhance provider message
		provider = provider + ", " + multi;
		return { ipfs, provider };
	} catch (error) {
		console.log(error.message);
		throw new Error("Ipfs default is unavailable...");
	}
}

// window.enable
IpfsLibrary.prototype.getWindowIpfs = async function() {
	// Getting
	try {
		const { ipfs, provider } = await getIpfs({
			// These is window only
			tryWebExt: false,
			tryWindow: true,
			permissions: {},
			tryApi: false,
			apiIpfsOpts: {},
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
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
	// Load Web3 if applicable
	if (typeof window.IpfsHttpClient === "undefined") {
		await this.loadIpfsHttpLibrary();
	}
	// Getting
	try {
		var { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,
			tryWindow: false,
			permissions: {},
			tryApi: true,
			apiIpfsOpts: {
				apiUrl: this.defaultApiUrl,
				apiAddress: multi,
				IpfsApi: window.IpfsHttpClient
			},
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
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
		throw new Error("Undefined content...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["add"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs add...");
		}
	}
	// Process
	if (client !== undefined && client.add !== undefined) {
		try {
			// Build stream
			const stream = new Readable();
			stream.push(Buffer.from(content));
			stream.push(null);
			// Process
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs add...");
			// https://github.com/ipfs/go-ipfs/issues/5683
			const result = await client.add(stream, { trickle: true, progress: function(len) {
					if ($tw.utils.getIpfsVerbose()) console.log("Ipfs upload progress:", len);
				}
			});
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs add...");
		}
	}
}

IpfsLibrary.prototype.addFromStream = async function(client, content) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (content == undefined) {
		throw new Error("Undefined content...");
	}
	// Window Ipfs policy
	if (client.enable) {
		try {
			client = await client.enable({commands: ["addFromStream"]});
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to enable Ipfs addFromStream...");
		}
	}
	// Process
	if (client !== undefined && client.addFromStream !== undefined) {
		try {
			// Build stream
			const stream = new Readable();
			stream.push(Buffer.from(content));
			stream.push(null);
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipfs addFromStream...");
			// https://github.com/ipfs/go-ipfs/issues/5683
			const result = await client.addFromStream(stream, { trickle: true, progress: function(len) {
					if ($tw.utils.getIpfsVerbose()) console.log("Ipfs upload progress:", len);
				}
			});
			return result;
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to Ipfs addFromStream...");
		}
	}
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
			if ($tw.utils.getIpfsVerbose()) console.log("Processing Ipns keys...");
			const result = await client.key.list();
			return result;
		} catch (error) {
			throw new Error("Unable to process Ipns keys...");
		}
	}
	throw new Error("Undefined Ipfs keys...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
