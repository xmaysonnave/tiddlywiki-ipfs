/*\
title: $:/plugins/ipfs/ipfs-uri.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsUri

\*/

import { URL } from "whatwg-url";

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

const name = "ipfs-uri";

var IpfsUri = function() {}

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
    return new URL(root.location.href);
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid current HTML Document URL...");
}

IpfsUri.prototype.getIpfsApiUrl = function() {
  try {
    return new URL($tw.utils.getIpfsSaverApiUrl());
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid IPFS API URL...");
}

IpfsUri.prototype.getSafeIpfsApiUrl = function() {
  // Parse api URL
  var api = null;
  try {
    api = this.getIpfsApiUrl();
  } catch (error) {
    // Fallback to default
    api = this.getDefaultIpfsApiUrl();
  }
  return api;
}

IpfsUri.prototype.getDefaultIpfsApiUrl = function() {
  return new URL("https://ipfs.infura.io:5001");
}

IpfsUri.prototype.getIpfsGatewayUrl = function() {
  try {
    return new URL($tw.utils.getIpfsSaverGatewayUrl());
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid IPFS Gateway URL...");
}

IpfsUri.prototype.getSafeIpfsGatewayUrl = function() {
  // Parse gateway URL
  var gateway = null;
  try {
    gateway = this.getIpfsGatewayUrl();
  } catch (error) {
    // Fallback to default
    gateway = this.getDefaultIpfsGatewayUrl();
  }
  return gateway;
}

IpfsUri.prototype.getDefaultIpfsGatewayUrl = function() {
  return new URL("https://ipfs.infura.io");
}

IpfsUri.prototype.getUrl = function(url, baseUrl) {
  try {
    return new URL(url, baseUrl);
  } catch (error) {
    this.getLogger().error(error);
  }
  throw new Error("Invalid URL...");
}

IpfsUri.prototype.normalizeGatewayUrl = function(url) {
  // Parse
  var parsed = null;
  try {
    parsed = new URL(url);
  } catch (error) {
    parsed = null;
  }
  // Attempt to parse an URL with a Base URL
  if (parsed == null) {
    parsed = this.getUrl(url, this.getSafeIpfsGatewayUrl());
  }
  // Remove .link from .eth.link
  if (parsed.hostname.endsWith(".eth.link")) {
    parsed.hostname = parsed.hostname.substring(0, parsed.hostname.indexOf(".link"));
  }
  // TODO: Resolve .eth
  if (parsed.hostname.endsWith(".eth")) {
  }
  return parsed;
}

exports.IpfsUri = IpfsUri;

})();
