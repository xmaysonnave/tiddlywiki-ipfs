/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
module-type: library

Ipfs Wrapper

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;

/*
Ipfs Wrapper
*/
var IpfsWrapper = function() {
	this.ipfsLibrary = new IpfsLibrary();
}

IpfsWrapper.prototype.isCID = function(hash) {
	return this.ipfsLibrary.isCID(hash);
}

IpfsWrapper.prototype.getIpfsClient = async function() {
	// Getting an Ipfs client
	try {
		var tmpIpfs;
		var tmpProvider;
		const policy = $tw.utils.getIpfsPolicy();
		if (policy == "webext") {
			var { ipfs, provider } = await this.ipfsLibrary.getWebExtensionIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;
		} else if (policy == "window") {
			var { ipfs, provider } = await this.ipfsLibrary.getWindowIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;			
		} else if (policy == "http") {
			var { ipfs, provider } = await this.ipfsLibrary.getHttpIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;			
		} else  {
		 var { ipfs, provider }  = await this.ipfsLibrary.getDefaultIpfs();		
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
			message: "Failed to get an Ipfs client", 
			ipfs: null, 
			provider: null 
		};
	}
}

IpfsWrapper.prototype.getKeys = async function(ipfs) {
	try {
		var keys = await this.ipfsLibrary.keys(ipfs);
		if (keys == undefined)  {
			return { 
				error: new Error("Failed to get keys from Ipfs"), 
				message: "", 
				keys: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully got keys from Ipfs", 
			keys: keys 
		};
	} catch (error) {
		return { 
			error: error, 
			message: "Failed to get keys from Ipfs", 
			keys: null 
		};
	}
}

IpfsWrapper.prototype.fetch = async function(ipfs, cid) {
	try {
		var fetched = await this.ipfsLibrary.cat(ipfs, "/ipfs/" + cid);
		if (fetched == undefined)  {
			return { 
				error: new Error("Failed to fetch Ipfs: /ipfs/" + cid), 
				message: "", 
				fetched: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully fetched Ipfs: /ipfs/" + cid, 
			fetched: fetched 
		};
	} catch (error) {
		return { 
			error: error, 
			message: "Failed to fetch Ipfs: /ipfs/" + cid, 
			fetched: 
			null 
		};
	}
}

IpfsWrapper.prototype.getEmptyDirectory = async function(ipfs) {
		// Fetch the default empty directory to check if the connection is alive
		try {
			var empty = await this.ipfsLibrary.get(ipfs, "/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn");
			if (empty == undefined)  {
				return { 
					error: new Error("Failed to get the default Ipfs empty directory"), 
					message: "", 
					empty: null 
				};
			}
			return { 
				error: null, 
				message: "Successfully got the default Ipfs empty directory", 
				empty: empty 
			};
		} catch (error) {
			return { 
				error: error, 
				message: "Failed to get the default Ipfs empty directory", 
				empty: null 
			};
		}
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, blob) {
	// Add	
	try {
		var added = await this.ipfsLibrary.add(ipfs, blob);
		if (added == undefined || added[0] == undefined || added[0].hash == undefined) {
			return { 
				error: new Error("Failed to add blob to Ipfs"), 
				message: "", 
				added: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully added to Ipfs: /ipfs/" + added[0].hash, 
			added: added 
		};
	} catch (error) {
		return { 
			error: error, 
			message: "Failed to add blob to Ipfs", 
			added: null 
		};
	};
}

IpfsWrapper.prototype.resolveFromIpfs = async function(ipfs, cid) {
	// Resolve
	try {	
		var resolved = await this.ipfsLibrary.resolve(ipfs, "/ipns/" + cid);
		if (resolved == undefined) {
			return { 
				error: new Error("Failed to resolve from Ipfs: /ipns/" + cid), 
				message: "", 
				resolved: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully resolved from Ipfs: /ipns/" + cid, 
			resolved: resolved 
		};
	} catch (error) {
		return { 
			error: new Error("Failed to resolve from Ipfs: /ipns/" + cid), 
			message: "", 
			resolved: null 
		};
	};	
}

IpfsWrapper.prototype.publishToIpfs = async function(ipfs, name, cid) {
	// Publish
	try {	
		var published = await this.ipfsLibrary.publish(ipfs, name, "/ipfs/" + cid);
		if (published == undefined) {
			return { 
				error: new Error("Failed to publish to Ipfs: /ipfs/" + cid), 
				message: "", 
				published: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully published to Ipfs: /ipfs/" + cid, 
			published: published 
		};
	} catch (error) {
		return { 
			error: new Error("Failed to publish to Ipfs: /ipfs/" + cid), 
			message: "", 
			published: null 
		};
	};	
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
	// Unpin
	try {	
		var pined = await this.ipfsLibrary.pin(ipfs, "/ipfs/" + cid);
		if (pined == undefined) {
			return { 
				error: new Error("Failed to pin to Ipfs: /ipfs/" + cid), 
				message: "", 
				unpined: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully pined to Ipfs: /ipfs/" + cid, 
			unpined: pined 
		};
	} catch (error) {
		return { 
			error: new Error("Failed to pin to Ipfs: /ipfs/" + cid), 
			message: "", 
			unpined: null 
		};
	};	
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
	// Unpin
	try {	
		var unpined = await this.ipfsLibrary.unpin(ipfs, "/ipfs/" + cid);
		if (unpined == undefined) {
			return { 
				error: new Error("Failed to unpin from Ipfs: /ipfs/" + cid), 
				message: "", 
				unpined: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully unpined from Ipfs: /ipfs/" + cid, 
			unpined: unpined 
		};
	} catch (error) {
		return { 
			error: new Error("Failed to unpin from Ipfs: /ipfs/" + cid), 
			message: "", 
			unpined: null 
		};
	};	
}

exports.IpfsWrapper = IpfsWrapper;

})();
