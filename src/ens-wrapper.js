/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

ENS Wrapper

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  /**
   * https://github.com/purposeindustries/window-or-global
   * The MIT License (MIT) Copyright (c) Purpose Industries
   * version: 1.0.1
   */
  const root =
    (typeof self === "object" && self.self === self && self) ||
    (typeof global === "object" && global.global === global && global) ||
    this;

  const name = "ens-wrapper";

  var EnsWrapper = function (ipfsBundle) {
    this.ensLibrary = ipfsBundle.ensLibrary;
    this.ipfsLibrary = ipfsBundle.ipfsLibrary;
  };

  EnsWrapper.prototype.getLogger = function () {
    return root.log.getLogger(name);
  };

  EnsWrapper.prototype.getContentHash = async function (domain, web3) {
    try {
      // Retrieve
      var { content, protocol } = await this.ensLibrary.getContentHash(domain, web3);
      if (content !== null && protocol !== null) {
        // Convert CidV0 to CidV1
        content = this.ipfsLibrary.cidV0ToCidV1(content);
        // Success
        return {
          content: content,
          protocol: protocol,
        };
      }
      this.getLogger().warn("Unassigned ENS domain content...");
      return {
        content: null,
        protocol: null,
      };
    } catch (error) {
      this.getLogger().error(error);
      throw new Error("Unable to fetch ENS domain content...");
    }
  };

  EnsWrapper.prototype.setContentHash = async function (domain, cid, web3, account) {
    try {
      const cidV0 = this.ipfsLibrary.cidV1ToCidV0(cid);
      await this.ensLibrary.setContentHash(domain, cidV0, web3, account);
      return {
        cidV0: cidV0,
      };
    } catch (error) {
      this.getLogger().error(error);
      throw new Error("Unable to set ENS domain content...");
    }
  };

  EnsWrapper.prototype.getEnabledWeb3Provider = async function (provider) {
    try {
      const { web3, chainId, account } = await this.ensLibrary.getEnabledWeb3Provider(provider);
      return {
        web3: web3,
        chainId: chainId,
        account: account,
      };
    } catch (error) {
      this.getLogger().error(error);
      throw new Error("Unable to retrieve an enabled Ethereum provider...");
    }
  };

  EnsWrapper.prototype.getWeb3Provider = async function (provider) {
    try {
      const { web3, chainId } = await this.ensLibrary.getWeb3Provider(provider);
      return {
        web3: web3,
        chainId: chainId,
      };
    } catch (error) {
      this.getLogger().error(error);
      throw new Error("Unable to retrieve an Ethereum provider...");
    }
  };

  EnsWrapper.prototype.getProvider = async function () {
    try {
      const provider = await this.ensLibrary.getProvider();
      return provider;
    } catch (error) {
      this.getLogger().error(error);
      throw new Error("Unable to retrieve an Ethereum provider...");
    }
  };

  EnsWrapper.prototype.getEtherscanRegistry = function () {
    return this.ensLibrary.getEtherscanRegistry();
  };

  EnsWrapper.prototype.getNetwork = function () {
    return this.ensLibrary.getNetwork();
  };

  EnsWrapper.prototype.getENSRegistry = function () {
    return this.ensLibrary.getENSRegistry();
  };

  exports.EnsWrapper = EnsWrapper;
})();
