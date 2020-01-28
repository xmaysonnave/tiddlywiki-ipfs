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

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ensKeyword = "ens";
const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

/*
 * Select the appropriate saver module and set it up
 */
var IpfsSaver = function(wiki) {
  this.wiki = wiki;
  this.apiUrl = null;
  this.ipfsProvider = null;
  this.ipfsWrapper = new IpfsWrapper();
  this.ensWrapper = new EnsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  this.logger = new $tw.utils.Logger("ipfs-saver");
}

IpfsSaver.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
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
    var ipfs = null;
    var nextWiki = null;
    var unpin = [];
    var options = options || {};

    // Process document URL
    const {
      protocol: wikiProtocol,
      pathname: wikiPathname,
      search: wikiSearch,
      fragment: wikiFragment
    } = this.ipfsLibrary.parseUrl(document.URL);

    // Retrieve Gateway URL
    const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
    // Check
    if (gatewayUrl == null) {
      callback("Undefined IPFS Gateway URL...");
      return false;
    }

    // Process Gateway URL
    const {
      protocol: gatewayProtocol,
      host: gatewayHost
    } = this.ipfsLibrary.parseUrl(gatewayUrl);

    // Next host
    const nextHost = gatewayProtocol
    + "//"
    + gatewayHost

    // URL Analysis
    if (wikiProtocol !== fileProtocol) {
      // Decode pathname
      var { protocol, cid } = this.ipfsLibrary.decodeCid(wikiPathname);
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
          if (this.isVerbose()) this.logger.info(
            "Request to unpin IPFS wiki: /"
            + ipfsKeyword
            + "/"
            + cid
          );
        }
      }
    }

    // IPFS client
    var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
    if (error != null)  {
      callback(error.message);
      return false;
    }

    // IPNS Analysis
    if (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword) {

      // Resolve current IPNS
      if (ipfsProtocol === ipnsKeyword) {
        if (this.isVerbose()) this.logger.info("Processing current IPNS key...");
        var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
        if (error != null)  {
          // Log and continue
          this.logger.error(error.message);
          // Fallback
          if (ipnsName === null && ipnsKey === null && $tw.utils.getIpfsProtocol() === ipnsKeyword) {
            ipnsName = $tw.utils.getIpfsIpnsName();
            ipnsKey = $tw.utils.getIpfsIpnsKey();
            if (this.isVerbose()) this.logger.info("Processing default IPNS...");
            var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
            if (error != null) {
              if (ipnsName !== null && ipnsKey !== null) {
                this.logger.alert(error.message);
              } else {
                // Unable to resolve default
                callback(error.message);
                return false;
              }
            }
          }
        }
      // Resolve default IPNS
      } else {
        ipnsName = $tw.utils.getIpfsIpnsName();
        ipnsKey = $tw.utils.getIpfsIpnsKey();
        if (this.isVerbose()) this.logger.info("Processing default IPNS name and IPNS key...");
        var { error, ipnsName, ipnsKey, resolved: ipnsContent } = await this.ipfsWrapper.resolveIpns(ipfs, ipnsKey, ipnsName);
        if (error != null) {
          if (ipnsName !== null && ipnsKey !== null) {
            this.logger.error(error.message);
          } else {
            // Unable to resolve default
            callback(error.message);
            return false;
          }
        }
      }

      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && ipnsContent !== null
        && window.unpin.indexOf(ipnsContent) == -1
      ) {
        unpin.push(ipnsContent);
        if (this.isVerbose()) this.logger.info(
          "Request to unpin IPNS wiki: /"
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
        callback("Undefined ENS wiki...");
        return false;
      }

      // Retrieve a Web3 provider
      var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
      if (error != null)  {
        callback(error.message);
        return false;
      }

      // Fetch ENS domain content
      var { error, decoded: ensContent } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
      if (error != null)  {
        callback(error.message);
        return false;
      }

      // Store to unpin previous if any
      if (
        $tw.utils.getIpfsUnpin()
        && ensContent !== null
        && window.unpin.indexOf(ensContent) == -1
      ) {
        unpin.push(ensContent);
        if (this.isVerbose()) this.logger.info(
          "Request to unpin ENS wiki: /"
          + ipfsKeyword
          + "/"
          + ensContent
        );
      }

    }

    // Upload  current document
    if (this.isVerbose()) this.logger.info(
      "Uploading wiki: "
      + text.length
      + " bytes"
    );

    // Add
    var { error, added } = await this.ipfsWrapper.addToIpfs(ipfs, text);
    if (error != null)  {
      callback(error.message);
      return false;
    }

    // Default next
    nextWiki = nextHost
      + "/"
      + ipfsKeyword
      + "/"
      + added
      + `/${wikiSearch || ''}${wikiFragment || ''}`;

    // Pin, if failure log and continue
    var { error } = await this.ipfsWrapper.pinToIpfs(ipfs, added);
    if (error != null)  {
      this.logger.alert(error.message);
    }

    // Publish to IPNS
    if (ipnsName !== null && (ipfsProtocol === ipnsKeyword || $tw.utils.getIpfsProtocol() === ipnsKeyword)) {
      if (this.isVerbose()) this.logger.info(
        "Publishing IPNS wiki: "
        + ipnsName
      );
      var { error } = await this.ipfsWrapper.publishToIpns(ipfs, ipnsName, added);
      if (error != null)  {
        // Log and continue
        this.logger.alert("Unable to publish IPNS wiki...");
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
          if (index !== -1 && this.isVerbose()) {
            this.logger.info(
              "Discard request to unpin IPNS wiki: /"
              + ipfsKeyword
              + "/"
              + ipnsContent
            );
          }
        }
      } else {
        // IPNS next
        nextWiki = nextHost
        + "/"
        + ipnsKeyword
        + "/"
        + ipnsKey
        + `/${wikiSearch || ''}${wikiFragment || ''}`;
      }
    }

    // Publish to ENS
    if ($tw.utils.getIpfsProtocol() === ensKeyword) {
      if (this.isVerbose()) this.logger.info(
        "Publishing ENS wiki: "
        + ensDomain
      );
      var { error } = await this.ensWrapper.setContenthash(ensDomain, added, web3Provider, account);
      if (error != null)  {
        // Log and continue
        this.logger.alert(error.message);
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
        if (index !== -1 && this.isVerbose()) {
          this.logger.info(
            "Discard request to unpin ENS wiki: /"
            + ipfsKeyword
            + "/"
            + ensContent
          );
        }
      } else {
        // ENS next
        nextWiki = "https://"
          + ensDomain
          + `/${wikiSearch || ''}${wikiFragment || ''}`;
      }
    }

    // Unpin
    if ($tw.utils.getIpfsUnpin()) {
      // Process global unpin
      for (var i = 0; i < window.unpin.length; i++) {
        var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, window.unpin[i]);
        // Log and continue
        if (error != null)  {
          this.logger.alert(error.message);
        }
      }
      window.unpin = [];
      // Process local unpin
      for (var i = 0; i < unpin.length; i++) {
        var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, unpin[i]);
        // Log and continue
        if (error != null)  {
          this.logger.alert(error.message);
        }
      }
      unpin = [];
    }

    // Done
    callback(null);

    // Next
    if (nextWiki !== document.URL) {
      window.location.assign(nextWiki);
    }

  } catch (error) {
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
