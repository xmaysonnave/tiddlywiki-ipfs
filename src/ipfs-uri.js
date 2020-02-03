/*\
title: $:/plugins/ipfs/ipfs-uri.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsUri

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/**
 * https://github.com/purposeindustries/window-or-global
 * The MIT License (MIT) Copyright (c) Purpose Industries
 * version: 1.0.1
 */
const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

const EnsLibrary = require("./ens-library.js").EnsLibrary;

const name = "ipfs-uri";

var IpfsUri = function() {
  this.ensLibrary = new EnsLibrary();
}

IpfsUri.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

/**
 * url.href;
 * url.origin
 * url.protocol;
 * url.username;
 * url.password;
 * url.host;
 * url.hostname;
 * url.port;
 * url.pathname;
 * url.search;
 * url.hash;
 * https://jsdom.github.io/whatwg-url/
 * https://url.spec.whatwg.org/
 */
IpfsUri.prototype.getDocumentUrl = function() {
  try {
    return this.ensLibrary.getDocumentUrl();
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid current HTML Document URL...");
}

IpfsUri.prototype.getIpfsApiUrl = function() {
  try {
    return this.ensLibrary.getIpfsApiUrl();
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid IPFS API URL...");
}

IpfsUri.prototype.getIpfsGatewayUrl = function() {
  try {
    return this.ensLibrary.getIpfsGatewayUrl();
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid IPFS Gateway URL...");
}

IpfsUri.prototype.getUrl = function(url, baseUrl) {
  try {
    return this.ensLibrary.getUrl(url, baseUrl);
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid URL...");
}

IpfsUri.prototype.getBaseUrl = function() {
  // Parse document URL
  const document = this.getDocumentUrl();
  // Parse default gateway URL
  const gateway = this.getIpfsGatewayUrl();
  // base URL
  var base = document;
  if (document.protocol === "file:") {
    base = gateway;
  }
  return base;
}

IpfsUri.prototype.normalizeUrl = function(url) {
  // Parse
  var parsed = null;
  try {
    parsed = this.ensLibrary.getUrl(url);
  } catch (error) {
    parsed = null;
  }
  // Attempt to build an URL with a Base URL
  if (parsed == null) {
    const base = this.getBaseUrl();
    // Parse
    try {
      parsed = this.ensLibrary.getUrl(url, base);
    } catch (error) {
      this.getLogger(error);
      throw new Error("Invalid URL...");
    }
  }
  // Remove .link from .eth.link
  if (parsed.hostname.endsWith(".eth.link")) {
    parsed.hostname = parsed.hostname.substring(0, ".link");
  }
  // TODO: Resolve .eth
  if (parsed.hostname.endsWith(".eth.link")) {
  }
  return parsed;
}

exports.IpfsUri = IpfsUri;

})();
