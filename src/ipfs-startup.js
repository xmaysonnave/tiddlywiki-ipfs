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
    // Log
    const logger = window.log.getLogger(name);
    logger.info("ipfs-startup is starting up...");
  };
})();
