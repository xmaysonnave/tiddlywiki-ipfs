/*\
title: $:/plugins/ipfs/ipfs-saver.js
type: application/javascript
tags: $:/ipfs/core
module-type: saver

IpfsSaver

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const log = require("$:/plugins/ipfs/loglevel/loglevel.js");

const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const fileProtocol = "file:";
const ensKeyword = "ens";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

const name = "ipfs-saver";

/*
 * Select the appropriate saver module and set it up
 */
var IpfsSaver = function(wiki) {
  this.wiki = wiki;
  this.apiUrl = null;
  this.ipfsProvider = null;
  this.ensWrapper = new EnsWrapper();
  this.ipfsWrapper = new IpfsWrapper();
  // ipfs-saver starts before ipfs-startup
  // loglevel is initialized here
  if (window.log == undefined || window.log == null) {
    window.log = log;
    if ($tw.utils.getIpfsVerbose()) {
      log.setLevel("info", false);
    } else {
      log.setLevel("warn", false);
    }
  }
  const logger = window.log.getLogger(name);
  logger.info(
    "ipfs-saver is starting with priority: "
    + $tw.utils.getIpfsPriority()
  );
}

IpfsSaver.prototype.getLogger = function() {
  return window.log.getLogger(name);
}

IpfsSaver.prototype.save = async function(text, method, callback, options) {

  // Is there anything to do
  if ($tw.saverHandler.isDirty() == false) {
    return false;
  }

  try {

    // Init
    var ipfsProtocol = null;
    var ipnsKey = null;
    var ipnsName = null;
    var ipnsContent = null;
    var cid = null;
    var ensDomain = null;
    var ensContent = null;
    var web3Provider = null;
    var account = null;
    var unpin = [];
    var options = options || {};

    // Process document URL
    const wiki = $tw.ipfs.getDocumentUrl();

    // Retrieve Gateway URL
    const gateway = $tw.ipfs.getIpfsGatewayUrl();

    // Next
    const nextWiki = $tw.ipfs.getUrl(wiki);
    nextWiki.protocol = gateway.protocol;
    nextWiki.hostname = gateway.hostname;
    nextWiki.port = gateway.port;

    // IPFS client
    const { ipfs } = await $tw.ipfs.getIpfsClient();

    // URL Analysis
    if (wiki.protocol !== fileProtocol) {
      // Decode pathname
      var { protocol, cid } = this.ipfsWrapper.decodeCid(wiki.pathname);
      // Check
      if (protocol != null && cid != null) {
        // Store current protocol
        ipfsProtocol = protocol;
        // Request to unpin if applicable
        if ($tw.utils.getIpfsUnpin()
          && ipfsProtocol === ipfsKeyword
          && window.unpin.indexOf(cid) == -1
        ) {
          unpin.push(cid);
          this.getLogger().info(
            "Request to unpin IPFS wiki:"
            + "\n "
            + "/"
            + ipfsKeyword
            + "/"
            + cid
          );
        }
      }
    }

    // IPNS Analysis
    if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {

      // Resolve current IPNS
      if (ipfsProtocol === ipnsKeyword) {
        this.getLogger().info("Processing current IPNS key...");
        try {
          var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
          ipnsContent = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
        } catch (error) {
          // Log and continue
          if (ipnsName == null || ipnsKey == null) {
            this.getLogger().error(error);
          } else {
            this.getLogger().warn(error);
          }
          $tw.utils.alert(name, error.message);
          // Fallback to default
          if (ipnsName === null && ipnsKey === null && $tw.utils.getIpfsProtocol() === ipnsKeyword) {
            ipnsName = $tw.utils.getIpfsIpnsName();
            ipnsKey = $tw.utils.getIpfsIpnsKey();
            this.getLogger().info("Processing default IPNS...");
            var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
            try {
              ipnsContent = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
            } catch (error) {
              // Log and continue
              this.getLogger().warn(error);
              $tw.utils.alert(name, error.message);
            }
          }
        }
      // Resolve default IPNS
      } else {
        ipnsName = $tw.utils.getIpfsIpnsName();
        ipnsKey = $tw.utils.getIpfsIpnsKey();
        this.getLogger().info("Processing default IPNS name and IPNS key...");
        var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
        try {
          ipnsContent = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }

      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && ipnsContent !== null
        && window.unpin.indexOf(ipnsContent) == -1
      ) {
        unpin.push(ipnsContent);
        this.getLogger().info(
          "Request to unpin IPNS wiki:"
          + "\n "
          + "/"
          + ipfsKeyword
          + "/"
          + ipnsContent
        );
      }

    }

    // ENS Analysis
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      // Getting default ens domain
      ensDomain = $tw.utils.getIpfsEnsDomain();
      // Check
      if (ensDomain == null) {
        callback("Undefined ENS domain...");
        return false;
      }
      // Retrieve a Web3 provider
      var { web3Provider, account } = await this.ensWrapper.getWeb3Provider();
      // Fetch ENS domain content
      const { content } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && content !== null
        && window.unpin.indexOf(content) == -1
      ) {
        unpin.push(ensContent);
        this.getLogger().info(
          "Request to unpin ENS domain content:"
          + "\n "
          + "/"
          + ipfsKeyword
          + "/"
          + content
        );
      }
    }

    // Upload  current document
    this.getLogger().info(
      "Uploading wiki: "
      + text.length
      + " bytes"
    );

    // Add
    const { added } = await this.ipfsWrapper.addToIpfs(ipfs, text);

    // Default next
    nextWiki.pathname = "/"
      + ipfsKeyword
      + "/"
      + added;

    // Pin, if failure log and continue
    try {
      await this.ipfsWrapper.pinToIpfs(ipfs, added);
    } catch (error)  {
      this.getLogger().warn(error);
      $tw.utils.alert(name, error.message);
    }

    // Publish to IPNS
    if (ipnsName !== null && (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword)) {
      this.getLogger().info(
        "Publishing IPNS wiki: "
        + ipnsName
      );
      try {
        await this.ipfsWrapper.publishToIpns(ipfs, ipnsName, added);
        // IPNS next
        nextWiki.pathname = "/"
        + ipnsKeyword
        + "/"
        + ipnsKey;
      } catch (error)  {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
        // Remove from unpin
        if (ipfsProtocol === ipnsKeyword) {
          // Discard unpin
          var index = window.unpin.indexOf(ipnsContent);
          if (index !== -1) {
            window.unpin.splice(index, 1);
          } else {
            index = unpin.indexOf(ipnsContent);
            if (index !== -1) {
              unpin.splice(index, 1);
            }
          }
          // Log
          if (index !== -1) {
            this.getLogger().info(
              "Discard request to unpin IPNS wiki:"
              + "\n "
              + "/"
              + ipfsKeyword
              + "/"
              + ipnsContent
            );
          }
        }
      }
    }

    // Publish to ENS
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      this.getLogger().info(
        "Publishing ENS wiki: "
        + ensDomain
      );
      try {
        await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
        // ENS next
        nextWiki.protocol = "https:"
        nextWiki.host = ensDomain;
      } catch (error)  {
        // Log and continue
        this.getLogger().error(error);
        $tw.utils.alert(name, error.message);
        // Discard unpin
        var index = window.unpin.indexOf(ensContent);
        if (index !== -1) {
          window.unpin.splice(index, 1);
        } else {
          index = unpin.indexOf(ensContent);
          if (index !== -1) {
            unpin.splice(index, 1);
          }
        }
        // Log
        if (index !== -1) {
          this.getLogger().info(
            "Discard request to unpin ENS domain content:"
            + "\n "
            + "/"
            + ipfsKeyword
            + "/"
            + ensContent
          );
        }
      }
    }

    // Unpin
    if ($tw.utils.getIpfsUnpin()) {
      // Process global unpin
      for (var i = 0; i < window.unpin.length; i++) {
        try {
          await this.ipfsWrapper.unpinFromIpfs(ipfs, window.unpin[i]);
        } catch (error)  {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
      window.unpin = [];
      // Process local unpin
      for (var i = 0; i < unpin.length; i++) {
        try {
          await this.ipfsWrapper.unpinFromIpfs(ipfs, unpin[i]);
        } catch (error)  {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
      unpin = [];
    }

    // Done
    callback(null);

    // Next
    if (nextWiki.href !== wiki.href) {
      window.location.assign(nextWiki.href);
    }

  } catch (error) {
    this.getLogger().error(error);
    callback(error.message);
    return false;
  }

  return true;

};

/*
 * Information about this saver
 */
IpfsSaver.prototype.info = {
  name: "ipfs",
  priority: 3000,
  capabilities: ["save"]
};

/*
 * Static method that returns true if this saver is capable of working
 */
exports.canSave = function(wiki) {
  return true;
};

/*
 * Create an instance of this saver
 */
exports.create = function(wiki) {
  return new IpfsSaver(wiki);
};

})();
