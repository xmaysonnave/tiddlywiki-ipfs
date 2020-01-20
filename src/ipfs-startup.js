/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Startup initialisation

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const SaverHandler = require("$:/core/modules/saver-handler.js").SaverHandler;

const IpfsSaverHandler = require("$:/plugins/ipfs/ipfs-saver-handler.js").IpfsSaverHandler;
const IpfsActions = require("$:/plugins/ipfs/ipfs-actions.js").IpfsActions;

exports.name = "ipfs-startup";
exports.platforms = ["browser"];
exports.after = ["load-modules"];
exports.synchronous = true;

exports.startup = function() {
  // Requirement
  const logger = new $tw.utils.Logger("ipfs");
	if($tw.wiki.getTiddler("$:/plugins/bimlas/locator") == undefined) {
		logger.alert("The plugin [ext[IPFS with TiddlyWiki|https://bluelightav.eth.link/#%24%3A%2Fplugins%2Fipfs]] requires the [ext[Locator plugin by bimlas|https://bimlas.gitlab.io/tw5-locator/#%24%3A%2Fplugins%2Fbimlas%2Flocator]] to be installed");
	}
  // Update SaverHandler
  SaverHandler.prototype.initSavers = IpfsSaverHandler.prototype.initSavers;
  SaverHandler.prototype.saveWiki = IpfsSaverHandler.prototype.saveWiki;
  SaverHandler.prototype.sortSavers = IpfsSaverHandler.prototype.sortSavers;
  SaverHandler.prototype.updateSaver = IpfsSaverHandler.prototype.updateSaver;
  // Load verbose property
  if ($tw.utils.getIpfsVerbose()) logger.info("IPFS with TiddlyWiki is verbose...");
  // Load priority
  var priority = $tw.utils.getIpfsPriority();
  if ($tw.utils.getIpfsVerbose()) logger.info(
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
