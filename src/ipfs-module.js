/*\
title: $:/plugins/ipfs/ipfs-module.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsModule

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const name = "ipfs-module";

var IpfsModule = function() {};

IpfsModule.prototype.getLogger = function() {
  if (window !== undefined && window.log !== undefined) {
    const logger = window.log.getLogger(name);
    if (this.isVerbose()) {
      logger.setLevel("trace", false);
    } else {
      logger.setLevel("warn", false);
    }
    return logger;
  }
  return console;
}

IpfsModule.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsModule.prototype.loadErudaLibrary = async function() {
  if (typeof window.eruda === "undefined") {
    await this.loadLibrary(
      "ErudaLibrary",
      "https://cdn.jsdelivr.net/npm/eruda@2.0.2/eruda.min.js",
      "sha384-GLqmQCByhqGAIgMwKsNaIgNZgaNZel7Moqd2mEoeQWUXUVBth0Yo3Nt6QiWiG9+w"
    );
    }
}

// https://www.srihash.org/
// https://github.com/ethers-io/ethers.js/
IpfsModule.prototype.loadEtherJsLibrary = async function() {
  if (typeof window.ethers === "undefined") {
    return await this.loadLibrary(
      "EtherJsLibrary",
      "https://cdn.jsdelivr.net/npm/ethers@4.0.43/dist/ethers.min.js",
      "sha384-QRwmP146iWM3rRaoUqzKQqvZ7EH8SVSIr9V411ZVGJrQrOPUZdEoAMEeeswO7ATu",
      true
    );
  }
}

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsModule.prototype.loadIpfsHttpLibrary = async function() {
  if (typeof window.IpfsHttpClient === "undefined") {
    await this.loadLibrary(
      "IpfsHttpLibrary",
      "https://cdn.jsdelivr.net/npm/ipfs-http-client@41.0.1/dist/index.min.js",
      "sha384-FhotltYqd3Ahyy0tJkqdR0dTReYsWEk0NQpF+TAxMPl15GmLtZhZijk1j/Uq7Xsh",
      true
    );
    window.httpClient = window.IpfsHttpClient;
  }
}

// https://www.srihash.org/
// https://github.com/pimterry/loglevel
IpfsModule.prototype.loadLoglevel = async function() {
  if (typeof window.log === "undefined") {
    await this.loadLibrary(
      "IpfsLoglevel",
      "https://cdn.jsdelivr.net/npm/loglevel@1.6.6/dist/loglevel.min.js",
      "sha384-3V+3/NiJdobcq0r73GeVUvXWTlV8FQhXDwmjqBLQcr7YYFoOROPqU9sZNnYa36KU"
    );
  }
}

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
IpfsModule.prototype.loadLibrary = async function(id, url, sri, module) {
  const self = this;
  return new Promise((resolve, reject) => {
    try {
      if (document.getElementById(id) == null) {
        const script = document.createElement("script");
        // Cleanup function
        const cleanup = () => {
          delete window[id];
          script.onerror = null;
          script.onload = null;
          script.remove();
          URL.revokeObjectURL(script.src);
          script.src = "";
        };
        if (module == undefined) {
          script.type = "text/javascript";
        } else {
          script.type = "module";
        }
        script.id = id;
        script.async = false;
        script.defer = "defer";
        script.src = url;
        if (sri) {
          script.integrity = sri;
        }
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        script.onload = () => {
          resolve(window[id]);
          cleanup();
          self.getLogger().info(
            "Loaded: "
            + url
          );
        }
        script.onerror = () => {
          reject(new Error("Failed to load: " + url));
          cleanup();
        }
      } else {
        return resolve(window[id]);
      }
    } catch (error) {
      reject(error);
    }
  });
};

exports.IpfsModule = IpfsModule;

})();
