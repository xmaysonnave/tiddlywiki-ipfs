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
    this.unpin = [];
  };

  IpfsController.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsController.prototype.requestToUnpin = function (cid) {
    if (cid !== undefined && cid !== null && this.addToUnpin(cid)) {
      const url = this.normalizeUrl("/" + ipfsKeyword + "/" + cid);
      this.getLogger().info("Request to unpin:" + "\n " + url.href);
    }
  };

  IpfsController.prototype.addToUnpin = function (cid) {
    if (cid !== undefined && cid !== null) {
      if (this.unpin.indexOf(cid) === -1) {
        this.unpin.push(cid);
        return true;
      }
    }
    return false;
  };

  IpfsController.prototype.exportTiddler = async function (tiddler, child) {
    return await this.ipfsWrapper.exportTiddler(tiddler, child);
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
    return this.ipfsWrapper.decodeCid(pathname);
  };

  IpfsController.prototype.getIpnsIdentifiers = async function (identifier, ipnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.getIpnsIdentifiers(ipfs, identifier, ipnsName);
  };

  IpfsController.prototype.resolveIpnsKey = async function (ipnsKey) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
  };

  IpfsController.prototype.publishToIpns = async function (ipnsKey, ipnsName, cid) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.publishToIpns(ipfs, ipnsKey, ipnsName, cid);
  };

  IpfsController.prototype.getAttachmentContent = function (tiddler) {
    return this.ipfsWrapper.getAttachmentContent(tiddler);
  };

  IpfsController.prototype.getContentType = function (tiddler) {
    // Check
    if (tiddler == undefined || tiddler == null) {
      throw new Error("Unknown Tiddler...");
    }
    // Type
    var type = tiddler.fields["type"];
    // Default
    if (type == undefined || type == null) {
      type = "text/vnd.tiddlywiki";
    }
    // Content-Type
    var info = $tw.config.contentTypeInfo[type];
    // Check
    if (info == undefined || info == null) {
      const url = this.getDocumentUrl();
      url.hash = tiddler.fields.title;
      $tw.utils.alert(
        name,
        "Unknown Content-Type: '" +
          type +
          "', default to: 'text/vnd.tiddlywiki', <a href='" +
          url +
          "'>" +
          tiddler.fields.title +
          "</a>"
      );
      // Default
      type = "text/vnd.tiddlywiki";
      info = $tw.config.contentTypeInfo[type];
    }
    return {
      type: type,
      info: info,
    };
  };

  IpfsController.prototype.discardRequestToUnpin = function (cid) {
    if (cid !== undefined && cid !== null && this.removeFromUnpin(cid)) {
      const url = this.normalizeUrl("/" + ipfsKeyword + "/" + cid);
      this.getLogger().info("Discard request to unpin:" + "\n " + url.href);
    }
  };

  IpfsController.prototype.removeFromUnpin = function (cid) {
    if (cid !== undefined && cid !== null) {
      var index = this.unpin.indexOf(cid);
      if (index !== -1) {
        this.unpin.splice(index, 1);
        return true;
      }
    }
    return false;
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
    var normalizedUrl = null;
    var text = false;
    // Check
    if (value == undefined || value == null) {
      return {
        cid: null,
        ipnsKey: null,
        normalizedUrl: null,
      };
    }
    // Text or ENS
    try {
      this.ipfsUrl.getUrl(value);
    } catch (error) {
      // Text
      if (value.startsWith("/") === false) {
        text = true;
      }
      // ENS
      try {
        normalizedUrl = this.normalizeUrl("https://" + value);
        if (normalizedUrl.hostname.endsWith(".eth")) {
          text = false;
        }
      } catch (error) {
        // ignore
      }
    }
    // Check
    if (text == true) {
      return {
        cid: null,
        ipnsKey: null,
        normalizedUrl: null,
      };
    }
    // Resolve
    if (normalizedUrl == null) {
      normalizedUrl = this.normalizeUrl(value);
    }
    // Check
    if (normalizedUrl == null) {
      return {
        cid: null,
        ipnsKey: null,
        normalizedUrl: null,
      };
    }
    var { cid, ipnsIdentifier, protocol } = this.decodeCid(normalizedUrl.pathname);
    if (protocol !== null) {
      if (protocol == ipnsKeyword) {
        if (ipnsIdentifier !== null) {
          var { ipnsKey, normalizedUrl } = await this.getIpnsIdentifiers(ipnsIdentifier);
          if (resolveIpns && ipnsKey !== null) {
            cid = await this.resolveIpnsKey(ipnsKey);
          }
        }
      }
      if (cid == null) {
        normalizedUrl = null;
      }
    } else if (normalizedUrl.hostname.endsWith(".eth")) {
      var { content: cid, normalizedUrl } = await this.resolveEns(normalizedUrl.hostname);
    }
    return {
      cid: cid,
      ipnsKey: ipnsKey,
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
      this.getLogger().info("Successfully fetched ENS domain content:" + "\n " + url.href + "\n from: " + ensDomain);
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
    const { web3, account } = await this.ipfsController.getEnabledWeb3Provider();
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
