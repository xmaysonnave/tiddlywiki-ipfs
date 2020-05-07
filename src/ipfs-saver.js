/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: saver

IPFS Saver

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const log = require("$:/plugins/ipfs/loglevel/loglevel.js");

  const EnsAction = require("$:/plugins/ipfs/ens-action.js").EnsAction;
  const IpfsAction = require("$:/plugins/ipfs/ipfs-action.js").IpfsAction;
  const IpfsController = require("$:/plugins/ipfs/ipfs-controller.js").IpfsController;
  const IpfsTiddler = require("$:/plugins/ipfs/ipfs-tiddler.js").IpfsTiddler;

  const ensKeyword = "ens";
  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-saver";

  /*
   * Select the appropriate saver module and set it up
   */
  var IpfsSaver = function (wiki) {
    this.wiki = wiki;
    this.apiUrl = null;
    this.ipfsProvider = null;
    // Loglevel
    if (window.log == undefined || window.log == null) {
      // Init
      window.log = log;
      if ($tw.utils.getIpfsVerbose()) {
        log.setLevel("info", false);
      } else {
        log.setLevel("warn", false);
      }
    }
    // Controller
    $tw.ipfs = new IpfsController();
    // Listener
    this.ensAction = new EnsAction();
    this.ipfsAction = new IpfsAction();
    this.ipfsTiddler = new IpfsTiddler();
    // Init
    this.ensAction.init();
    this.ipfsAction.init();
    this.ipfsTiddler.init();
    // Logger
    const logger = window.log.getLogger(name);
    // Log
    logger.info("ipfs-saver is starting up...");
    // Log url policy
    const base = $tw.ipfs.getIpfsBaseUrl();
    if ($tw.utils.getIpfsUrlPolicy() === "origin") {
      logger.info("Origin base URL:" + "\n " + base);
    } else {
      logger.info("Gateway base URL:" + "\n " + base);
    }
  };

  IpfsSaver.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsSaver.prototype.save = async function (text, method, callback, options) {
    // Is there anything to do
    if ($tw.saverHandler.isDirty() == false) {
      return false;
    }

    try {
      // Init
      var cid = null;
      var ipnsCid = null;
      var ipnsKey = null;
      var ipnsName = null;
      var ensDomain = null;
      var ensCid = null;
      var options = options || {};
      // Process document URL
      const wiki = $tw.ipfs.getDocumentUrl();
      // Retrieve base URL
      const base = $tw.ipfs.getIpfsBaseUrl();
      // Next
      const nextWiki = $tw.ipfs.getUrl(wiki);
      nextWiki.protocol = base.protocol;
      nextWiki.hostname = base.hostname;
      nextWiki.port = base.port;
      try {
        var { cid, ipnsKey, ipnsName } = await $tw.ipfs.resolveUrl(false, wiki);
        if (cid != null) {
          $tw.ipfs.requestToUnpin(cid);
        }
      } catch (error) {
        this.getLogger().error(error);
        callback(error.message);
        return true;
      }
      // IPNS
      if (ipnsKey !== null || $tw.utils.getIpfsProtocol() === ipnsKeyword) {
        // Resolve current IPNS
        if (ipnsKey !== null) {
          try {
            var { cid: ipnsCid, ipnsName } = await $tw.ipfs.resolveUrl(true, wiki);
            if (ipnsCid != null) {
              $tw.ipfs.requestToUnpin(ipnsCid);
            }
          } catch (error) {
            this.getLogger().warn(error);
            $tw.utils.alert(name, error.message);
          }
        } else {
          // Resolve default IPNS
          ipnsKey = $tw.utils.getIpfsIpnsKey();
          ipnsName = $tw.utils.getIpfsIpnsName();
          if ((ipnsKey == undefined || ipnsKey == null) && (ipnsName == undefined || ipnsName == null)) {
            this.getLogger().info("Unknown default IPNS identifiers...");
          }
          this.getLogger().info("Processing default IPNS identifiers...");
          var identifier = ipnsKey;
          if (identifier == undefined || identifier == null) {
            identifier = ipnsName;
          }
          try {
            var { cid: ipnsCid, ipnsKey, ipnsName } = await $tw.ipfs.resolveUrl(
              true,
              "/" + ipnsKeyword + "/" + identifier
            );
            if (ipnsCid != null) {
              $tw.ipfs.requestToUnpin(ipnsCid);
            }
          } catch (error) {
            this.getLogger().warn(error);
            $tw.utils.alert(name, error.message);
          }
        }
      }
      // ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        ensDomain = $tw.utils.getIpfsEnsDomain();
        if (ensDomain == null) {
          callback("Undefined ENS domain...");
          return true;
        }
        var { cid: ensCid } = await $tw.ipfs.resolveUrl(false, ensDomain);
        if (ensCid != null) {
          $tw.ipfs.requestToUnpin(ensCid);
        }
      }
      // Upload  current document
      this.getLogger().info("Uploading wiki: " + text.length + " bytes");
      // Add
      const { added } = await $tw.ipfs.addToIpfs(text);
      // Default next
      nextWiki.pathname = "/" + ipfsKeyword + "/" + added;
      // Pin
      try {
        await $tw.ipfs.pinToIpfs(added);
      } catch (error) {
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }
      // Publish to IPNS
      if (ipnsKey !== null) {
        const msg = "Publishing IPNS name: " + ipnsName;
        this.getLogger().info(msg);
        $tw.utils.alert(name, msg);
        try {
          await $tw.ipfs.publishIpnsName(added, ipnsKey, ipnsName);
          nextWiki.pathname = "/" + ipnsKeyword + "/" + ipnsKey;
        } catch (error) {
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
          $tw.ipfs.requestToPin(ipnsCid);
        }
      }
      // Publish to ENS
      if ($tw.utils.getIpfsProtocol() === ensKeyword) {
        try {
          await $tw.ipfs.setEns(ensDomain, added);
          nextWiki.protocol = "https:";
          nextWiki.host = ensDomain;
        } catch (error) {
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
      $tw.ipfs.pin = [];
      // Unpin
      if ($tw.utils.getIpfsUnpin()) {
        for (var i in $tw.ipfs.unpin) {
          try {
            const unpin = $tw.ipfs.unpin[i];
            await $tw.ipfs.unpinFromIpfs(unpin);
          } catch (error) {
            this.getLogger().warn(error);
            $tw.utils.alert(name, error.message);
          }
        }
      }
      $tw.ipfs.unpin = [];
      // Pin
      for (var i in $tw.ipfs.pin) {
        try {
          const pin = $tw.ipfs.pin[i];
          await $tw.ipfs.pinToIpfs(pin);
        } catch (error) {
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
      // Done
      callback(null);
      // Next
      if (nextWiki.href !== wiki.href) {
        window.location.assign(nextWiki);
      }
    } catch (error) {
      this.getLogger().error(error);
      callback(error.message);
    }
    return true;
  };

  /*
   * Information about this saver
   */
  IpfsSaver.prototype.info = {
    name: "Ipfs",
    priority: 3100,
    capabilities: ["save"],
  };

  /*
   * Static method that returns true if this saver is capable of working
   */
  exports.canSave = function (wiki) {
    return true;
  };

  /*
   * Create an instance of this saver
   */
  exports.create = function (wiki) {
    return new IpfsSaver(wiki);
  };
})();
