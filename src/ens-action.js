/*\
title: $:/plugins/ipfs/ens-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

ENS Action

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const fileProtocol = "file:";
  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ens-action";

  var EnsAction = function (ipfsController) {
    this.once = false;
    this.ipfsController = ipfsController;
  };

  EnsAction.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  EnsAction.prototype.init = function () {
    // Init once
    if (this.once) {
      return;
    }
    const self = this;
    $tw.rootWidget.addEventListener("tm-ens-manager-open", function (event) {
      return self.handleOpenEnsManager(event);
    });
    $tw.rootWidget.addEventListener("tm-ens-resolve-and-open", async function (event) {
      return await self.handleResolveEnsAndOpen(event);
    });
    $tw.rootWidget.addEventListener("tm-ens-publish", async function (event) {
      return await self.handlePublishToEns(event);
    });
    // Init once
    this.once = true;
  };

  EnsAction.prototype.handleOpenEnsManager = function (event) {
    // Retrieve ENS domain
    const ensDomain = $tw.utils.getIpfsEnsDomain();
    // Check
    if (ensDomain == null) {
      window.open("https://app.ens.domains", "_blank", "noopener,noreferrer");
    } else {
      window.open("https://app.ens.domains/name/" + ensDomain, "_blank", "noopener,noreferrer");
    }
    return true;
  };

  EnsAction.prototype.handleResolveEnsAndOpen = async function (event) {
    try {
      // Getting default ENS domain
      const ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        $tw.utils.alert(name, "Undefined ENS domain...");
        return false;
      }

      this.getLogger().info("ENS domain: " + ensDomain);

      const { normalizedUrl } = await this.ipfsController.resolveENS(ensDomain);
      if (normalizedUrl !== null) {
        window.open(normalizedUrl.href, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  EnsAction.prototype.handlePublishToEns = async function (event) {
    try {
      // Process document URL
      const wiki = this.ipfsController.getDocumentUrl();
      // Check
      if (wiki.protocol === fileProtocol) {
        $tw.utils.alert(name, "Undefined IPFS wiki...");
        return false;
      }
      // Extract and check URL IPFS protocol and CID
      var { protocol, cid } = this.ipfsController.decodeCid(wiki.pathname);
      // Check
      if (protocol == null) {
        $tw.utils.alert(name, "Unknown IPFS protocol...");
        return false;
      }
      if (cid == null) {
        $tw.utils.alert(name, "Unknown IPFS identifier...");
        return false;
      }
      // Resolve IPNS key if applicable
      if (protocol === ipnsKeyword) {
        const { ipnsKey } = await this.ipfsController.getIpnsIdentifiers(cid);
        try {
          cid = null;
          cid = await this.resolveIpnsKey(ipnsKey);
        } catch (error) {
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
      // Getting the default ENS domain
      const ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        $tw.utils.alert(name, "Undefined ENS domain...");
        return false;
      }
      // Fetch ENS domain content
      const { content } = await this.ipfsController.resolveEns(ensDomain);
      // Nothing to publish
      if (content !== null && content === cid) {
        $tw.utils.alert(name, "The current resolved ENS domain content is up to date...");
        return false;
      }
      // Assign ENS domain content
      await this.ipfsController.setEns(ensDomain, cid);
      // Unpin if applicable
      if ($tw.utils.getIpfsUnpin() && content !== null) {
        try {
          await this.ipfsController.unpinFromIpfs(content);
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
