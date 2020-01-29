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

const EnsAction = require("$:/plugins/ipfs/ens-action.js").EnsAction;
const IpfsAction = require("$:/plugins/ipfs/ipfs-action.js").IpfsAction;
const IpfsModule = require("$:/plugins/ipfs/ipfs-module.js").IpfsModule;
const IpfsSaverHandler = require("$:/plugins/ipfs/ipfs-saver-handler.js").IpfsSaverHandler;
const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

exports.name = "ipfs-startup";
exports.platforms = ["browser"];
exports.after = ["load-modules"];
exports.synchronous = true;

exports.startup = async function() {
  // Requirement
  if($tw.wiki.getTiddler("$:/plugins/bimlas/locator") == undefined) {
    $tw.utils.alert(
      "ipfs-startup",
      "The plugin [ext[IPFS with TiddlyWiki|https://bluelightav.eth.link/#%24%3A%2Fplugins%2Fipfs]] requires the [ext[Locator plugin by bimlas|https://bimlas.gitlab.io/tw5-locator/#%24%3A%2Fplugins%2Fbimlas%2Flocator]] to be installed"
    );
  }
  // Logger
  const ipfsModule = new IpfsModule();
  // Load loglevel
  await ipfsModule.loadLoglevel();
  // Logger
  const log = window.log.getLogger("ipfs-startup");
  if ($tw.utils.getIpfsVerbose()) {
    window.log.setLevel("trace", false);
    log.info("IPFS with TiddlyWiki is verbose...");
  } else {
    window.log.setLevel("trace", false);
    log.info("IPFS with TiddlyWiki is not verbose...");
    window.log.setLevel("warn", false);
  }
  // Log priority
  log.info(
    "IPFS Saver priority: "
    + $tw.utils.getIpfsPriority()
  );
  // Update SaverHandler
  SaverHandler.prototype.initSavers = IpfsSaverHandler.prototype.initSavers;
  SaverHandler.prototype.saveWiki = IpfsSaverHandler.prototype.saveWiki;
  SaverHandler.prototype.sortSavers = IpfsSaverHandler.prototype.sortSavers;
  SaverHandler.prototype.updateSaver = IpfsSaverHandler.prototype.updateSaver;
  // Unpin
  window.unpin = [];
  // Missing Media Types
  $tw.utils.registerFileType("audio/mpeg","base64",".mp2");
  $tw.utils.registerFileType("image/jpeg","base64",".jpeg",{flags:["image"]});
  $tw.utils.registerFileType("image/jpg","base64",".jpg",{flags:["image"]});
  $tw.utils.registerFileType("video/ogg","base64",[".ogm",".ogv",".ogg"]);
  $tw.utils.registerFileType("video/quicktime","base64",[".mov",".qt"]);
  $tw.utils.registerFileType("video/webm","base64",".webm");
  // Init Event
  const ensAction = new EnsAction();
  const ipfsAction = new IpfsAction();
  const ipfsTiddler = new IpfsTiddler();
  ensAction.init();
  ipfsAction.init();
  ipfsTiddler.init();
};

})();
