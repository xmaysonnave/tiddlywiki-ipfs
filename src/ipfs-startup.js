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

const SaverHandler = require("$:/core/modules/saver-handler.js").SaverHandler;

const IpfsSaverHandler = require("./ipfs-saver-handler.js").IpfsSaverHandler;
const IpfsActions = require("./ipfs-actions.js").IpfsActions;

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
  if ($tw.utils.getIpfsVerbose()) console.info("IPFS Saver is verbose");
  // Load priority
  var priority = $tw.utils.getIpfsPriority();
  if ($tw.utils.getIpfsVerbose()) console.info(
    "IPFS Saver priority: "
    + priority
  );
  // Missing Media Types
  $tw.utils.registerFileType("audio/mpeg","base64",".mp2");
  $tw.utils.registerFileType("image/jpeg","base64",".jpeg",{flags:["image"]});
  $tw.utils.registerFileType("image/jpg","base64",".jpg",{flags:["image"]});
  $tw.utils.registerFileType("video/ogg","base64",[".ogm",".ogv",".ogg"]);
  $tw.utils.registerFileType("video/quicktime","base64",[".mov",".qt"]);
  $tw.utils.registerFileType("video/webm","base64",".webm");
  // Init Event
  const ipfsActions = new IpfsActions();
  ipfsActions.init();
};

})();
