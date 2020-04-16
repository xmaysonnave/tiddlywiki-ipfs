/*\
title: $:/plugins/ipfs/macro/ipfs-info-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: macro

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  /*
   * Information about this macro
   */
  exports.name = "ipfs-info-saver";

  exports.params = [{ name: "title" }];

  /*
   * Run the macro
   */
  exports.run = function(title) {
    return $tw.saverHandler.getSaver(title).module.info.name;
  };
})();
