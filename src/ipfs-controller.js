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

  IpfsController.prototype.requestToPin = function (cid, ipnsKey, value) {
    const self = this;
    if (ipnsKey !== undefined && ipnsKey !== null) {
      this.resolveUrl(true, value)
        .then((data) => {
          var { cid, normalizedUrl } = data;
          if (normalizedUrl !== null && cid !== undefined && cid !== null && self.addToPin(cid)) {
            self.getLogger().info("Request to Pin:" + "\n " + normalizedUrl);
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
      this.resolveUrl(true, value)
        .then((data) => {
          var { cid, normalizedUrl } = data;
          if (normalizedUrl !== null && cid !== undefined && cid !== null && self.addToUnpin(cid)) {
            self.getLogger().info("Request to unpin:" + "\n " + normalizedUrl);
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

  IpfsController.prototype.importTiddlers = async function (url) {
    // Process
    var cid = null;
    var importedTiddlers = null;
    var normalizedUrl = null;
    try {
      if (url !== undefined && url !== null) {
        var { cid, normalizedUrl } = await this.resolveUrl(true, url);
        // Retrieve cached immutable imported Tiddlers
        if (cid !== null) {
          importedTiddlers = this.importedTiddlers.get(cid);
        }
        if (importedTiddlers !== undefined && importedTiddlers !== null) {
          this.getLogger().info("Retrieve cached imported Tiddler(s):" + "\n " + normalizedUrl.href);
          // Done
          return {
            cid,
            importedTiddlers: importedTiddlers,
            normalizedUrl: normalizedUrl,
          };
        }
        // Load
        const content = await $tw.utils.loadToUtf8(normalizedUrl);
        if (this.isJSON(content.data)) {
          importedTiddlers = $tw.wiki.deserializeTiddlers(".json", content.data, $tw.wiki.getCreationFields());
        } else {
          importedTiddlers = $tw.wiki.deserializeTiddlers(".tid", content.data, $tw.wiki.getCreationFields());
        }
        // Check
        if (importedTiddlers == undefined || importedTiddlers == null) {
          return {
            cid,
            importedTiddlers: null,
            normalizedUrl: normalizedUrl,
          };
        }
        // Cache immutable imported Tiddlers
        if (cid != null) {
          this.importedTiddlers.set(cid, importedTiddlers);
          this.getLogger().info("Caching imported Tiddler(s):" + "\n " + normalizedUrl.href);
        }
      }
    } catch (error) {
      // Log and continue
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    }
    return {
      cid,
      importedTiddlers: importedTiddlers,
      normalizedUrl: normalizedUrl,
    };
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

  IpfsController.prototype.resolveUrl = async function (resolveIpns, value) {
    var cid = null;
    var ipnsKey = null;
    var ipnsName = null;
    var normalizedUrl = null;
    if (value == undefined || value == null) {
      return {
        cid: null,
        ipnsKey: null,
        ipnsName: null,
        normalizedUrl: null,
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
      };
    }
    // Check
    var { cid, ipnsIdentifier, protocol } = this.decodeCid(normalizedUrl.pathname);
    if (protocol !== null) {
      if (protocol == ipnsKeyword) {
        if (ipnsIdentifier !== null) {
          var { ipnsKey, ipnsName, normalizedUrl } = await this.getIpnsIdentifiers(ipnsIdentifier);
          if (resolveIpns && ipnsKey !== null) {
            const msg = "Resolving IPNS name: " + ipnsName;
            this.getLogger().info(msg);
            $tw.utils.alert(name, msg);
            cid = await this.resolveIpnsKey(ipnsKey);
          }
        }
      }
      if (cid == null && ipnsKey == null && ipnsName == null) {
        normalizedUrl = null;
      }
    } else if (normalizedUrl.hostname.endsWith(".eth")) {
      var { content: cid, normalizedUrl } = await this.resolveEns(normalizedUrl.hostname);
    }
    return {
      cid: cid,
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl,
    };
  };

  IpfsController.prototype.getUrl = function (url, base) {
    return this.ipfsUrl.getUrl(url, base ? base : this.getIpfsBaseUrl());
  };

  IpfsController.prototype.isJSON = function (content) {
    if (content !== undefined && content !== null && typeof content === "string") {
      try {
        JSON.parse(content);
        return true;
      } catch (error) {
        // Ignore
      }
    }
    return false;
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
    if (url == undefined || url == null || url.href === "") {
      throw new Error("Undefined IPFS API URL...");
    }
    // HTTP Client
    const client = this.ipfsClients.get(url.href);
    if (client !== undefined && client !== null) {
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
      this.getLogger().info("Successfully fetched ENS domain content:" + "\n " + url + "\n from: " + ensDomain);
      return {
        content: content,
        normalizedUrl: url,
        protocol: protocol,
      };
    }
    return {
      content: null,
      normalizedUrl: null,
      protocol: null,
    };
  };

  IpfsController.prototype.setEns = async function (ensDomain, cid) {
    const { web3, account } = await this.getEnabledWeb3Provider();
    const { cidV0 } = await this.ensWrapper.setContentHash(ensDomain, cid, web3, account);
    if (cidV0 !== null) {
      const url = this.normalizeUrl("/ipfs/" + cidV0);
      this.getLogger().info("Successfully set ENS domain content:" + "\n " + url.href + "\n to: " + ensDomain);
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
