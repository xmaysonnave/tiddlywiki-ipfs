/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
module-type: library

EnsWrapper

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const EnsLibrary = require("$:/plugins/ipfs/ens-library.js").EnsLibrary;

/*
Ens Wrapper
*/
var EnsWrapper = function() {
	this.ensLibrary = new EnsLibrary();	
}

EnsWrapper.prototype.getContenthash = async function(domain) {
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

EnsWrapper.prototype.setContenthash = async function(domain, cid) {
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

exports.EnsWrapper = EnsWrapper;

})();
