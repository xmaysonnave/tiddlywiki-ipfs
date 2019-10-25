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

var IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;

/*
Ipfs Wrapper
*/
var IpfsWrapper = function() {
	this.ipfsLibrary = new IpfsLibrary();
}

IpfsWrapper.prototype.getContentHash = async function(domain) {
	try {
		var content = await this.ipfsLibrary.getContentHash(domain);
		if (content == undefined)  {
			return { 
				error: new Error("Failed to fetch Ens domain Ipfs Url: " + domain),
				content: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully fetched Ens domain Ipfs Url: " + content);	
		return { 
			error: null, 
			content: content
		};
	} catch (error) {
		return { 
			error: error, 
			content: null
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
		// Return if undefined
		if (tmpIpfs == undefined)  {
			return { 
				error: new Error("Failed to get an Ipfs provider..."), 
				ipfs: null, 
				provider: null 
			};
		}		
		if ($tw.utils.getIpfsVerbose()) console.log("Ipfs provider: " + provider);		
		return { 
			error: null, 
			ipfs: tmpIpfs, 
			provider: tmpProvider 
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
		var keys = await this.ipfsLibrary.keys(ipfs);
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

IpfsWrapper.prototype.fetch = async function(ipfs, cid) {
	try {
		var fetched = await this.ipfsLibrary.cat(ipfs, "/ipfs/" + cid);
		if (fetched == undefined)  {			
			return { 
				error: new Error("Failed to fetch: /ipfs/" + cid), 
				fetched: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully fetched: /ipfs/" + cid);
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
		// Fetch the default empty directory to check if the connection is alive
		try {
			var empty = await this.ipfsLibrary.get(ipfs, "/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn");
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

IpfsWrapper.prototype.addToIpfs = async function(ipfs, blob) {
	// Add	
	try {
		var added = await this.ipfsLibrary.add(ipfs, blob);
		if (added == undefined || added[0] == undefined || added[0].hash == undefined) {
			return { 
				error: new Error("Failed to add content..."), 
				added: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully added content: /ipfs/" + added[0].hash);
		return { 
			error: null, 
			added: added 
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
		var resolved = await this.ipfsLibrary.resolve(ipfs, "/ipns/" + cid);
		if (resolved == undefined) {
			return { 
				error: new Error("Failed to resolve: /ipns/" + cid), 
				resolved: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully resolved: /ipns/" + cid);
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
		var published = await this.ipfsLibrary.publish(ipfs, name, "/ipfs/" + cid);
		if (published == undefined) {
			return { 
				error: new Error("Failed to publish: /ipfs/" + cid), 
				published: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully published: /ipfs/" + cid);
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
		var pined = await this.ipfsLibrary.pin(ipfs, "/ipfs/" + cid);
		if (pined == undefined) {
			return { 
				error: new Error( "Failed to pin: /ipfs/" + cid), 
				unpined: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully pined: /ipfs/" + cid);
		return { 
			error: null, 
			unpined: pined 
		};
	} catch (error) {
		return { 
			error: error, 
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
				error: new Error("Failed to unpin: /ipfs/" + cid), 
				unpined: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully unpined: /ipfs/" + cid);
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
