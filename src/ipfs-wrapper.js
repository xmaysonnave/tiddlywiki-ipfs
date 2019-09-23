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

IpfsWrapper.prototype.resolveEnsDomain = async function(domain) {
	var message = "Failed to resolve Ens Domain: " + domain;
	try {
		var address = await this.ipfsLibrary.resolveEnsDomain(domain);
		if (address == undefined)  {
			return { 
				error: new Error(message), 
				message: message, 
				address: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully resolved Ens Domain: " + domain, 
			address: address 
		};
	} catch (error) {
		return { 
			error: error, 
			message: message, 
			address: null 
		};
	}
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
		var message = "Failed to get an Ipfs client";
		// Return if undefined
		if (tmpIpfs == undefined)  {
			return { 
				error: new Error(message), 
				message: message, 
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
			message: message, 
			ipfs: null, 
			provider: null 
		};
	}
}

IpfsWrapper.prototype.getKeys = async function(ipfs) {
	var message = "Failed to get keys from Ipfs";
	try {
		var keys = await this.ipfsLibrary.keys(ipfs);
		if (keys == undefined)  {
			return { 
				error: new Error(message), 
				message: message, 
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
			message: message, 
			keys: null 
		};
	}
}

IpfsWrapper.prototype.fetch = async function(ipfs, cid) {
	var message = "Failed to fetch Ipfs: /ipfs/" + cid;
	try {
		var fetched = await this.ipfsLibrary.cat(ipfs, "/ipfs/" + cid);
		if (fetched == undefined)  {
			return { 
				error: new Error(message), 
				message: message, 
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
			message: message, 
			fetched: 
			null 
		};
	}
}

IpfsWrapper.prototype.getEmptyDirectory = async function(ipfs) {
		// Fetch the default empty directory to check if the connection is alive
		var message = "Failed to get the default Ipfs empty directory";
		try {
			var empty = await this.ipfsLibrary.get(ipfs, "/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn");
			if (empty == undefined)  {
				return { 
					error: new Error(message), 
					message: message, 
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
				message: message, 
				empty: null 
			};
		}
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, blob) {
	// Add	
	var message = "Failed to add blob to Ipfs";
	try {
		var added = await this.ipfsLibrary.add(ipfs, blob);
		if (added == undefined || added[0] == undefined || added[0].hash == undefined) {
			return { 
				error: new Error(message), 
				message: message, 
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
			message: message, 
			added: null 
		};
	};
}

IpfsWrapper.prototype.resolveFromIpfs = async function(ipfs, cid) {
	// Resolve
	var message = "Failed to resolve from Ipfs: /ipns/" + cid;
	try {	
		var resolved = await this.ipfsLibrary.resolve(ipfs, "/ipns/" + cid);
		if (resolved == undefined) {
			return { 
				error: new Error(message), 
				message: message, 
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
			error: error, 
			message: message, 
			resolved: null 
		};
	};	
}

IpfsWrapper.prototype.publishToIpfs = async function(ipfs, name, cid) {
	// Publish
	var message = "Failed to publish to Ipfs: /ipfs/" + cid;
	try {	
		var published = await this.ipfsLibrary.publish(ipfs, name, "/ipfs/" + cid);
		if (published == undefined) {
			return { 
				error: new Error(message), 
				message: message, 
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
			error: error, 
			message: message, 
			published: null 
		};
	};	
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
	// Unpin
	var message = "Failed to pin to Ipfs: /ipfs/" + cid;
	try {	
		var pined = await this.ipfsLibrary.pin(ipfs, "/ipfs/" + cid);
		if (pined == undefined) {
			return { 
				error: new Error(message), 
				message: message, 
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
			error: error, 
			message: message, 
			unpined: null 
		};
	};	
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
	// Unpin
	var message = "Failed to unpin from Ipfs: /ipfs/" + cid;
	try {	
		var unpined = await this.ipfsLibrary.unpin(ipfs, "/ipfs/" + cid);
		if (unpined == undefined) {
			return { 
				error: new Error(message), 
				message: message, 
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
			error: error, 
			message: message, 
			unpined: null 
		};
	};	
}

exports.IpfsWrapper = IpfsWrapper;

})();
