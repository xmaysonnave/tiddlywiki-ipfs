/*\
title: $:/plugins/ipfs/ipfs-controller.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Controller

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
  const IpfsBundle = require("$:/plugins/ipfs/ipfs-bundle.js").IpfsBundle;
  const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-controller";

  var IpfsController = function () {
    this.ipfsBundle = new IpfsBundle();
    this.ipfsBundle.init();
    this.ensWrapper = new EnsWrapper(this.ipfsBundle);
    this.ipfsUrl = this.ipfsBundle.ipfsUrl;
    this.ipfsWrapper = new IpfsWrapper(this.ipfsBundle);
    this.ipfsClients = new Map();
    this.importedTiddlers = new Map();
    this.pin = [];
    this.unpin = [];
  };

  IpfsController.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsController.prototype.isCid = function (cid) {
    return this.ipfsBundle.isCid(cid);
  };

  IpfsController.prototype.loadToBase64 = async function (url) {
    return this.ipfsBundle.loadToBase64(url);
  };

  IpfsController.prototype.loadToUtf8 = async function (url) {
    return this.ipfsBundle.loadToUtf8(url);
  };

  IpfsController.prototype.Base64ToUint8Array = function (base64) {
    return this.ipfsBundle.Base64ToUint8Array(base64);
  };

  IpfsController.prototype.Uint8ArrayToBase64 = function (uint8) {
    return this.ipfsBundle.Uint8ArrayToBase64(uint8);
  };

  IpfsController.prototype.StringToUint8Array = function (string) {
    return this.ipfsBundle.StringToUint8Array(string);
  };

  IpfsController.prototype.Utf8ArrayToStr = function (array) {
    return this.ipfsBundle.Utf8ArrayToStr(array);
  };

  IpfsController.prototype.requestToPin = function (cid, ipnsKey, value) {
    const self = this;
    if (ipnsKey !== undefined && ipnsKey !== null) {
      this.resolveUrl(true, true, value)
        .then((data) => {
          var { cid, resolvedUrl } = data;
          if (resolvedUrl !== null && cid !== null && self.addToPin(cid)) {
            self.getLogger().info("Request to Pin:" + "\n " + resolvedUrl);
          }
        })
        .catch((error) => {
          self.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        });
    } else if (cid !== undefined && cid !== null && this.addToPin(cid)) {
      const normalizedUrl = this.normalizeUrl("/" + ipfsKeyword + "/" + cid);
      this.getLogger().info("Request to Pin:" + "\n " + normalizedUrl);
    }
  };

  IpfsController.prototype.addToPin = function (cid) {
    if (cid !== undefined && cid !== null) {
      // Discard
      var index = this.unpin.indexOf(cid);
      if (index !== -1) {
        this.unpin.splice(index, 1);
        return false;
      }
      // Add to pin
      if (this.pin.indexOf(cid) === -1) {
        this.pin.push(cid);
        return true;
      }
    }
    return false;
  };

  IpfsController.prototype.requestToUnpin = function (cid, ipnsKey, value) {
    if ($tw.utils.getIpfsUnpin() == false) {
      return;
    }
    const self = this;
    if (ipnsKey !== undefined && ipnsKey !== null) {
      this.resolveUrl(true, true, value)
        .then((data) => {
          var { cid, resolvedUrl } = data;
          if (resolvedUrl !== null && cid !== null && self.addToUnpin(cid)) {
            self.getLogger().info("Request to unpin:" + "\n " + resolvedUrl);
          }
        })
        .catch((error) => {
          self.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        });
    } else if (cid !== undefined && cid !== null && this.addToUnpin(cid)) {
      const normalizedUrl = this.normalizeUrl("/" + ipfsKeyword + "/" + cid);
      this.getLogger().info("Request to unpin:" + "\n " + normalizedUrl);
    }
  };

  IpfsController.prototype.addToUnpin = function (cid) {
    if (cid !== undefined && cid !== null) {
      // Discard
      var index = this.pin.indexOf(cid);
      if (index !== -1) {
        this.pin.splice(index, 1);
        return false;
      }
      // Add to unpin
      if (this.unpin.indexOf(cid) === -1) {
        this.unpin.push(cid);
        return true;
      }
    }
    return false;
  };

  IpfsController.prototype.removeFromPinUnpin = function (cid) {
    if (cid !== undefined && cid !== null) {
      var index = this.pin.indexOf(cid);
      if (index !== -1) {
        this.pin.splice(index, 1);
      }
      var index = this.unpin.indexOf(cid);
      if (index !== -1) {
        this.unpin.splice(index, 1);
      }
    }
    return;
  };

  IpfsController.prototype.pinToIpfs = async function (cid) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.pinToIpfs(ipfs, cid);
  };

  IpfsController.prototype.unpinFromIpfs = async function (cid) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.unpinFromIpfs(ipfs, cid);
  };

  IpfsController.prototype.addToIpfs = async function (content) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.addToIpfs(ipfs, content);
  };

  IpfsController.prototype.generateIpnsKey = async function (ipnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName);
  };

  IpfsController.prototype.removeIpnsKey = async function (ipnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsName);
  };

  IpfsController.prototype.renameIpnsName = async function (oldIpnsName, newIpnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.renameIpnsName(ipfs, oldIpnsName, newIpnsName);
  };

  IpfsController.prototype.decodeCid = function (pathname) {
    return this.ipfsBundle.decodeCid(pathname);
  };

  IpfsController.prototype.getIpnsIdentifiers = async function (identifier, ipnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.getIpnsIdentifiers(ipfs, identifier, ipnsName);
  };

  IpfsController.prototype.resolveIpnsKey = async function (ipnsKey) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
  };

  IpfsController.prototype.publishIpnsName = async function (cid, ipnsKey, ipnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.publishIpnsName(cid, ipfs, ipnsKey, ipnsName);
  };

  IpfsController.prototype.getIpfsBaseUrl = function () {
    return this.ipfsUrl.getIpfsBaseUrl();
  };

  IpfsController.prototype.normalizeUrl = function (value) {
    return this.ipfsUrl.normalizeUrl(value);
  };

  IpfsController.prototype.getDocumentUrl = function () {
    return this.ipfsUrl.getDocumentUrl();
  };

  IpfsController.prototype.getIpfsDefaultApi = function () {
    return this.ipfsUrl.getIpfsDefaultApi();
  };

  IpfsController.prototype.getIpfsDefaultGateway = function () {
    return this.ipfsUrl.getIpfsDefaultGateway();
  };

  IpfsController.prototype.getIpfsApiUrl = function () {
    return this.ipfsUrl.getIpfsApiUrl();
  };

  IpfsController.prototype.getIpfsGatewayUrl = function () {
    return this.ipfsUrl.getIpfsGatewayUrl();
  };

  IpfsController.prototype.resolveUrl = async function (resolveIpns, resolveEns, value) {
    var cid = null;
    var ipnsKey = null;
    var ipnsName = null;
    var normalizedUrl = null;
    var resolvedUrl = null;
    if (value == undefined || value == null || value.toString().trim() === "") {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
        resolvedUrl: null,
      };
    }
    try {
      normalizedUrl = this.normalizeUrl(value);
    } catch (error) {
      // Ignore
    }
    if (normalizedUrl == null) {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
        resolvedUrl: null,
      };
    }
    // Check
    var { cid, ipnsIdentifier, protocol } = this.decodeCid(normalizedUrl.pathname);
    if (protocol !== null && ipnsIdentifier !== null && protocol == ipnsKeyword) {
      cid = null;
      var { ipnsKey, ipnsName, normalizedUrl } = await this.getIpnsIdentifiers(ipnsIdentifier);
      if (resolveIpns) {
        $tw.utils.alert(name, "Resolving IPNS Key: " + ipnsKey);
        cid = await this.resolveIpnsKey(ipnsKey);
        if (cid !== null) {
          resolvedUrl = this.normalizeUrl("/" + ipfsKeyword + "/" + cid);
        }
      }
    } else if (resolveEns && normalizedUrl.hostname.endsWith(".eth")) {
      var { content: cid, resolvedUrl: resolvedUrl } = await this.resolveEns(normalizedUrl.hostname);
    }
    return {
      cid: cid,
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl,
      resolvedUrl: resolvedUrl,
    };
  };

  IpfsController.prototype.getUrl = function (url, base) {
    return this.ipfsUrl.getUrl(url, base ? base : this.getIpfsBaseUrl());
  };

  IpfsController.prototype.isJson = function (content) {
    return this.ipfsBundle.isJson(content);
  };

  IpfsController.prototype.getIpfsClient = async function () {
    // Provider
    const ipfsProvider = $tw.utils.getIpfsProvider();
    // IPFS companion
    if (ipfsProvider === "window") {
      const client = await this.ipfsWrapper.getWindowIpfsClient();
      return {
        ipfs: client.ipfs,
        provider: client.provider,
      };
    }
    // Default, try IPFS companion
    if (ipfsProvider === "default") {
      try {
        const client = await this.ipfsWrapper.getWindowIpfsClient();
        return {
          ipfs: client.ipfs,
          provider: client.provider,
        };
      } catch (error) {
        // Ignore, fallback to HTTP
      }
    }
    // Current API URL
    const url = this.getIpfsApiUrl();
    // Check
    if (url == undefined || url == null || url === "") {
      throw new Error("Undefined IPFS API URL...");
    }
    // HTTP Client
    const client = this.ipfsClients.get(url.href);
    if (client !== undefined) {
      // Log
      this.getLogger().info("Reuse IPFS provider:" + "\n " + client.provider);
      // Done
      return {
        ipfs: client.ipfs,
        provider: client.provider,
      };
    }
    // Build a new HTTP client
    const policy = await this.ipfsWrapper.getHttpIpfsClient(url);
    const ipfs = policy.ipfs;
    const provider = policy.provider;
    // Store
    this.ipfsClients.set(url.href, { ipfs, provider });
    // Log
    this.getLogger().info("New IPFS provider:" + "\n " + policy.provider);
    // Done
    return {
      ipfs: ipfs,
      provider: provider,
    };
  };

  IpfsController.prototype.resolveEns = async function (ensDomain) {
    const { web3 } = await this.getWeb3Provider();
    const { content, protocol } = await this.ensWrapper.getContentHash(ensDomain, web3);
    if (content !== null && protocol !== null) {
      const url = this.normalizeUrl("/" + protocol + "/" + content);
      this.getLogger().info("Successfully fetched ENS domain content:" + "\n " + url + " \n from: " + ensDomain);
      return {
        content: content,
        resolvedUrl: url,
        protocol: protocol,
      };
    }
    return {
      content: null,
      resolvedUrl: null,
      protocol: null,
    };
  };

  IpfsController.prototype.setEns = async function (ensDomain, cid) {
    const { web3, account } = await this.getEnabledWeb3Provider();
    const { cidV0 } = await this.ensWrapper.setContentHash(ensDomain, cid, web3, account);
    if (cidV0 !== null) {
      const url = this.normalizeUrl("/ipfs/" + cidV0);
      this.getLogger().info("Successfully set ENS domain content:" + "\n " + url + " \n to: " + ensDomain);
    }
  };

  IpfsController.prototype.getEthereumProvider = async function () {
    return await this.ensWrapper.getEthereumProvider();
  };

  IpfsController.prototype.getEnabledWeb3Provider = async function () {
    return await this.ensWrapper.getEnabledWeb3Provider();
  };

  IpfsController.prototype.getWeb3Provider = async function () {
    return await this.ensWrapper.getWeb3Provider();
  };

  exports.IpfsController = IpfsController;
})();
