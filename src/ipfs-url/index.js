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
    return "https://ipfs.infura.io";
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

  IpfsUrl.prototype.normalizeUrl = function (url, base) {
    // Check
    if (url == undefined || url == null || url.toString().trim() === "") {
      return null;
    }
    var url = url.toString().trim();
    // Parse
    var parsed = null;
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
    return parsed;
  };

  module.exports = IpfsUrl;
})();
