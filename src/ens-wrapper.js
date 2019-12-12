/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
module-type: library

EnsWrapper

\*/

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const EnsLibrary = require("$:/plugins/ipfs/ens-library.js").EnsLibrary;
const IpfsLibrary = require("$:/plugins/ipfs/ipfs-library.js").IpfsLibrary;
const ipfsKeyword = "/ipfs/";

/*
Ens Wrapper
*/
var EnsWrapper = function() {
  this.ensLibrary = new EnsLibrary();
  this.ipfsLibrary = new IpfsLibrary();
}

EnsWrapper.prototype.getContenthash = async function(domain) {
  try {
    const { decoded, protocol } = await this.ensLibrary.getContenthash(domain);
    if (decoded !== undefined && decoded !== null && protocol !== undefined && protocol !== null)  {
      if ($tw.utils.getIpfsVerbose()) console.info(
        "Successfully fetched Ens domain content, protocol: "
        + protocol
        + ", "
        + decoded
      );
      return {
        error: null,
        protocol: protocol,
        content: decoded
      };
    } else {
      if ($tw.utils.getIpfsVerbose()) console.warn("Unassigned Ens domain content...");
      return {
        error: null,
        protocol: null,
        content: null
      };
    }
  } catch (error) {
    return {
      error: error,
      protocol: null,
      content: null
    };
  }
}

EnsWrapper.prototype.setContenthash = async function(domain, cid) {
  try {
    const cidv0 = this.ipfsLibrary.CidV1ToCidV0(cid);
    await this.ensLibrary.setContenthash(domain, cidv0);
    if ($tw.utils.getIpfsVerbose()) console.info("Successfully set Ens domain content...");
    return {
      error: null
    };
  } catch (error) {
    return {
      error: error
    };
  }
}

exports.EnsWrapper = EnsWrapper;

})();
