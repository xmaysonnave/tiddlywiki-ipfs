/*\
title: $:/plugins/ipfs/ipfs-bundle.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Bundle

\*/

import CID from "cids";
import root from "window-or-global";

import EnsLibrary from "./ens-library";
import IpfsLibrary from "./ipfs-library";
import IpfsLoader from "./ipfs-loader";
import IpfsUrl from "./ipfs-url";

(function () {
  /*jslint node: true, browser: true*/
  /*global $tw: false*/
  "use strict";

  const cidAnalyser = "https://cid.ipfs.io/#";

  const name = "ipfs-bundle";

  var IpfsBundle = function () {
    this.once = false;
  };

  IpfsBundle.prototype.getLogger = function () {
    return root.log.getLogger(name);
  };

  IpfsBundle.prototype.init = function () {
    // Init once
    if (this.once) {
      return;
    }
    this.ipfsLoader = new IpfsLoader();
    this.ensLibrary = new EnsLibrary(this.ipfsLoader);
    this.ipfsLibrary = new IpfsLibrary(this);
    this.ipfsUrl = new IpfsUrl();
    // Init once
    this.once = true;
  };

  IpfsBundle.prototype.decodeCid = function (pathname) {
    // Check
    if (pathname == undefined || pathname == null || pathname.trim() === "" || pathname.trim() === "/") {
      return {
        cid: null,
        ipnsIdentifier: null,
        protocol: null,
      };
    }
    var cid = null;
    var ipnsIdentifier = null;
    var protocol = null;
    // Parse
    const members = pathname.trim().split("/");
    for (var i = 0; i < members.length; i++) {
      // Ignore
      if (members[i].trim() === "") {
        continue;
      }
      // First non empty member
      if (protocol == null) {
        protocol = members[i];
        continue;
      }
      // Second non empty member
      if (cid == null) {
        cid = members[i];
        break;
      }
      // Nothing to process
      break;
    }
    // Check
    if (protocol == null || cid == null) {
      return {
        cid: null,
        ipnsIdentifier: null,
        protocol: null,
      };
    }
    // Check protocol
    if (protocol !== "ipfs" && protocol !== "ipns") {
      return {
        cid: null,
        ipnsIdentifier: null,
        protocol: null,
      };
    }
    // Check
    var isCid = this.isCid(cid);
    if (protocol === "ipns" && isCid == false) {
      ipnsIdentifier = cid;
      cid = null;
    } else if (isCid == false) {
      cid = null;
    }
    // All good
    return {
      cid: cid,
      ipnsIdentifier: ipnsIdentifier,
      protocol: protocol,
    };
  };

  IpfsBundle.prototype.isCid = function (cid) {
    try {
      const newCid = new CID(cid);
      return CID.isCID(newCid);
    } catch (error) {
      return false;
    }
  };

  IpfsBundle.prototype.cidV1ToCidV0 = function (cidv1) {
    var cidv0 = new CID(cidv1);
    if (cidv0.codec !== "dag-pb") {
      throw new Error("This 'cid' is not 'dag-pb' encoded: " + cidAnalyser + cidv0);
    }
    if (cidv0.version === 1) {
      cidv0 = cidv0.toV0();
      // Log
      this.getLogger().info(
        "Converted: " +
          "\n 'cidv1' (Base32):" +
          "\n  " +
          cidAnalyser +
          cidv1 +
          "\n to 'cidv0' (Base58):" +
          "\n  " +
          cidAnalyser +
          cidv0
      );
    } else {
      // Log
      this.getLogger().info("'cidv0' (Base58):" + "\n " + cidAnalyser + cidv0);
    }
    return cidv0.toString();
  };

  IpfsBundle.prototype.cidV0ToCidV1 = function (cidv0) {
    var cidv1 = new CID(cidv0);
    if (cidv1.codec !== "dag-pb") {
      throw new Error("This 'cid' is not 'dag-pb' encoded: " + cidAnalyser + cidv1);
    }
    if (cidv1.version === 0) {
      cidv1 = cidv1.toV1();
      this.getLogger().info(
        "Converted: " +
          "\n 'cidv0' (Base58):" +
          "\n  " +
          cidAnalyser +
          cidv0 +
          "\n to 'cidv1' (Base32):" +
          "\n  " +
          cidAnalyser +
          cidv1
      );
    } else {
      // Log
      this.getLogger().info("'cidv1' (Base32): " + "\n " + cidAnalyser + cidv1);
    }
    return cidv1.toString();
  };

  module.exports = {
    IpfsBundle,
  };
})();
