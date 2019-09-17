/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
module-type: startup

Startup initialisation

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "ipfs-startup";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = false;

exports.startup = function(continueStartupCallback) {
	// Locate Ipfs saver
	var saver;
	for (var i = 0; i < $tw.saverHandler.savers.length; i++) {
		var saver = $tw.saverHandler.savers[i];
		if (saver.info.name == "ipfs") {
			saver = $tw.saverHandler.savers[i];
			break;
		}
	}
	// Process ipfs saver verbose property
	if (saver == undefined) {
		// Continue
		return continueStartupCallback();
	}
	// Load verbose property
	saver.updateVerbose();
	if (saver.verbose) console.log("Ipfs Saver is verbose");
	// Load priority property
	saver.updatePriority();
	if (saver.verbose) console.log("Ipfs Saver priority: " + saver.info.priority);		
  // Continue
	return continueStartupCallback();
};

})();
