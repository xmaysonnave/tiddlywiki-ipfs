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

const IpfsSaverHandler = require("$:/plugins/ipfs/ipfs-saver-handler.js").IpfsSaverHandler;
const SaverHandler = require("$:/core/modules/saver-handler.js").SaverHandler;
const IpfsActions = require("$:/plugins/ipfs/ipfs-actions.js").IpfsActions;

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
  // Event
  const ipfsActions = new IpfsActions();
  $tw.wiki.addEventListener("change", function(changes) {
    return ipfsActions.handleChangeEvent(changes);
  });
  $tw.rootWidget.addEventListener("tm-export-to-ipfs", function(event) {
    return ipfsActions.handleExportToIpfs(ipfsActions, event);
  });
  $tw.rootWidget.addEventListener("tm-mobile-console", function(event) {
    return ipfsActions.handleMobileConsole(ipfsActions, event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ens", function(event) {
    return ipfsActions.handlePublishToEns(ipfsActions, event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ipns", function(event) {
    return ipfsActions.handlePublishToIpns(ipfsActions, event);
  });
  $tw.rootWidget.addEventListener("tm-tiddler-refresh", function(event) {
    return ipfsActions.handleRefreshTiddler(event);
  });
  $tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
    return ipfsActions.handleFileImport(tiddler);
  });
};

})();
