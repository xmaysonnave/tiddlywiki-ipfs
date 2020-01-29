/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

EnsWrapper

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const EnsLibrary = require("./ens-library.js").EnsLibrary;
const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

var EnsWrapper = function() {
  // Libraries
  this.ensLibrary = new EnsLibrary();
  this.ipfsLibrary = new IpfsLibrary();
}

EnsWrapper.prototype.getLogger = function() {
  if (window.log !== undefined) {
    return window.log.getLogger("ens-wrapper");
  }
  return console;
}

EnsWrapper.prototype.getContenthash = async function(domain, web3Provider, account) {
  try {
    const { decoded, protocol } = await this.ensLibrary.getContenthash(domain, web3Provider, account);
    if (decoded !== undefined && decoded !== null && protocol !== undefined && protocol !== null)  {
      this.getLogger().info(
        "Successfully fetched ENS domain content: /"
        + protocol
        + "/"
        + decoded
      );
      return {
        error: null,
        decoded: decoded,
        protocol: protocol
      };
    }
    this.getLogger().warn("Unassigned ENS domain content...");
    return {
      error: null,
      decoded: null,
      protocol: null
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: new Error("Unable to fetch ENS domain content..."),
      decoded: null,
      protocol: null
    };
  }
}

EnsWrapper.prototype.setContenthash = async function(domain, cid, web3Provider, account) {
  try {
    const cidv0 = this.ipfsLibrary.cidV1ToCidV0(cid);
    await this.ensLibrary.setContenthash(domain, cidv0, web3Provider, account);
    this.getLogger().info("Successfully set ENS domain content...");
    return {
      error: null
    };
  } catch (error) {
    return {
      error: error
    };
  }
}

EnsWrapper.prototype.getWeb3Provider = async function() {
  try {
    const { web3Provider, account } = await this.ensLibrary.getWeb3Provider();
    this.getLogger().info(
      "Successfully fetched current Ethereum account: "
      + account
    );
    return {
      error: null,
      web3Provider: web3Provider,
      account: account
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: new Error("Unable to fetch current Ethereum account..."),
      web3Provider: null,
      account: null
    };
  }
}

exports.EnsWrapper = EnsWrapper;

})();
