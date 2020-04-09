/*\
title: $:/plugins/ipfs/ipfs-loader.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsLoader

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const name = "ipfs-loader";

  const eruda = "https://cdn.jsdelivr.net/npm/eruda@2.2.1/eruda.min.js";
  const eruda_sri = "sha384-HmhzjvyY6GykZLnS/bLX/060WuwyrwFf1l0Oz9aBdh4hApJ5JjtfPb53SvRHjNMG";

  const ethers = "https://cdn.jsdelivr.net/npm/ethers@4.0.46/dist/ethers.min.js";
  const ethers_sri = "sha384-bjw8iFWKeuQECzXYvYmPXhtav8lsYy9YyJ+yhvwohfvs2mUXzTPktLSi5YsMgczG";

  const ipfs_http_client = "https://cdn.jsdelivr.net/npm/ipfs-http-client@43.0.1/dist/index.min.js";
  const ipfs_http_client_sri = "sha384-NZLGXvSPD7sUhUV/fNUcUjQSsmvnXjgPE+2C8bXNvJ7FnVZCqiRoM6ds9ekwfNHJ";

  var IpfsLoader = function() {};

  IpfsLoader.prototype.getLogger = function() {
    return window.log.getLogger(name);
  };

  // https://www.srihash.org/
  // https://github.com/liriliri/eruda
  IpfsLoader.prototype.loadErudaLibrary = async function() {
    if (typeof window.eruda === "undefined") {
      await this.loadLibrary("ErudaLibrary", eruda, eruda_sri, true);
    }
  };

  // https://www.srihash.org/
  // https://github.com/ethers-io/ethers.js/
  IpfsLoader.prototype.loadEtherJsLibrary = async function() {
    const self = this;
    if (typeof window.ethers === "undefined") {
      try {
        await this.loadLibrary("EtherJsLibrary", ethers, ethers_sri, true);
      } catch (error) {
        if (typeof window.ethers === "undefined") {
          import(ethers)
            .then(module => {
              window.ethers = module;
            })
            .catch(error => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        }
      }
    }
  };

  // https://www.srihash.org/
  // https://github.com/ipfs/js-ipfs-http-client
  IpfsLoader.prototype.loadIpfsHttpLibrary = async function() {
    const self = this;
    if (typeof window.httpClient === "undefined" || typeof window.IpfsHttpClient === "undefined") {
      try {
        await this.loadLibrary("IpfsHttpLibrary", ipfs_http_client, ipfs_http_client_sri, true);
        window.httpClient = window.IpfsHttpClient;
      } catch (error) {
        if (typeof window.httpClient === "undefined" || typeof window.IpfsHttpClient === "undefined") {
          import(ipfs_http_client)
            .then(module => {
              window.IpfsHttpClient = module;
              window.httpClient = window.IpfsHttpClient;
            })
            .catch(error => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        }
      }
    }
  };

  // https://observablehq.com/@bryangingechen/dynamic-import-polyfill
  IpfsLoader.prototype.loadLibrary = async function(id, url, sri, asModule) {
    // self
    const self = this;
    // promise
    return new Promise((resolve, reject) => {
      try {
        // Loaded
        if (window.document.getElementById(id) !== null) {
          return resolve(window[id]);
        }
        // Process
        const script = window.document.createElement("script");
        // Functions
        const cleanup = () => {
          delete window[id];
          script.onerror = null;
          script.onload = null;
          script.remove();
          URL.revokeObjectURL(script.src);
          script.src = "";
        };
        script.onload = () => {
          if (asModule) {
            self.getLogger(name).info("Loaded Module:" + "\n " + url);
          } else {
            self.getLogger(name).info("Loaded Script:" + "\n " + url);
          }
          resolve(window[id]);
          cleanup();
        };
        script.onerror = () => {
          reject(new Error("Failed to load: " + url));
          cleanup();
        };
        // Attributes
        if (asModule) {
          script.type = "module";
        } else {
          script.type = "text/javascript";
        }
        script.id = id;
        script.async = false;
        script.defer = "defer";
        if (sri) {
          script.integrity = sri;
        }
        script.crossOrigin = "anonymous";
        // URL
        script.src = url.toString();
        // Load
        window.document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  };

  exports.IpfsLoader = IpfsLoader;
})();
