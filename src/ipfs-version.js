/*\
title: $:/plugins/ipfs/ipfs-version.js
type: application/javascript
module-type: macro

\*/

( function() {

  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  /*
  Information about this macro
  */

  exports.name = "ipfs-version";

  exports.params = [];

  /*
  Run the macro
  */
  exports.run = function() {
    return $tw.wiki.getTiddler("$:/plugins/ipfs").fields.version
  };

  })();