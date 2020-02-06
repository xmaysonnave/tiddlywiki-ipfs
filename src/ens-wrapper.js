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

/**
 * https://github.com/purposeindustries/window-or-global
 * The MIT License (MIT) Copyright (c) Purpose Industries
 * version: 1.0.1
 */
const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

const EnsLibrary = require("./ens-library.js").EnsLibrary;
const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const name = "ens-wrapper";

var EnsWrapper = function() {
  this.ensLibrary = new EnsLibrary();
  this.ipfsLibrary = new IpfsLibrary();
}

EnsWrapper.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

EnsWrapper.prototype.getContenthash = async function(domain, web3Provider, account) {
  try {
    var { content, protocol } = await this.ensLibrary.getContenthash(domain, web3Provider, account);
    if (content !== null && protocol !== null)  {
      // Convert CidV0 to CidV1
      content = this.ipfsLibrary.cidV0ToCidV1(content);
      // Success
      this.getLogger().info("Successfully fetched ENS domain content...");
      return {
        content: content,
        protocol: protocol
      };
    }
    this.getLogger().warn("Unassigned ENS domain content...");
    return {
      content: null,
      content: null
    };
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unable to fetch ENS domain content...");
  }
}

EnsWrapper.prototype.setContenthash = async function(domain, cid, web3Provider, account) {
  try {
    const cidv0 = this.ipfsLibrary.cidV1ToCidV0(cid);
    await this.ensLibrary.setContenthash(domain, cidv0, web3Provider, account);
    // Success
    this.getLogger().info("Successfully set ENS domain content...");
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unable to set ENS domain content...");
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
      web3Provider: web3Provider,
      account: account
    };
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unable to fetch current Ethereum account...");
  }
}

exports.EnsWrapper = EnsWrapper;

})();
