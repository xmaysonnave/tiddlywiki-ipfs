/*\
title: $:/plugins/ipfs/ipfs-loader.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsLoader

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const log = require("$:/plugins/ipfs/loglevel/loglevel.js");
const root = require("$:/plugins/ipfs/window-or-global/index.js");

const name = "ipfs-loader";

var IpfsLoader = function() {};

IpfsLoader.prototype.getLogger = function() {
  return log.getLogger(name);
}

// https://www.srihash.org/
// https://github.com/liriliri/eruda
IpfsLoader.prototype.loadErudaLibrary = async function() {
  if (typeof root.eruda === "undefined") {
    await this.loadLibrary(
      "ErudaLibrary",
      "https://cdn.jsdelivr.net/npm/eruda@2.1.0/eruda.min.js",
      "sha384-L90fb4ZBjGGC8PcjNiWVB1Fxj2qeKuHN+Ddno15fJwwBuvaZoLM4ZNuQtQRWBgsM"
    );
  }
}

// https://www.srihash.org/
// https://github.com/ethers-io/ethers.js/
IpfsLoader.prototype.loadEtherJsLibrary = async function() {
  if (typeof root.ethers === "undefined") {
    return await this.loadLibrary(
      "EtherJsLibrary",
      "https://cdn.jsdelivr.net/npm/ethers@4.0.44/dist/ethers.min.js",
      "sha384-OVtNQuuquwgl2WspNZSP1tVXyso/+dUUAU7tGnC1bV7vjXGwQN8RUG13biHCbHij",
      true
    );
  }
}

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsLoader.prototype.loadIpfsHttpLibrary = async function() {
  if (typeof root.IpfsHttpClient === "undefined") {
    await this.loadLibrary(
      "IpfsHttpLibrary",
      "https://cdn.jsdelivr.net/npm/ipfs-http-client@41.0.1/dist/index.min.js",
      "sha384-FhotltYqd3Ahyy0tJkqdR0dTReYsWEk0NQpF+TAxMPl15GmLtZhZijk1j/Uq7Xsh",
      true
    );
    root.httpClient = root.IpfsHttpClient;
  }
}

// https://observablehq.com/@bryangingechen/dynamic-import-polyfill
IpfsLoader.prototype.loadLibrary = async function(id, url, sri, module) {
  const self = this;
  return new Promise((resolve, reject) => {
    try {
      if (root.document.getElementById(id) == null) {
        const script = root.document.createElement("script");
        // Cleanup function
        const cleanup = () => {
          delete root[id];
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
        root.document.head.appendChild(script);
        script.onload = () => {
          resolve(root[id]);
          cleanup();
          self.getLogger(name).info(
            "Loaded: "
            + url
          );
        }
        script.onerror = () => {
          reject(new Error("Failed to load: " + url));
          cleanup();
        }
      } else {
        return resolve(root[id]);
      }
    } catch (error) {
      reject(error);
    }
  });
};

exports.IpfsLoader = IpfsLoader;

})();
