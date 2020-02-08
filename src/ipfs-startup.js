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
const IpfsSaverHandler = require("$:/plugins/ipfs/ipfs-saver-handler.js").IpfsSaverHandler;
const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

exports.platforms = ["browser"];
exports.after = ["load-modules"];
exports.synchronous = true;

exports.startup = async function() {
  // Logger name
  const name = "ipfs-startup";
  // loglevel is initialized in ipfs-saver
  const logger = window.log.getLogger(name);
  // ipfs-saver starts before ipfs-startup
  logger.info("ipfs-startup is starting...");
  // Requirement
  if($tw.wiki.getTiddler("$:/plugins/bimlas/locator") == undefined) {
    $tw.utils.alert(
      name,
      "The plugin [ext[IPFS with TiddlyWiki|https://bluelightav.eth.link/#%24%3A%2Fplugins%2Fipfs]] requires the [ext[Locator plugin by bimlas|https://bimlas.gitlab.io/tw5-locator/#%24%3A%2Fplugins%2Fbimlas%2Flocator]] to be installed"
    );
  }
  // Update SaverHandler
  SaverHandler.prototype.initSavers = IpfsSaverHandler.prototype.initSavers;
  SaverHandler.prototype.saveWiki = IpfsSaverHandler.prototype.saveWiki;
  SaverHandler.prototype.sortSavers = IpfsSaverHandler.prototype.sortSavers;
  SaverHandler.prototype.updateSaver = IpfsSaverHandler.prototype.updateSaver;
  // Missing Media Types
  $tw.utils.registerFileType("audio/mpeg","base64",".mp2");
  $tw.utils.registerFileType("image/jpeg","base64",".jpeg",{flags:["image"]});
  $tw.utils.registerFileType("image/jpg","base64",".jpg",{flags:["image"]});
  $tw.utils.registerFileType("video/ogg","base64",[".ogm",".ogv",".ogg"]);
  $tw.utils.registerFileType("video/quicktime","base64",[".mov",".qt"]);
  $tw.utils.registerFileType("video/webm","base64",".webm");
  // Listener
  this.ensAction = new EnsAction();
  this.ipfsAction = new IpfsAction();
  this.ipfsTiddler = new IpfsTiddler();
  // Init event listeners
  this.ensAction.init();
  this.ipfsAction.init();
  this.ipfsTiddler.init();
};

})();
