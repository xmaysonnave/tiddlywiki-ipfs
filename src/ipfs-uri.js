/*\
title: $:/plugins/ipfs/ipfs-uri.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsUri

\*/

import { URL } from "universal-url";

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  /**
   * https://github.com/purposeindustries/window-or-global
   * The MIT License (MIT) Copyright (c) Purpose Industries
   * version: 1.0.1
   */
  const root =
    (typeof self === "object" && self.self === self && self) ||
    (typeof global === "object" && global.global === global && global) ||
    this;

  const name = "ipfs-uri";

  const defaultApiUrl = new URL("https://ipfs.infura.io:5001");

  const defaultGatewayUrl = new URL("https://ipfs.infura.io");

  var IpfsUri = function() {};

  IpfsUri.prototype.getLogger = function() {
    return root.log.getLogger(name);
  };

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
   * https://github.com/stevenvachon/universal-url
   * https://github.com/stevenvachon/universal-url-lite
   * https://url.spec.whatwg.org/
   */
  IpfsUri.prototype.getDocumentUrl = function() {
    try {
      return new URL(root.location.href);
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Invalid current HTML Document URL...");
  };

  IpfsUri.prototype.getIpfsApiUrl = function() {
    try {
      return new URL($tw.utils.getIpfsSaverApiUrl());
    } catch (error) {
      return this.getDefaultIpfsApiUrl();
    }
  };

  IpfsUri.prototype.getDefaultIpfsApiUrl = function() {
    return defaultApiUrl;
  };

  IpfsUri.prototype.getIpfsGatewayUrl = function() {
    try {
      return new URL($tw.utils.getIpfsSaverGatewayUrl());
    } catch (error) {
      return this.getDefaultIpfsGatewayUrl();
    }
  };

  IpfsUri.prototype.getDefaultIpfsGatewayUrl = function() {
    return defaultGatewayUrl;
  };

  IpfsUri.prototype.getUrl = function(url, base) {
    try {
      return new URL(url, base);
    } catch (error) {
      // Ignore
    }
    throw new Error("Invalid URL...");
  };

  IpfsUri.prototype.getIpfsBaseUrl = function() {
    var base = this.getIpfsGatewayUrl();
    try {
      if ($tw.utils.getIpfsUrlPolicy() === "origin") {
        base = this.getDocumentUrl();
        if (base.protocol === "file:") {
          base = this.getIpfsGatewayUrl();
        }
      }
    } catch (error) {
      base = this.getIpfsGatewayUrl();
    }
    return new URL(base.protocol + "//" + base.host);
  };

  IpfsUri.prototype.normalizeUrl = async function(url, base) {
    // Parse
    var parsed = null;
    if (url !== undefined && url !== null && url.toString().trim() !== "") {
      try {
        parsed = new URL(url);
      } catch (error) {
        parsed = null;
      }
      // Invalid URL, try to parse with a Base URL
      if (parsed == null) {
        base = base !== undefined && base !== null ? base : this.getIpfsBaseUrl();
        if (url !== undefined && url !== null) {
          parsed = this.getUrl(url, base);
        }
      }
      // Remove .link from .eth.link
      if (parsed.hostname.endsWith(".eth.link")) {
        parsed.hostname = parsed.hostname.substring(0, parsed.hostname.indexOf(".link"));
      }
      // Resolve .eth
      if (parsed.hostname.endsWith(".eth")) {
        // To accomodate jest
        var jest = true;
        try {
          if ($tw.browser) {
            // It never happen as node raises an exception...
            jest = false;
          }
        } catch (error) {
          // Ignore
        }
        // Errors are triggered and tests are running...
        if (jest === false) {
          parsed = await $tw.ipfs.resolveENS(parsed.hostname);
        }
      }
    }
    return parsed;
  };

  exports.IpfsUri = IpfsUri;
})();
