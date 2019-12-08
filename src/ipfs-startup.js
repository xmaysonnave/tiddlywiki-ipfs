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

const SaverHandler = require("$:/core/modules/saver-handler.js").SaverHandler;
const IpfsSaverHandler = require("$:/plugins/ipfs/ipfs-saver-handler.js").IpfsSaverHandler;

// Export name and synchronous status
exports.name = "ipfs-startup";
exports.platforms = ["browser"];
exports.after = ["load-modules"];
exports.synchronous = true;

exports.startup = function() {
  // Update SaverHandler
  SaverHandler.prototype.initSavers = IpfsSaverHandler.prototype.initSavers;
  SaverHandler.prototype.updateSaver = IpfsSaverHandler.prototype.updateSaver;
  SaverHandler.prototype.sortSavers = IpfsSaverHandler.prototype.sortSavers;
  // Load verbose property
  if ($tw.utils.getIpfsVerbose()) console.info("Ipfs Saver is verbose");
  // Load priority
  var priority = $tw.utils.getIpfsPriority();
  if ($tw.utils.getIpfsVerbose()) console.info(
    "Ipfs Saver priority: "
    + priority
  );
};

})();
