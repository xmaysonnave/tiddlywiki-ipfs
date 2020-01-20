/*\
title: $:/plugins/ipfs/ens-actions.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsActions

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ipnsKeyword = "ipns";
var EnsActions = function() {
  this.once = false;
  this.ensWrapper = new EnsWrapper();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
  this.logger = new $tw.utils.Logger("ipfs");
};

EnsActions.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

EnsActions.prototype.init = function() {
  // Init once
  if (this.once) {
    return;
  }
  const self = this;
  $tw.rootWidget.addEventListener("tm-open-ens-manager", function(event) {
    return self.handleOpenEnsManager(event);
  });
  $tw.rootWidget.addEventListener("tm-resolve-ens-and-open", function(event) {
    return self.handleResolveEnsAndOpen(event);
  });
  $tw.rootWidget.addEventListener("tm-publish-to-ens", function(event) {
    return self.handlePublishToEns(event);
  });
  // Init once
  this.once = true;
}

EnsActions.prototype.handleOpenEnsManager = async function(event) {
  // Retrieve ENS domain
  const ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    window.open("https://app.ens.domains/name/", "_blank");
  } else {
    window.open("https://app.ens.domains/name/" + ensDomain, "_blank");
  }
  return true;
}

EnsActions.prototype.handleResolveEnsAndOpen = async function(event) {

  return true;

}

EnsActions.prototype.handlePublishToEns = async function(event) {

  // Process document URL
  var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    this.logger.alert("Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    this.logger.alert("Undefined IPFS wiki...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    this.logger.alert("Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and CID
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

  // Check
  if (protocol == null) {
    this.logger.alert("Unknown IPFS protocol...");
    return false;
  }
  if (cid == null) {
    this.logger.alert("Unknown IPFS identifier...");
    return false;
  }

  // IPFS client
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    this.logger.alert(error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      this.logger.alert(error.message);
      return false;
    }
  }

  // Getting default ENS domain
  var ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    this.logger.alert("Undefined ENS domain...");
    return false;
  }

  if (this.isVerbose()) this.logger.info(
    "ENS domain: "
    + ensDomain
  );

  // Retrieve a WEB3 provider
  var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
  if (error != null)  {
    this.logger.alert(error.message);
    return false;
  }

  // Fetch ENS domain content
  var { error, decoded, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
  if (error != null)  {
    this.logger.alert(error.message);
    return false;
  }

  // Nothing to publish
  if (decoded !== null && decoded === cid) {
    this.logger.alert("The current resolved ENS domain content is up to date...");
    return false;
  }

  if (this.isVerbose()) this.logger.info(
    "Publishing ENS domain: "
    + ensDomain
  );

  var { error } = await this.ensWrapper.setContenthash(ensDomain, cid, web3Provider, account);
  if (error != null)  {
    this.logger.error(error.message);
    this.logger.alert("Unable to publish IPFS identifier to ENS...");
    return false;
  }

  return false;

}

exports.EnsActions = EnsActions;

})();
