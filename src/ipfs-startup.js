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

const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

const SaverHandler = require("$:/core/modules/saver-handler.js").SaverHandler;

const log = require("$:/plugins/ipfs/loglevel/loglevel.js");

const EnsAction = require("$:/plugins/ipfs/ens-action.js").EnsAction;
const IpfsAction = require("$:/plugins/ipfs/ipfs-action.js").IpfsAction;
const IpfsModule = require("$:/plugins/ipfs/ipfs-module.js").IpfsModule;
const IpfsSaverHandler = require("$:/plugins/ipfs/ipfs-saver-handler.js").IpfsSaverHandler;
const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

exports.startup = async function() {
  const name = "ipfs-startup";
  // Requirement
  if($tw.wiki.getTiddler("$:/plugins/bimlas/locator") == undefined) {
    $tw.utils.alert(
      name,
      "The plugin [ext[IPFS with TiddlyWiki|https://bluelightav.eth.link/#%24%3A%2Fplugins%2Fipfs]] requires the [ext[Locator plugin by bimlas|https://bimlas.gitlab.io/tw5-locator/#%24%3A%2Fplugins%2Fbimlas%2Flocator]] to be installed"
    );
  }
  // Module
  const ipfsModule = new IpfsModule();
  root.ipfsModule = ipfsModule;
  root.log = log;
  // Init Logger and populate root with log property
  const logger = ipfsModule.getLogger(name);
  const verboseMsg = "IPFS with TiddlyWiki is verbose...";
  if ($tw.utils.getIpfsVerbose()) {
    logger.setLevel("trace", false);
    logger.info(verboseMsg);
  } else {
    logger.setLevel("trace", false);
    logger.info("IPFS with TiddlyWiki is not verbose...");
    logger.setLevel("warn", false);
  }
  // Log priority
  logger.info(
    "IPFS Saver priority: "
    + $tw.utils.getIpfsPriority()
  );
  // Update SaverHandler
  SaverHandler.prototype.initSavers = IpfsSaverHandler.prototype.initSavers;
  SaverHandler.prototype.saveWiki = IpfsSaverHandler.prototype.saveWiki;
  SaverHandler.prototype.sortSavers = IpfsSaverHandler.prototype.sortSavers;
  SaverHandler.prototype.updateSaver = IpfsSaverHandler.prototype.updateSaver;
  // Unpin
  root.unpin = [];
  // Missing Media Types
  $tw.utils.registerFileType("audio/mpeg","base64",".mp2");
  $tw.utils.registerFileType("image/jpeg","base64",".jpeg",{flags:["image"]});
  $tw.utils.registerFileType("image/jpg","base64",".jpg",{flags:["image"]});
  $tw.utils.registerFileType("video/ogg","base64",[".ogm",".ogv",".ogg"]);
  $tw.utils.registerFileType("video/quicktime","base64",[".mov",".qt"]);
  $tw.utils.registerFileType("video/webm","base64",".webm");
  // Init Event
  const ensAction = new EnsAction();
  ensAction.init();
  const ipfsAction = new IpfsAction();
  ipfsAction.init();
  const ipfsTiddler = new IpfsTiddler();
  ipfsTiddler.init();
};

})();
