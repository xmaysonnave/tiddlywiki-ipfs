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
		if (decoded !== undefined && decoded !== null && protocol !== undefined && protocol !== null)  {
			if ($tw.utils.getIpfsVerbose()) console.info("Successfully fetched Ens domain content, protocol: " + protocol + ", " + decoded);
			return {
				error: null,
				protocol: protocol,
				content: decoded
			};
		} else {
			return {
				error: null,
				protocol: null,
				content: null
			};
		}
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
		if ($tw.utils.getIpfsVerbose()) console.info("Successfully set Ens domain content: " + cid);
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
