/*\
title: $:/plugins/ipfs/ens-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

EnsAction

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const log = require("$:/plugins/ipfs/loglevel/loglevel.js");

const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const fileProtocol = "file:";
const ipnsKeyword = "ipns";
const ipfsKeyword = "ipfs";

const name = "ens-action"

var EnsAction = function() {
  this.once = false;
  this.ensWrapper = new EnsWrapper();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipfsLibrary = new IpfsLibrary();
};

EnsAction.prototype.getLogger = function() {
  return log.getLogger(name);
}

EnsAction.prototype.init = function() {
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

EnsAction.prototype.handleOpenEnsManager = async function(event) {
  // Retrieve ENS domain
  const ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    window.open("https://app.ens.domains", "_blank", "noopener");
  } else {
    await window.open("https://app.ens.domains/name/" + ensDomain, "_blank", "noopener");
  }
  return true;
}

EnsAction.prototype.handleResolveEnsAndOpen = async function(event) {

  // Getting default ENS domain
  const ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    $tw.utils.alert(name, "Undefined ENS domain...");
    return false;
  }

  // Retrieve Gateway URL
  const gatewayUrl = $tw.utils.getIpfsGatewayUrl();
  // Check
  if (gatewayUrl == null) {
    $tw.utils.alert(name, "Undefined IPFS Gateway URL...");
    return false;
  }

  // Process Gateway URL
  const {
    protocol: gatewayProtocol,
    host: gatewayHost
  } = this.ipfsLibrary.parseUrl(gatewayUrl);

  this.getLogger().info(
    "ENS domain: "
    + ensDomain
  );

  // Retrieve a WEB3 provider
  var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
  if (error != null)  {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Fetch ENS domain content
  var { error, decoded } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
  if (error != null)  {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  if (decoded !== null) {
    const url = gatewayProtocol
      + "//"
      + gatewayHost
      + "/"
      + ipfsKeyword
      + "/"
      + decoded;
    window.open(url, "_blank", "noopener");
  }

  return true;

}

EnsAction.prototype.handlePublishToEns = async function(event) {

  // Process document URL
  var { protocol, pathname } = this.ipfsLibrary.parseUrl(document.URL);

  // Check
  if (protocol == undefined || protocol == null) {
    $tw.utils.alert(name, "Unknown protocol...");
    return false;
  }
  if (protocol === fileProtocol) {
    $tw.utils.alert(name, "Undefined IPFS wiki...");
    return false;
  }
  if (pathname == undefined || pathname == null) {
    $tw.utils.alert(name, "Unknown pathname...");
    return false;
  }

  // Extract and check URL IPFS protocol and CID
  var { protocol, cid } = this.ipfsLibrary.decodeCid(pathname);

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
  var { error, ipfs } = await this.ipfsWrapper.getIpfsClient();
  if (error != null)  {
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Resolve IPNS key if applicable
  if (protocol === ipnsKeyword) {
    var { error, resolved: cid } = await this.ipfsWrapper.resolveIpns(ipfs, cid);
    if (error != null) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
  }

  // Getting default ENS domain
  const ensDomain = $tw.utils.getIpfsEnsDomain();
  // Check
  if (ensDomain == null) {
    $tw.utils.alert(name, "Undefined ENS domain...");
    return false;
  }

  this.getLogger().info(
    "ENS domain: "
    + ensDomain
  );

  // Retrieve a WEB3 provider
  var { error, web3Provider, account } = await this.ensWrapper.getWeb3Provider();
  if (error != null)  {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Fetch ENS domain content
  var { error, decoded: ensContent, protocol } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
  if (error != null)  {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Nothing to publish
  if (ensContent !== null && ensContent === cid) {
    $tw.utils.alert(name, "The current resolved ENS domain content is up to date...");
    return false;
  }

  this.getLogger().info(
    "Publishing ENS domain: "
    + ensDomain
  );

  var { error } = await this.ensWrapper.setContenthash(ensDomain, cid, web3Provider, account);
  if (error != null)  {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  // Unpin if applicable
  if ($tw.utils.getIpfsUnpin() && ensContent !== null) {
    var { error } = await this.ipfsWrapper.unpinFromIpfs(ipfs, ensContent);
    // Log and continue
    if (error != null)  {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    }
  }

  return true;

}

exports.EnsAction = EnsAction;

})();
