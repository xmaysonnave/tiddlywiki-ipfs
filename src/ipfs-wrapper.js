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
const EnsLibrary = require("$:/plugins/ipfs/ens-library.js").EnsLibrary;
const ipfsKeyword = "/ipfs/";
const ipnsKeyword = "/ipns/";

/*
Ipfs Wrapper
*/
var IpfsWrapper = function() {
	this.ipfsLibrary = new IpfsLibrary();
	this.ensLibrary = new EnsLibrary();	
}

IpfsWrapper.prototype.getContenthash = async function(domain) {
	try {
		const { decoded, protocol } = await this.ensLibrary.getContenthash(domain);
		if (decoded == undefined)  {
			return { 
				error: new Error("Failed to fetch Ens domain content: " + domain),
				protocol: null,
				content: null
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully fetched Ens domain content, protocol: " + protocol + ", " + decoded);	
		return { 
			error: null, 
			protocol: protocol,
			content: decoded
		};
	} catch (error) {
		return { 
			error: error,
			protocol: null,
			content: null
		};
	}
}

IpfsWrapper.prototype.setContenthash = async function(domain, cid) {
	try {
		await this.ensLibrary.setContenthash(domain, cid);
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully set Ens domain content: " + cid);	
		return { 
			error: null
		};
	} catch (error) {
		return { 
			error: error
		};
	}
}

IpfsWrapper.prototype.getIpfsClient = async function() {
	// Getting an Ipfs client
	try {
		var tmpIpfs;
		var tmpProvider;
		const policy = $tw.utils.getIpfsPolicy();
		if (policy === "webext") {
			const { ipfs, provider } = await this.ipfsLibrary.getWebExtensionIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;
		} else if (policy === "window") {
			const { ipfs, provider } = await this.ipfsLibrary.getWindowIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;			
		} else if (policy === "http") {
			const { ipfs, provider } = await this.ipfsLibrary.getHttpIpfs();
			tmpIpfs = ipfs;
			tmpProvider = provider;			
		} else  {
		 const { ipfs, provider }  = await this.ipfsLibrary.getDefaultIpfs();		
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
		if ($tw.utils.getIpfsVerbose()) console.log("Ipfs provider: " + tmpProvider);		
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

IpfsWrapper.prototype.fetch = async function(ipfs, cid) {
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
		// Fetch the default empty directory to check if the connection is alive
		try {
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

IpfsWrapper.prototype.addToIpfs = async function(ipfs, blob) {
	// Add	
	try {
		const added = await this.ipfsLibrary.add(ipfs, blob);
		if (added == undefined || added[0] == undefined || added[0].hash == undefined) {
			return { 
				error: new Error("Failed to add content..."), 
				added: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully added content: " + ipfsKeyword + added[0].hash);
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
				unpined: null 
			};
		}
		if ($tw.utils.getIpfsVerbose()) console.log("Successfully pined: " + ipfsKeyword + cid);
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
