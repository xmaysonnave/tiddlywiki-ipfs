/*\
title: $:/plugins/ipfs/ipfs-bundle.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Bundle

\*/

import EnsLibrary from "./ens-library";
import IpfsLibrary from "./ipfs-library";
import IpfsLoader from "./ipfs-loader";
import IpfsUri from "./ipfs-uri";

(function() {
  /*jslint node: true, browser: true*/
  /*global $tw: false*/
  "use strict";

  var IpfsBundle = function() {
    this.ensLibrary = new EnsLibrary();
    this.ipfsLibrary = new IpfsLibrary();
    this.ipfsLoader = new IpfsLoader();
    this.ipfsUri = new IpfsUri();
  };

  module.exports = {
    IpfsBundle
  };
})();
