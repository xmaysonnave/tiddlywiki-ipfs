/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
module-type: library

IpfsWrapper

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;
const ipfsKeyword = "/ipfs/";
const ipnsKeyword = "/ipns/";

/*
Ipfs Wrapper
*/
var IpfsWrapper = function() {
	this.ipfsLibrary = new IpfsLibrary();
}

IpfsWrapper.prototype.getIpfsClient = async function() {
	// Getting an Ipfs client
	try {
		var ipfs = null;
		var provider = null;
		const policy = $tw.utils.getIpfsPolicy();
 		if (policy === "window") {
			var { ipfs, provider } = await this.ipfsLibrary.getWindowIpfs();
		} else if (policy === "http") {
			var { ipfs, provider } = await this.ipfsLibrary.getHttpIpfs();
		} else  {
			var { ipfs, provider }  = await this.ipfsLibrary.getDefaultIpfs();
		}
		// Return if undefined
		if (ipfs == undefined || ipfs == null || provider == undefined || provider == null)  {
			return {
				error: new Error("Failed to get an Ipfs provider..."),
				ipfs: null,
				provider: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Ipfs provider: " + provider);
		return {
			error: null,
			ipfs: ipfs,
			provider: provider
		};
	} catch (error) {
		return {
			error: error,
			ipfs: null,
			provider: null
		};
	}
}

IpfsWrapper.prototype.getKeys = async function(ipfs) {
	try {
		const keys = await this.ipfsLibrary.keys(ipfs);
		if (keys == undefined)  {
			return {
				error: new Error("Failed to fetch Ipfs keys..."),
				keys: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully fetched Ipfs keys...");
		return {
			error: null,
			keys: keys
		};
	} catch (error) {
		return {
			error: error,
			keys: null
		};
	}
}

IpfsWrapper.prototype.fetchFromIpfs = async function(ipfs, cid) {
	try {
		const fetched = await this.ipfsLibrary.cat(ipfs, ipfsKeyword + cid);
		if (fetched == undefined)  {
			return {
				error: new Error("Failed to fetch: " + ipfsKeyword + cid),
				fetched: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully fetched: " + ipfsKeyword + cid);
		return {
			error: null,
			fetched: fetched
		};
	} catch (error) {
		return {
			error: error,
			fetched: null
		};
	}
}

IpfsWrapper.prototype.getEmptyDirectory = async function(ipfs) {
		try {
			// Fetch the default empty directory to check if the connection is alive
			const empty = await this.ipfsLibrary.get(ipfs, ipfsKeyword + "QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn");
			if (empty == undefined)  {
				return {
					error: new Error("Failed to fetch the Ipfs empty directory..."),
					empty: null
				};
			}
			if ($tw.utils.getIpfsVerbose()) console.log("Successfully fetched the Ipfs empty directory...");
			return {
				error: null,
				empty: empty
			};
		} catch (error) {
			return {
				error: error,
				empty: null
			};
		}
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, content) {
	// Add
	try {
		const added = await this.ipfsLibrary.add(ipfs, content);
		if (added == undefined || added == null || Array.isArray(added) == false || added.length == 0) {
			return {
				error: new Error("Failed to add content..."),
				added: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully added content: " + ipfsKeyword + added[0].hash);
		return {
			error: null,
			added: added[0].hash
		};
	} catch (error) {
		return {
			error: error,
			added: null
		};
	};
}

IpfsWrapper.prototype.addFromStreamToIpfs = async function(ipfs, content) {
	// Add
	try {
		const added = await this.ipfsLibrary.addFromStream(ipfs, content);
		if (added == undefined || added == null || Array.isArray(added) == false || added.length == 0) {
			return {
				error: new Error("Failed to add stream content..."),
				added: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully added stream content: " + ipfsKeyword + added[0].hash);
		return {
			error: null,
			added: added[0].hash
		};
	} catch (error) {
		return {
			error: error,
			added: null
		};
	};
}

IpfsWrapper.prototype.resolveFromIpfs = async function(ipfs, cid) {
	// Resolve
	try {
		const resolved = await this.ipfsLibrary.resolve(ipfs, ipnsKeyword + cid);
		if (resolved == undefined) {
			return {
				error: null,
				resolved: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully resolved: " + ipnsKeyword + cid);
		return {
			error: null,
			resolved: resolved
		};
	} catch (error) {
		return {
			error: error,
			resolved: null
		};
	};
}

IpfsWrapper.prototype.publishToIpfs = async function(ipfs, name, cid) {
	// Publish
	try {
		const published = await this.ipfsLibrary.publish(ipfs, name, ipfsKeyword + cid);
		if (published == undefined) {
			return {
				error: new Error("Failed to publish: " + ipfsKeyword + cid),
				published: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully published: " + ipfsKeyword + cid);
		return {
			error: null,
			published: published
		};
	} catch (error) {
		return {
			error: error,
			published: null
		};
	};
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
	// Unpin
	try {
		const pined = await this.ipfsLibrary.pin(ipfs, ipfsKeyword + cid);
		if (pined == undefined) {
			return {
				error: new Error( "Failed to pin: " + ipfsKeyword + cid),
				pined: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully pined: " + ipfsKeyword + cid);
		return {
			error: null,
			pined: pined
		};
	} catch (error) {
		return {
			error: error,
			pined: null
		};
	};
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
	// Unpin
	try {
		const unpined = await this.ipfsLibrary.unpin(ipfs, ipfsKeyword + cid);
		if (unpined == undefined) {
			return {
				error: new Error("Failed to unpin: " + ipfsKeyword + cid),
				unpined: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully unpined: " + ipfsKeyword + cid);
		return {
			error: null,
			unpined: unpined
		};
	} catch (error) {
		return {
			error: error,
			unpined: null
		};
	};
}

exports.IpfsWrapper = IpfsWrapper;

})();
