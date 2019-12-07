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
exports.synchronous = true;

exports.startup = function(continueStartupCallback) {
  // Load verbose property
  if ($tw.utils.getIpfsVerbose()) console.info("Ipfs Saver is verbose");
  // Load priority
  var priority = $tw.utils.getIpfsPriority();
  if ($tw.utils.getIpfsVerbose()) console.info("Ipfs Saver priority: " + priority);
};

})();
