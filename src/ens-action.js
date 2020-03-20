/*\
title: $:/plugins/ipfs/ens-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

EnsAction

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
  const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

  const fileProtocol = "file:";
  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ens-action";

  var EnsAction = function() {
    this.once = false;
    this.ensWrapper = new EnsWrapper();
    this.ipfsWrapper = new IpfsWrapper();
  };

  EnsAction.prototype.getLogger = function() {
    return window.log.getLogger(name);
  };

  EnsAction.prototype.init = function() {
    // Init once
    if (this.once) {
      return;
    }
    const self = this;
    $tw.rootWidget.addEventListener("tm-ens-manager-open", function(event) {
      return self.handleOpenEnsManager(event);
    });
    $tw.rootWidget.addEventListener("tm-ens-resolve-and-open", async function(event) {
      return await self.handleResolveEnsAndOpen(event);
    });
    $tw.rootWidget.addEventListener("tm-ens-publish", async function(event) {
      return await self.handlePublishToEns(event);
    });
    // Init once
    this.once = true;
  };

  EnsAction.prototype.handleOpenEnsManager = function(event) {
    // Retrieve ENS domain
    const ensDomain = $tw.utils.getIpfsEnsDomain();
    // Check
    if (ensDomain == null) {
      window.open("https://app.ens.domains", "_blank", "noopener");
    } else {
      window.open("https://app.ens.domains/name/" + ensDomain, "_blank", "noopener");
    }
    return true;
  };

  EnsAction.prototype.handleResolveEnsAndOpen = async function(event) {
    try {
      // Getting default ENS domain
      const ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        $tw.utils.alert(name, "Undefined ENS domain...");
        return false;
      }

      this.getLogger().info("ENS domain: " + ensDomain);

      const parsed = await $tw.ipfs.resolveENS(ensDomain);
      if (parsed !== null) {
        window.open(parsed.toString(), "_blank", "noopener");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  EnsAction.prototype.handlePublishToEns = async function(event) {
    try {
      // Process document URL
      const wiki = $tw.ipfs.getDocumentUrl();

      // Check
      if (wiki.protocol === fileProtocol) {
        $tw.utils.alert(name, "Undefined IPFS wiki...");
        return false;
      }

      // Extract and check URL IPFS protocol and CID
      var { protocol, cid } = this.ipfsWrapper.decodeCid(wiki.pathname);

      // Check
      if (protocol == null) {
        $tw.utils.alert(name, "Unknown IPFS protocol...");
        return false;
      }
      if (cid == null) {
        $tw.utils.alert(name, "Unknown IPFS identifier...");
        return false;
      }

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve IPNS key if applicable
      if (protocol === ipnsKeyword) {
        const { ipnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      }

      // Getting the default ENS domain
      const ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        $tw.utils.alert(name, "Undefined ENS domain...");
        return false;
      }

      // Retrieve a Web3 provider
      const { web3, account } = await $tw.ipfs.getWeb3Provider();

      // Fetch ENS domain content
      const { content } = await this.ensWrapper.getContenthash(ensDomain, web3);
      // Nothing to publish
      if (content !== null && content === cid) {
        $tw.utils.alert(name, "The current resolved ENS domain content is up to date...");
        return false;
      }

      const parsed = await $tw.ipfs.normalizeIpfsUrl("/" + ipfsKeyword + "/" + cid);
      this.getLogger().info("Publishing wiki:" + "\n " + parsed.href + "\n to ENS domain: " + "https://" + ensDomain);

      await this.ensWrapper.setContenthash(ensDomain, cid, web3, account);

      // Unpin if applicable
      if ($tw.utils.getIpfsUnpin() && content !== null) {
        try {
          await this.ipfsWrapper.unpinFromIpfs(ipfs, content);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  exports.EnsAction = EnsAction;
})();
