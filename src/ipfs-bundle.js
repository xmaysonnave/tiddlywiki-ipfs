/*\
title: $:/plugins/ipfs/ipfs-bundle.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Bundle

\*/

import root from "window-or-global";

import EnsLibrary from "./ens-library";
import IpfsLibrary from "./ipfs-library";
import IpfsLoader from "./ipfs-loader";
import IpfsUrl from "./ipfs-url";

(function () {
  /*jslint node: true, browser: true*/
  /*global $tw: false*/
  "use strict";

  const name = "ipfs-bundle";

  var IpfsBundle = function () {
    this.once = false;
  };

  IpfsBundle.prototype.getLogger = function () {
    return root.log.getLogger(name);
  };

  IpfsBundle.prototype.init = function () {
    // Init once
    if (this.once) {
      return;
    }
    this.ipfsLoader = new IpfsLoader();
    this.ensLibrary = new EnsLibrary(this.ipfsLoader);
    this.ipfsLibrary = new IpfsLibrary(this.ipfsLoader);
    this.ipfsUrl = new IpfsUrl();
    // Init once
    this.once = true;
  };

  module.exports = {
    IpfsBundle,
  };
})();
