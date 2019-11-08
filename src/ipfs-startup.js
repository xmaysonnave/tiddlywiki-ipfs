/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
module-type: startup

Startup initialisation

\*/
( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "ipfs-startup";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = false;

exports.startup = function(continueStartupCallback) {
	// Load verbose property
	if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver is verbose");
	// Load priority
	var priority = $tw.utils.getIpfsPriority();
	if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver priority: " + priority);
	// Prevent Metamask to reload the current page when network changes
	var { protocol } = $tw.utils.parseUrlShort(document.URL);
	if (protocol !== "file:") {
		if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
			// https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider#ethereum.autorefreshonnetworkchange
			window.ethereum.autoRefreshOnNetworkChange = false;
		}
	}
  // Continue
	return continueStartupCallback();
};

})();
