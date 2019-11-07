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
	// Load priority property
	var priority = $tw.utils.updateIpfsPriority()
	if ($tw.utils.getIpfsVerbose()) console.log("Ipfs Saver priority: " + priority);
	var { protocol, hostname, pathname, port } = $tw.utils.parseUrlShort(document.URL);
	if (protocol !== "file:") {
		if (window != undefined && window.ethereum != undefined) {
			// https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider#ethereum.autorefreshonnetworkchange
			window.ethereum.autoRefreshOnNetworkChange = false;
		}
	}
  // Continue
	return continueStartupCallback();
};

})();
