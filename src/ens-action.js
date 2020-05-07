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
  const ipnsKeyword = "ipns";

  const name = "ens-action";

  var EnsAction = function () {
    this.once = false;
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
    const ensDomain = $tw.utils.getIpfsEnsDomain();
    if (ensDomain == null) {
      $tw.utils.alert(name, "Undefined ENS domain...");
      return false;
    }
    try {
      this.getLogger().info("ENS domain: " + ensDomain);
      const { normalizedUrl } = await $tw.ipfs.resolveEns(ensDomain);
      if (normalizedUrl !== null) {
        window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    return true;
  };

  EnsAction.prototype.handlePublishToEns = async function (event) {
    const self = this;
    const wiki = $tw.ipfs.getDocumentUrl();
    if (wiki.protocol === fileProtocol) {
      $tw.utils.alert(name, "Undefined IPFS identifier...");
      return false;
    }
    if (wiki.pathname === "/") {
      $tw.utils.alert(name, "Unknown IPFS identifier...");
      return false;
    }
    var cid = null;
    var ensCid = null;
    var ipnsKey = null;
    try {
      var { cid, ipnsKey } = await $tw.ipfs.resolveUrl(false, wiki);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    const ensDomain = $tw.utils.getIpfsEnsDomain();
    if (ensDomain == null) {
      $tw.utils.alert(name, "Undefined ENS domain...");
      return false;
    }
    try {
      var { cid: ensCid } = await $tw.ipfs.resolveUrl(ensDomain);
      if (ensCid !== null && ensCid === cid) {
        $tw.utils.alert(name, "The current resolved ENS domain content is up to date...");
        return false;
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    if (cid !== null) {
      $tw.ipfs
        .requestToUnpin(ensCid)
        .then(() => {
          const msg = "Publishing to ENS: " + ensDomain;
          self.getLogger().info(msg);
          $tw.utils.alert(name, msg);
          $tw.ipfs
            .setEns(ensDomain, cid)
            .then(() => {
              $tw.utils.alert(name, "Successfully Published to ENS...");
            })
            .catch((error) => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        })
        .catch((error) => {
          self.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        });
    } else if (ipnsKey !== null) {
      $tw.ipfs
        .resolveUrl(true, wiki)
        .then((data) => {
          const { cid: ipnsCid } = data;
          $tw.ipfs
            .requestToUnpin(ensCid)
            .then(() => {
              const msg = "Publishing to ENS: " + ensDomain;
              self.getLogger().info(msg);
              $tw.utils.alert(name, msg);
              $tw.ipfs
                .setEns(ensDomain, ipnsCid)
                .then(() => {
                  $tw.utils.alert(name, "Successfully Published to ENS...");
                })
                .catch((error) => {
                  self.getLogger().error(error);
                  $tw.utils.alert(name, error.message);
                });
            })
            .catch((error) => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        })
        .catch((error) => {
          self.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        });
    }
    return true;
  };

  exports.EnsAction = EnsAction;
})();
