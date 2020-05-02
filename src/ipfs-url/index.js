import root from "window-or-global";
import { URL } from "universal-url";

(function () {
  /*jslint node: true, browser: true */
  "use strict";

  const name = "ipfs-url";

  const defaultApiUrl = new URL("https://ipfs.infura.io:5001");

  const defaultGatewayUrl = new URL("https://ipfs.infura.io");

  const ipnsKeyword = "ipns";

  var IpfsUrl = function (ensLibrary, ipfsLibrary) {
    this.ensLibrary = ensLibrary;
    this.ipfsLibrary = ipfsLibrary;
  };

  IpfsUrl.prototype.getLogger = function () {
    return root.log.getLogger(name);
  };

  IpfsUrl.prototype.resolveUrl = async function (resolveIpns, value) {
    var cid = null;
    var normalizedUrl = null;
    var protocol = null;
    var text = false;
    if (value !== undefined && value !== null) {
      try {
        this.getUrl(value);
      } catch (error) {
        if (value !== undefined && value !== null && value.startsWith("/") === false) {
          text = true;
        }
      }
      if (text == false) {
        normalizedUrl = await this.normalizeUrl(value, this.getIpfsBaseUrl());
        // IPFS
        var { protocol, cid } = this.ipfsLibrary.decodeCid(normalizedUrl.pathname);
        // IPNS
        if (resolveIpns && cid !== null && protocol !== null && protocol === ipnsKeyword) {
          try {
            const { ipnsKey } = await $tw.ipfsController.getIpnsIdentifiers(cid);
            cid = null;
            cid = await $tw.ipfsController.resolveIpnsKey(ipnsKey);
          } catch (error) {
            this.getLogger().error(error);
            $tw.utils.alert(name, error.message);
          }
        }
      }
    }
    return {
      cid: cid, // IPFS or IPNS cid
      normalizedUrl: normalizedUrl,
      protocol: protocol,
    };
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

  IpfsUrl.prototype.getIpfsApiUrl = function () {
    try {
      return new URL($tw.utils.getIpfsSaverApiUrl());
    } catch (error) {
      return this.getDefaultIpfsApiUrl();
    }
  };

  IpfsUrl.prototype.getDefaultIpfsApiUrl = function () {
    return defaultApiUrl;
  };

  IpfsUrl.prototype.getIpfsGatewayUrl = function () {
    try {
      return new URL($tw.utils.getIpfsSaverGatewayUrl());
    } catch (error) {
      return this.getDefaultIpfsGatewayUrl();
    }
  };

  IpfsUrl.prototype.getDefaultIpfsGatewayUrl = function () {
    return defaultGatewayUrl;
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
    return new URL(base.protocol + "//" + base.host);
  };

  IpfsUrl.prototype.normalizeUrl = async function (url, base) {
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
        parsed = await $tw.ipfsController.resolveENS(parsed.hostname);
      }
    }
    return parsed;
  };

  module.exports = IpfsUrl;
})();
