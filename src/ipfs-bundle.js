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
import IpfsUrl from "./ipfs-url";

(function () {
  /*jslint node: true, browser: true*/
  /*global $tw: false*/
  "use strict";

  var IpfsBundle = function () {
    this.once = false;
  };

  IpfsBundle.prototype.init = function () {
    // Init once
    if (this.once) {
      return;
    }
    this.ensLibrary = new EnsLibrary(this);
    this.ipfsLibrary = new IpfsLibrary(this);
    this.ipfsLoader = new IpfsLoader();
    this.ipfsUrl = new IpfsUrl(this.ensLibrary, this.ipfsLibrary);
    // Init once
    this.once = true;
  };

  module.exports = {
    IpfsBundle,
  };
})();
