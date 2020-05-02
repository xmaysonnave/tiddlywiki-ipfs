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

  const name = "ipfs-controller";

  var IpfsController = function () {
    this.web3 = null;
    this.chainId = null;
    this.account = null;
    this.ethereum = null;
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

  IpfsController.prototype.requestToUnpin = async function (cid) {
    if (cid !== undefined && cid !== null && this.addToUnpin(cid)) {
      const url = await this.normalizeIpfsUrl("/" + ipfsKeyword + "/" + cid);
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

  IpfsController.prototype.getIpnsIdentifiers = async function (ipnsKey, ipnsName) {
    const { ipfs } = await this.getIpfsClient();
    return await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
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

  IpfsController.prototype.discardRequestToUnpin = async function (cid) {
    if (cid !== undefined && cid !== null && this.removeFromUnpin(cid)) {
      const url = await this.normalizeIpfsUrl("/" + ipfsKeyword + "/" + cid);
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
        var { cid, normalizedUrl } = await this.resolveUrl(false, url);
        // Retrieve cached immutable imported Tiddlers
        if (cid !== null) {
          importedTiddlers = this.importedTiddlers.get(cid);
          if (importedTiddlers !== undefined && importedTiddlers !== null) {
            this.getLogger().info("Retrieve cached imported Tiddler(s):" + "\n " + normalizedUrl.href);
            // Done
            return {
              cid,
              importedTiddlers: importedTiddlers,
              normalizedUrl: normalizedUrl,
            };
          }
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
            cid: cid, // IPFS cid
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
      cid: cid, // IPFS cid
      importedTiddlers: importedTiddlers,
      normalizedUrl: normalizedUrl,
    };
  };

  IpfsController.prototype.getIpfsBaseUrl = function () {
    return this.ipfsUrl.getIpfsBaseUrl();
  };

  IpfsController.prototype.normalizeIpfsUrl = async function (url) {
    return await this.ipfsUrl.normalizeUrl(url, this.getIpfsBaseUrl());
  };

  IpfsController.prototype.getDocumentUrl = function () {
    return this.ipfsUrl.getDocumentUrl();
  };

  IpfsController.prototype.getIpfsApiUrl = function () {
    return this.ipfsUrl.getIpfsApiUrl();
  };

  IpfsController.prototype.getIpfsGatewayUrl = function () {
    return this.ipfsUrl.getIpfsGatewayUrl();
  };

  IpfsController.prototype.resolveUrl = async function (resolveIpns, value) {
    return await this.ipfsUrl.resolveUrl(resolveIpns, value);
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

  IpfsController.prototype.getContentHash = async function (domain, web3) {
    return await this.ensWrapper.getContentHash(domain, web3);
  };

  IpfsController.prototype.setContentHash = async function (domain, cid, web3, account) {
    await this.ensWrapper.setContentHash(domain, cid, web3, account);
  };

  IpfsController.prototype.getEthereumProvider = async function () {
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

  IpfsController.prototype.networkChanged = function (chainId) {
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

  IpfsController.prototype.accountChanged = async function (accounts) {
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

  IpfsController.prototype.closeProvider = function (code, reason) {
    this.web3 = null;
    this.chainId = null;
    this.account = null;
    this.getLogger().info("Closing Ethereum provider:" + "\n " + "Reason: " + reason + "\n " + "Code: " + code);
  };

  IpfsController.prototype.getEnabledWeb3Provider = async function () {
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
      account: this.account,
    };
  };

  IpfsController.prototype.getWeb3Provider = async function () {
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
      chainId: this.chainId,
    };
  };

  IpfsController.prototype.resolveENS = async function (ensDomain) {
    // Retrieve a Web3 provider
    const { web3 } = await this.getWeb3Provider();
    // Fetch ENS domain content
    const { content, protocol } = await this.ensWrapper.getContentHash(ensDomain, web3);
    if (content !== null && protocol !== null) {
      const url = await this.normalizeIpfsUrl("/" + protocol + "/" + content);
      return url;
    }
    // Empty content
    return null;
  };

  exports.IpfsController = IpfsController;
})();
