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
const IpfsUri = require("./ipfs-uri.js").IpfsUri;

const name = "ens-wrapper";

var EnsWrapper = function() {
  this.ensLibrary = new EnsLibrary();
  this.ipfsLibrary = new IpfsLibrary();
  this.ipfsUri = new IpfsUri();
}

EnsWrapper.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

EnsWrapper.prototype.getContenthash = async function(domain, web3, account) {
  try {
    var { content, protocol } = await this.ensLibrary.getContenthash(domain, web3, account);
    if (content !== null && protocol !== null)  {
      // Convert CidV0 to CidV1
      content = this.ipfsLibrary.cidV0ToCidV1(content);
      // Success
      const url = await this.ipfsUri.normalizeUrl("/" + protocol + "/" + content);
      this.getLogger().info(
        "Successfully fetched ENS domain content:"
        + "\n "
        + url.toString()
      );
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

EnsWrapper.prototype.setContenthash = async function(domain, cid, web3, account) {
  try {
    const cidv0 = this.ipfsLibrary.cidV1ToCidV0(cid);
    await this.ensLibrary.setContenthash(domain, cidv0, web3, account);
    // Success
    const url = await this.ipfsUri.normalizeUrl("/ipfs/" + cidv0);
    this.getLogger().info(
      "Successfully set ENS domain content:"
      + "\n "
      + url.toString()
    );
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unable to set ENS domain content...");
  }
}

EnsWrapper.prototype.getWeb3Provider = async function(provider) {
  try {
    const { account, chainId, web3 } = await this.ensLibrary.getWeb3Provider(provider);
    return {
      account: account,
      chainId: chainId,
      web3: web3
    };
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unable to fetch current Ethereum account...");
  }
}

EnsWrapper.prototype.getProvider = async function() {
  try {
    const provider = await this.ensLibrary.getProvider();
    this.getLogger().info("Successfully found an Ethereum provider...");
    return provider;
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unable to find an Ethereum provider...");
  }
}

EnsWrapper.prototype.getNetwork = function() {
  return this.ensLibrary.getNetwork();
}

EnsWrapper.prototype.getENSRegistry = function() {
  return this.ensLibrary.getENSRegistry();
}

exports.EnsWrapper = EnsWrapper;

})();
