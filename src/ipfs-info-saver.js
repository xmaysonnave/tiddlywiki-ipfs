/*\
title: $:/plugins/ipfs/macro/ipfs-info-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

IPFS info saver

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  /*
   * Information about this macro
   */
  exports.name = "ipfs-info-saver";

  exports.params = [{ name: "tiddler" }];

  /*
   * Run the macro
   */
  exports.run = function(tiddler) {
    return $tw.saverHandler.getSaver(tiddler).module.info.name;
  };
})();
