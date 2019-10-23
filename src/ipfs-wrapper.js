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

IpfsWrapper.prototype.fetchEnsDomainResolver = async function(domain) {
	try {
		var resolver = await this.ipfsLibrary.fetchEnsDomainResolver(domain);
		if (resolver == undefined)  {
			var message = "Failed to fetch Ens Domain Resolver: " + domain;
			return { 
				error: new Error(message), 
				message: message, 
				resolver: null
			};
		}
		return { 
			error: null, 
			message: "Successfully fetched Ens Domain Resolver from: " + domain + ", " + resolver,
			resolver: resolver
		};
	} catch (error) {
		return { 
			error: error, 
			message: error.message, 
			resolver: null
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
		var message = "Failed to get an Ipfs client...";
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
			message: error.message, 
			ipfs: null, 
			provider: null 
		};
	}
}

IpfsWrapper.prototype.getKeys = async function(ipfs) {
	try {
		var keys = await this.ipfsLibrary.keys(ipfs);
		if (keys == undefined)  {
			var message = "Failed to get keys from Ipfs";
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
			message: error.message, 
			keys: null 
		};
	}
}

IpfsWrapper.prototype.fetch = async function(ipfs, cid) {
	try {
		var fetched = await this.ipfsLibrary.cat(ipfs, "/ipfs/" + cid);
		if (fetched == undefined)  {
			var message = "Failed to fetch content from Ipfs: /ipfs/" + cid;			
			return { 
				error: new Error(message), 
				message: message, 
				fetched: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully fetched content from Ipfs: /ipfs/" + cid, 
			fetched: fetched 
		};
	} catch (error) {
		return { 
			error: error, 
			message: error.message, 
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
				var message = "Failed to get the default Ipfs empty directory...";				
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
				message: error.message, 
				empty: null 
			};
		}
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, blob) {
	// Add	
	try {
		var added = await this.ipfsLibrary.add(ipfs, blob);
		if (added == undefined || added[0] == undefined || added[0].hash == undefined) {
			var message = "Failed to add content to Ipfs...";			
			return { 
				error: new Error(message), 
				message: message, 
				added: null 
			};
		}
		return { 
			error: null, 
			message: "Successfully added content to Ipfs: /ipfs/" + added[0].hash, 
			added: added 
		};
	} catch (error) {
		return { 
			error: error, 
			message: error.message, 
			added: null 
		};
	};
}

IpfsWrapper.prototype.resolveFromIpfs = async function(ipfs, cid) {
	// Resolve
	try {	
		var resolved = await this.ipfsLibrary.resolve(ipfs, "/ipns/" + cid);
		var message = "Failed to resolve from Ipfs: /ipns/" + cid;		
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
			message: error.message, 
			resolved: null 
		};
	};	
}

IpfsWrapper.prototype.publishToIpfs = async function(ipfs, name, cid) {
	// Publish
	try {	
		var published = await this.ipfsLibrary.publish(ipfs, name, "/ipfs/" + cid);
		if (published == undefined) {
			var message = "Failed to publish to Ipfs: /ipfs/" + cid;			
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
			message: error.message, 
			published: null 
		};
	};	
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
	// Unpin
	try {	
		var pined = await this.ipfsLibrary.pin(ipfs, "/ipfs/" + cid);
		if (pined == undefined) {
			var message = "Failed to pin to Ipfs: /ipfs/" + cid;			
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
			message: error.message, 
			unpined: null 
		};
	};	
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
	// Unpin
	try {	
		var unpined = await this.ipfsLibrary.unpin(ipfs, "/ipfs/" + cid);
		if (unpined == undefined) {
			var message = "Failed to unpin from Ipfs: /ipfs/" + cid;			
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
			message: error.message, 
			unpined: null 
		};
	};	
}

exports.IpfsWrapper = IpfsWrapper;

})();
