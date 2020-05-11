import root from "window-or-global";
import { URL } from "universal-url";

(function () {
  /*jslint node: true, browser: true */
  "use strict";

  const name = "ipfs-url";

  var IpfsUrl = function () {
    this.defaultApiUrl = null;
    this.defaultGatewayUrl = null;
  };

  IpfsUrl.prototype.getLogger = function () {
    return root.log.getLogger(name);
  };

  IpfsUrl.prototype.getIpfsDefaultApiUrl = function () {
    if (this.defaultApiUrl == null) {
      this.defaultApiUrl = new URL(this.getIpfsDefaultApi());
    }
    return this.defaultApiUrl;
  };

  IpfsUrl.prototype.getIpfsDefaultGatewayUrl = function () {
    if (this.defaultGatewayUrl == null) {
      this.defaultGatewayUrl = new URL(this.getIpfsDefaultGateway());
    }
    return this.defaultGatewayUrl;
  };

  IpfsUrl.prototype.getIpfsApiUrl = function () {
    try {
      return this.getUrl($tw.utils.getIpfsSaverApiUrl());
    } catch (error) {
      return this.getIpfsDefaultApiUrl();
    }
  };

  IpfsUrl.prototype.getIpfsGatewayUrl = function () {
    try {
      return this.getUrl($tw.utils.getIpfsSaverGatewayUrl());
    } catch (error) {
      return this.getIpfsDefaultGatewayUrl();
    }
  };

  IpfsUrl.prototype.getIpfsDefaultApi = function () {
    return "https://ipfs.infura.io:5001";
  };

  IpfsUrl.prototype.getIpfsDefaultGateway = function () {
    return "https://gateway.ipfs.io";
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
  IpfsUrl.prototype.getDocumentUrl = function () {
    try {
      return new URL(root.location.href);
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Invalid current HTML Document URL...");
  };

  IpfsUrl.prototype.getUrl = function (url, base) {
    try {
      return new URL(url, base);
    } catch (error) {
      // Ignore
    }
    throw new Error("Invalid URL...");
  };

  IpfsUrl.prototype.getIpfsBaseUrl = function () {
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
    return this.getUrl(base.protocol + "//" + base.host);
  };

  IpfsUrl.prototype.normalizeUrl = function (value, base) {
    // Check
    if (value == undefined || value == null || value.toString() === "") {
      return null;
    }
    // Parse
    var text = false;
    var url = null;
    // Text or ENS
    try {
      url = this.getUrl(value);
    } catch (error) {
      if (value.startsWith("/") === false) {
        text = true;
        try {
          url = this.getUrl("https://" + value);
          if (url.hostname.endsWith(".eth") == false && url.hostname.endsWith(".eth.link") == false) {
            url = null;
          } else {
            text = false;
          }
        } catch (error) {
          // ignore
        }
      }
    }
    if (text) {
      return null;
    }
    // Invalid URL, try to parse with a Base URL
    if (url == null) {
      url = this.getUrl(value, base !== undefined && base !== null ? base : this.getIpfsBaseUrl());
    }
    // Remove .link from .eth.link
    if (url.hostname.endsWith(".eth.link")) {
      url.hostname = url.hostname.substring(0, url.hostname.indexOf(".link"));
    }
    return url;
  };

  module.exports = IpfsUrl;
})();
