/*\
title: $:/plugins/ipfs/ipfs-startup.js
type: application/javascript
tags: $:/ipfs/core
module-type: startup

Startup initialisation

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const EnsAction = require("$:/plugins/ipfs/ens-action.js").EnsAction;
  const IpfsAction = require("$:/plugins/ipfs/ipfs-action.js").IpfsAction;
  const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

  exports.platforms = ["browser"];
  exports.after = ["startup"];
  exports.synchronous = true;

  exports.startup = function () {
    // Logger name
    const name = "ipfs-startup";

    // Missing Media Types
    $tw.utils.registerFileType("audio/mpeg", "base64", ".mp2");
    $tw.utils.registerFileType("video/quicktime", "base64", [".mov", ".qt"]);
    $tw.utils.registerFileType("application/gzip", "base64", ".gz");

    // Listener
    this.ensAction = new EnsAction();
    this.ipfsAction = new IpfsAction();
    this.ipfsTiddler = new IpfsTiddler();

    // Init event listeners
    this.ensAction.init();
    this.ipfsAction.init();
    this.ipfsTiddler.init();

    // Log
    const logger = window.log.getLogger(name);
    logger.info("ipfs-startup is starting up...");
  };
})();
