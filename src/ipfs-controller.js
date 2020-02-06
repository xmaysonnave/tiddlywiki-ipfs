/*\
title: $:/plugins/ipfs/ipfs-controller.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsController

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsLoader = require("$:/plugins/ipfs/ipfs-loader.js").IpfsLoader;
const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;
const IpfsUri = require("./ipfs-uri.js").IpfsUri;

const name = "ipfs-controller";

var IpfsController = function() {
  this.loader = new IpfsLoader();
  this.ipfsUri = new IpfsUri();
  this.ipfsWrapper = new IpfsWrapper();
  this.ipfsClients = new Map();
};

IpfsController.prototype.getLogger = function() {
  return window.log.getLogger(name);
}

IpfsController.prototype.getLoader = function() {
  return this.loader;
}

IpfsController.prototype.getUrl = function(url) {
  return this.ipfsUri.getUrl(url);
}

IpfsController.prototype.normalizeUrl = function(url) {
  return this.ipfsUri.normalizeUrl(url, this.ipfsUri.getBaseUrl());
}

IpfsController.prototype.normalizeGatewayUrl = function(url) {
  return this.ipfsUri.normalizeUrl(url, this.getIpfGatewayUrl());
}

IpfsController.prototype.getDocumentUrl = function() {
  return this.ipfsUri.getDocumentUrl();
}

IpfsController.prototype.getIpfsApiUrl = function() {
  return this.ipfsUri.getSafeIpfsApiUrl();
}

IpfsController.prototype.getIpfsGatewayUrl = function() {
  return this.ipfsUri.getSafeIpfsGatewayUrl();
}

IpfsController.prototype.getIpfsClient = async function() {
  // Current API URL
  const apiUrl = this.getIpfsApiUrl();
  // Retrieve an existing HTTP Client
  const client  = this.ipfsClients.get(apiUrl.href);
  if (client !== undefined) {
    // Log
    this.getLogger().info(
      "Existing IPFS provider: "
      + client.provider
    );
    // Done
    return {
      ipfs: client.ipfs,
      provider: client.provider
    }
  }
  // Build a new HTTP client or retrieve IPFS Companion
  const policy = await this.ipfsWrapper.getIpfsClient(apiUrl.href);
  const ipfs = policy.ipfs;
  const provider = policy.provider;
  // Store if applicable
  if (apiUrl !== undefined && apiUrl !== null && apiUrl.toString().trim() !== "") {
    this.ipfsClients.set(apiUrl.href, { ipfs, provider } );
  }
  // Log
  this.getLogger().info(
    "IPFS provider: "
    + policy.provider
  );
  // Done
  return {
    ipfs: ipfs,
    provider: provider
  }
}

exports.IpfsController = IpfsController;

})();
