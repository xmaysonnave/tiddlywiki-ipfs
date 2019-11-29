/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
module-type: library

IpfsLibrary

\*/

import CID  from "cids";
import getIpfs from "ipfs-provider";
import toMultiaddr from "uri-to-multiaddr";
import url from "url";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ipfs Library
*/
var IpfsLibrary = function() {};

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsLibrary.prototype.loadIpfsHttpLibrary = async function() {
	if (typeof window.IpfsHttpClient === "undefined") {
		await $tw.utils.loadLibrary(
			"IpfsHttpLibrary",
			"https://cdn.jsdelivr.net/npm/ipfs-http-client@40.0.1/dist/index.min.js",
			"sha384-JJYq4ZQ4gjU7V/7ZpIIAvtdYo5wfR0GH5yC4jPRKmmaB287Dc6FR7GEkCInvH38y",
			true
		);
	}
}

IpfsLibrary.prototype.parseUrl = function(urlToBeParsed) {
	// Check
	if (urlToBeParsed == undefined || urlToBeParsed == null || urlToBeParsed.trim() === "") {
		throw new Error("Undefined Url...");
	}
	const urlData = url.parse(urlToBeParsed);
	return {
			href: urlData.href,
			protocol: urlData.protocol,
			host: urlData.host,
			auth: urlData.auth,
			hostname: urlData.hostname,
			port: urlData.port,
			pathname: urlData.pathname,
			search: urlData.search,
			fragment: urlData.hash
	};
}

IpfsLibrary.prototype.decodePathname = function(pathname) {
	// Check
	if (pathname == undefined || pathname == null || pathname.trim() === "" || pathname.trim() === "/") {
		return {
			protocol: null,
			cid: null
		};
	}
	// Parse
	const members = pathname.split("/");
	var protocol = null;
	var cid = null;
	for (var i = 0; i < members.length; i++) {
		// Ignore
		if (members[i].trim() === "") {
			continue;
		}
		// First non empty member
		if (protocol == null) {
			protocol = members[i];
			continue;
		}
		// Second non empty member
		if (cid == null) {
			cid = members[i];
			break;
		}
		// Nothing to process
		break;
	}
	// Check
	if (protocol == null || cid == null) {
		return {
			protocol: null,
			cid: null
		};
	}
	// Check protocol
	if (protocol !== "ipfs" && protocol !== "ipns") {
		return {
			protocol: null,
			cid: null
		};
	}
	// Check
	if (this.isCid(cid) == false) {
		return {
			protocol: protocol,
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
		const newCid = new CID(cid);
		return CID.isCID(newCid);
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
	var multi;
	try {
		 multi = toMultiaddr(apiUrl);
	} catch (error) {
		console.error(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
	}
	// Load IpfsHttpClient
	await this.loadIpfsHttpLibrary();
	// Getting
	try {
		const { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,
			tryWindow: true,
			permissions: {},
			tryApi: true,
			apiAddress: multi,
			IpfsApi: window.IpfsHttpClient,
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		return {
			ipfs: ipfs,
			provider: provider + ", " + multi
		};
	} catch (error) {
		console.error(error.message);
		throw new Error("Unable to connect. Check Ipfs Companion and your Api Url...");
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
			apiAddress: null,
			IpfsApi: null,
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		return {
			ipfs: ipfs,
			provider: provider
		};
	} catch (error) {
		console.error(error.message);
		throw new Error("Unable to connect. Check Ipfs Companion...");
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
		console.error(error.message);
		throw new Error("Invalid Ipfs Api Url: " + apiUrl);
	}
	// Load IpfsHttpClient
	await this.loadIpfsHttpLibrary();
	// Getting
	try {
		const { ipfs, provider } = await getIpfs({
			// These is the defaults
			tryWebExt: false,
			tryWindow: false,
			permissions: {},
			tryApi: true,
			apiAddress: multi,
			IpfsApi: window.IpfsHttpClient,
			tryJsIpfs: false,
			getJsIpfs: null,
			jsIpfsOpts: {}
		});
		return {
			ipfs: ipfs,
			provider: provider + ", " + multi
		};
	} catch (error) {
		console.error(error.message);
		throw new Error("Unable to connect. Check your Api Url...");
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
		client = await client.enable({commands: ["add"]});
	}
	// Process
	if (client !== undefined && client.add !== undefined) {
		// Process
		const buffer = Buffer.from(content);
		if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs add...");
		// https://github.com/ipfs/go-ipfs/issues/5683
		// chunker: "size-262144"
		// chunker: "rabin-262144-524288-1048576"
		const result = await client.add(buffer, {
			chunker: "rabin-262144-524288-1048576",
			pin: false
		});
		return result;
	}
	throw new Error("Undefined Ipfs command add...");
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
		client = await client.enable({commands: ["get"]});
	}
	// Process
	if (client !== undefined && client.get !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs get...");
		const result = await client.get(cid);
		return result;
	}
	throw new Error("Undefined Ipfs command get...");
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
		client = await client.enable({commands: ["cat"]});
	}
	// Process
	if (client !== undefined && client.cat !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs cat...");
		const result = await client.cat(cid);
		return result;
	}
	throw new Error("Undefined Ipfs command cat...");
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
		client = await client.enable({commands: ["pin"]});
	}
	// Process
	if (client !== undefined && client.pin !== undefined && client.pin.add !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs pin...");
		const result = await client.pin.add(cid);
		return result;
	}
	throw new Error("Undefined Ipfs command pin...");
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
		client = await client.enable({commands: ["pin"]});
	}
	// Process
	if (client !== undefined && client.pin !== undefined && client.pin.rm !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipfs unpin...");
		const result = await client.pin.rm(cid);
		return result;
	}
	throw new Error("Undefined Ipfs command unpin");
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
		client = await client.enable({commands: ["name"]});
	}
	if (client !== undefined && client.name !== undefined && client.name.publish !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing publish Ipns name...");
		const result = await client.name.publish(cid, { key: name });
		return result;
	}
	throw new Error("Undefined Ipfs command publish name...");
}

IpfsLibrary.prototype.resolve = async function(client, cid) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipns key...");
	}
	// Window Ipfs policy
	if (client.enable) {
		client = await client.enable({commands: ["name"]});
	}
	if (client !== undefined && client.name !== undefined && client.name.resolve !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing resolve Ipns key...");
		const result = await client.name.resolve(cid, {
			recursive: true
		});
		return result;
	}
	throw new Error("Undefined Ipfs command name resolve...");
}

IpfsLibrary.prototype.keys = async function(client) {
	if (client == undefined) {
		throw new Error("Undefined Ipfs provider...");
	}
	// Window Ipfs policy
	if (client.enable) {
		client = await client.enable({commands: ["key"]});
	}
	if (client !== undefined && client.key !== undefined && client.key.list !== undefined) {
		if ($tw.utils.getIpfsVerbose()) console.info("Processing Ipns keys...");
		const result = await client.key.list();
		return result;
	}
	throw new Error("Undefined Ipfs command keys...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
