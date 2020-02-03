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
const IpfsUri = require("$:/plugins/ipfs/ipfs-uri.js").IpfsUri;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const fileProtocol = "file:";
const ipnsKeyword = "ipns";
const ipfsKeyword = "ipfs";

const name = "ens-action"

var EnsAction = function() {
  this.once = false;
  this.ensWrapper = new EnsWrapper();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipfsUri = new IpfsUri();
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

  try {

    // Getting default ENS domain
    const ensDomain = $tw.utils.getIpfsEnsDomain();
    // Check
    if (ensDomain == null) {
      $tw.utils.alert(name, "Undefined ENS domain...");
      return false;
    }

    // Retrieve Gateway URL
    const gateway = this.ipfsUri.getIpfsGatewayUrl();

    this.getLogger().info(
      "ENS domain: "
      + ensDomain
    );

    // Retrieve a WEB3 provider
    const { web3Provider, account } = await this.ensWrapper.getWeb3Provider();

    // Fetch ENS domain content
    const { content } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
    // Emtpy content
    if (content !== null) {
      const url = gateway.protocol
        + "//"
        + gateway.host
        + "/"
        + ipfsKeyword
        + "/"
        + content;
      window.open(url, "_blank", "noopener");
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

EnsAction.prototype.handlePublishToEns = async function(event) {

  try {

    // Process document URL
    const wiki = this.ipfsUri.getDocumentUrl();

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
    const { ipfs } = await this.ipfsWrapper.getIpfsClient(this.ipfsUri.getIpfsApiUrl());

    // Resolve IPNS key if applicable
    if (protocol === ipnsKeyword) {
      const { ipnsKey } = await this.ipfsWrapper.fetchIpns(ipfs, cid);
      cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
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
    const { web3Provider, account } = await this.ensWrapper.getWeb3Provider();

    // Fetch ENS domain content
    const { content } = await this.ensWrapper.getContenthash(ensDomain, web3Provider, account);
    // Nothing to publish
    if (content !== null && content === cid) {
      $tw.utils.alert(name, "The current resolved ENS domain content is up to date...");
      return false;
    }

    this.getLogger().info(
      "Publishing ENS domain: "
      + ensDomain
    );

    await this.ensWrapper.setContenthash(ensDomain, cid, web3Provider, account);

    // Unpin if applicable
    if ($tw.utils.getIpfsUnpin() && content !== null) {
      try {
        await this.ipfsWrapper.unpinFromIpfs(ipfs, content);
      } catch (error)  {
        // Log and continue
        this.getLogger().warning(error);
        $tw.utils.alert(name, error.message);
      }
    }

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

exports.EnsAction = EnsAction;

})();
