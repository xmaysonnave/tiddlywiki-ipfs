/*\
title: $:/plugins/ipfs/ipfs-controller.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsController

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
  const IpfsLoader = require("$:/plugins/ipfs/ipfs-loader.js").IpfsLoader;
  const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
  const IpfsUri = require("./ipfs-uri.js").IpfsUri;

  const name = "ipfs-controller";

  var IpfsController = function() {
    this.web3 = null;
    this.chainId = null;
    this.account = null;
    this.ethereum = null;
    this.ensWrapper = new EnsWrapper();
    this.loader = new IpfsLoader();
    this.ipfsUri = new IpfsUri();
    this.ipfsWrapper = new IpfsWrapper();
    this.ipfsClients = new Map();
    this.unpin = [];
  };

  IpfsController.prototype.getLogger = function() {
    return window.log.getLogger(name);
  };

  IpfsController.prototype.requestToUnpin = async function(cid) {
    if (this.addToUnpin(cid)) {
      const url = await this.normalizeIpfsUrl("/ipfs/" + cid);
      this.getLogger().info("Request to unpin:" + "\n " + url.toString());
    }
  };

  IpfsController.prototype.addToUnpin = async function(cid) {
    if (cid !== undefined && cid !== null) {
      if (this.unpin.indexOf(cid) === -1) {
        this.unpin.push(cid);
        return true;
      }
    }
    return false;
  };

  IpfsController.prototype.discardRequestToUnpin = async function(cid) {
    if (cid !== undefined && cid !== null && this.removeFromUnpin(cid)) {
      const url = await this.normalizeIpfsUrl("/ipfs/" + cid);
      this.getLogger().info("Discard request to unpin:" + "\n " + url.toString());
    }
  };

  IpfsController.prototype.removeFromUnpin = async function(cid) {
    if (cid !== undefined && cid !== null) {
      var index = this.unpin.indexOf(cid);
      if (index !== -1) {
        this.unpin.splice(index, 1);
        return true;
      }
    }
    return false;
  };

  IpfsController.prototype.isJSON = function(content) {
    if (content !== undefined && content !== null && typeof content === "string") {
      try {
        JSON.parse(content);
        return true;
      } catch (erro) {
        // Ignore
      }
    }
    return false;
  };

  IpfsController.prototype.load = function(loaded) {
    var importedTiddlers = null;
    if (this.isJSON(loaded)) {
      importedTiddlers = $tw.wiki.deserializeTiddlers(".json", loaded, $tw.wiki.getCreationFields());
    } else {
      importedTiddlers = $tw.wiki.deserializeTiddlers(".tid", loaded, $tw.wiki.getCreationFields());
    }
    return importedTiddlers;
  };

  IpfsController.prototype.getLoader = function() {
    return this.loader;
  };

  IpfsController.prototype.getNoBaseUrl = function(url) {
    return this.ipfsUri.getUrl(url);
  };

  IpfsController.prototype.getUrl = function(url, base) {
    return this.ipfsUri.getUrl(url, base ? base : this.getIpfsBaseUrl());
  };

  IpfsController.prototype.getIpfsBaseUrl = function() {
    return this.ipfsUri.getIpfsBaseUrl();
  };

  IpfsController.prototype.normalizeIpfsUrl = async function(url) {
    return await this.ipfsUri.normalizeUrl(url, this.getIpfsBaseUrl());
  };

  IpfsController.prototype.getDocumentUrl = function() {
    return this.ipfsUri.getDocumentUrl();
  };

  IpfsController.prototype.getIpfsApiUrl = function() {
    return this.ipfsUri.getIpfsApiUrl();
  };

  IpfsController.prototype.getIpfsGatewayUrl = function() {
    return this.ipfsUri.getIpfsGatewayUrl();
  };

  IpfsController.prototype.decodeCid = function(pathname) {
    return this.ipfsWrapper.decodeCid(pathname);
  };

  IpfsController.prototype.getIpnsIdentifiers = function(ipfs, ipnsKey, ipnsName) {
    return this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
  };

  IpfsController.prototype.loadTiddlers = async function(uri) {
    const tiddlers = await this.ipfsWrapper.loadTiddlers(uri);
    return tiddlers;
  };

  IpfsController.prototype.getIpfsClient = async function() {
    // Provider
    const ipfsProvider = $tw.utils.getIpfsProvider();
    // IPFS companion
    if (ipfsProvider === "window") {
      const client = await this.ipfsWrapper.getWindowIpfsClient();
      return {
        ipfs: client.ipfs,
        provider: client.provider
      };
    }
    // Default, try IPFS companion
    if (ipfsProvider === "default") {
      try {
        const client = await this.ipfsWrapper.getWindowIpfsClient();
        return {
          ipfs: client.ipfs,
          provider: client.provider
        };
      } catch (error) {
        // Ignore, fallback to HTTP
      }
    }
    // Current API URL
    const apiUrl = this.getIpfsApiUrl();
    // Check
    if (apiUrl == undefined || apiUrl == null || apiUrl.href === "") {
      throw new Error("Undefined IPFS API URL...");
    }
    // HTTP Client
    const client = this.ipfsClients.get(apiUrl.href);
    if (client !== undefined && client !== null) {
      // Log
      this.getLogger().info("Reuse IPFS provider:" + "\n " + client.provider);
      // Done
      return {
        ipfs: client.ipfs,
        provider: client.provider
      };
    }
    // Build a new HTTP client
    const policy = await this.ipfsWrapper.getHttpIpfsClient(apiUrl);
    const ipfs = policy.ipfs;
    const provider = policy.provider;
    // Store
    this.ipfsClients.set(apiUrl.href, { ipfs, provider });
    // Log
    this.getLogger().info("New IPFS provider:" + "\n " + policy.provider);
    // Done
    return {
      ipfs: ipfs,
      provider: provider
    };
  };

  IpfsController.prototype.getEthereumProvider = async function() {
    if (this.ethereum == null) {
      const self = this;
      this.ethereum = await this.ensWrapper.getProvider();
      // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
      this.ethereum.on("chainChanged", function networkChanged(chainId) {
        self.networkChanged(chainId);
      });
      this.ethereum.on("networkChanged", function networkChanged(chainId) {
        self.networkChanged(chainId);
      });
      this.ethereum.on("accountsChanged", function accountChanged(accounts) {
        self.accountChanged(accounts);
      });
      this.ethereum.on("close", function closeProvider(code, reason) {
        self.closeProvider(code, reason);
      });
    }
    return this.ethereum;
  };

  IpfsController.prototype.networkChanged = function(chainId) {
    if (this.chainId !== chainId) {
      const network = this.ensWrapper.getNetwork();
      try {
        this.web3 = null;
        this.chainId = chainId;
        this.account = null;
        this.getLogger().info("Current Ethereum network:" + "\n " + network[chainId]);
      } catch (error) {
        this.getLogger().error(error);
        $tw.utils.alert(name, error.message);
      }
    }
  };

  IpfsController.prototype.accountChanged = async function(accounts) {
    if (accounts == undefined || accounts == null || Array.isArray(accounts) == false || accounts.length === 0) {
      this.web3 = null;
      this.chainId = null;
      this.account = null;
      this.getLogger().info("Closing Ethereum provider...");
    } else if (this.account !== accounts[0]) {
      try {
        if (this.web3 == null && this.chainId == null) {
          const { web3, chainId } = await this.getWeb3Provider();
          this.web3 = web3;
          this.chainId = chainId;
        }
        this.account = accounts[0];
        const etherscan = this.ensWrapper.getEtherscanRegistry();
        this.getLogger().info(
          "Current Ethereum account:" + "\n " + etherscan[this.chainId] + "/address/" + this.account
        );
      } catch (error) {
        this.getLogger().error(error);
        $tw.utils.alert(name, error.message);
      }
    }
  };

  IpfsController.prototype.closeProvider = function(code, reason) {
    this.web3 = null;
    this.chainId = null;
    this.account = null;
    this.getLogger().info("Closing Ethereum provider:" + "\n " + "Reason: " + reason + "\n " + "Code: " + code);
  };

  IpfsController.prototype.getEnabledWeb3Provider = async function() {
    const provider = await this.getEthereumProvider();
    const network = this.ensWrapper.getNetwork();
    const etherscan = this.ensWrapper.getEtherscanRegistry();
    var info = "Reuse Web3 provider:";
    if (this.account == null) {
      const { web3, chainId, account } = await this.ensWrapper.getEnabledWeb3Provider(provider);
      this.web3 = web3;
      this.chainId = chainId;
      this.account = account;
      info = "New Web3 provider:";
    }
    // Log
    this.getLogger().info(
      info +
        "\n network: " +
        network[this.chainId] +
        "\n account: " +
        etherscan[this.chainId] +
        "/address/" +
        this.account
    );
    return {
      web3: this.web3,
      chainId: this.chainId,
      account: this.account
    };
  };

  IpfsController.prototype.getWeb3Provider = async function() {
    const provider = await this.getEthereumProvider();
    const network = this.ensWrapper.getNetwork();
    var info = "Reuse Web3 provider:";
    if (this.web3 == null) {
      const { web3, chainId } = await this.ensWrapper.getWeb3Provider(provider);
      this.web3 = web3;
      this.chainId = chainId;
      info = "New Web3 provider:";
    }
    // Log
    this.getLogger().info(info + "\n network: " + network[this.chainId]);
    return {
      web3: this.web3,
      chainId: this.chainId
    };
  };

  IpfsController.prototype.resolveENS = async function(ensDomain) {
    // Retrieve a Web3 provider
    const { web3 } = await this.getWeb3Provider();
    // Fetch ENS domain content
    const { content, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3);
    if (content !== null && protocol !== null) {
      const parsed = await $tw.ipfs.normalizeIpfsUrl("/" + protocol + "/" + content);
      return parsed;
    }
    // Empty content
    return null;
  };

  exports.IpfsController = IpfsController;
})();
