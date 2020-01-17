/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsLibrary

\*/

import CID  from "cids";
import { getIpfs, providers } from "ipfs-provider";
import url from "url";

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var IpfsLibrary = function() {};

// https://www.srihash.org/
// https://github.com/ipfs/js-ipfs-http-client
IpfsLibrary.prototype.loadIpfsHttpLibrary = async function() {
  if (typeof window.IpfsHttpClient === "undefined") {
    await $tw.utils.loadLibrary(
      "IpfsHttpLibrary",
      "https://cdn.jsdelivr.net/npm/ipfs-http-client@41.0.0/dist/index.min.js",
      "sha384-YcSPas6I/IQQZY68hlXpCZqQ9Y35wL0Ff8u1ApTKcWlobgygNEEFAZrjfVlr1A7M",
      true
    );
    window.httpClient = window.IpfsHttpClient;
  }
}

IpfsLibrary.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

IpfsLibrary.prototype.cidV1ToCidV0 = function(cidv1) {
  var cidv0 = new CID(cidv1);
  if (cidv0.version === 1) {
    if (cidv0.codec !== "dag-pb") {
      throw new Error("CidV1 is not 'dag-pb' encoded: " + cidv1);
    }
    cidv0 = cidv0.toV0().toString();
    if (this.isVerbose()) console.info(
      "Base32 (CidV1): "
      + cidv1
      + "\nto Base58 (CidV0): "
      + cidv0
    );
  }
  return cidv0;
}

IpfsLibrary.prototype.parseUrl = function(uri) {
  // Check
  if (uri == undefined || uri == null || uri.trim() === "") {
    throw new Error("Undefined URL...");
  }
  const urlData = url.parse(uri.trim());
  return {
      href: urlData.href,
      protocol: urlData.protocol,
      host: urlData.host,
      auth: urlData.auth,
      hostname: urlData.hostname,
      port: urlData.port,
      pathname: urlData.pathname,
      search: urlData.search,
      fragment: urlData.hash
  };
}

IpfsLibrary.prototype.decodeCid = function(pathname) {
  // Check
  if (pathname == undefined || pathname == null || pathname.trim() === "" || pathname.trim() === "/") {
    return {
      protocol: null,
      cid: null
    };
  }
  // Parse
  const members = pathname.trim().split("/");
  var protocol = null;
  var cid = null;
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
      protocol: null,
      cid: null
    };
  }
  // Check protocol
  if (protocol !== "ipfs" && protocol !== "ipns") {
    return {
      protocol: null,
      cid: null
    };
  }
  // Check
  if (this.isCid(cid) == false) {
    return {
      protocol: protocol,
      cid: null
    };
  }
  // All good
  return {
    protocol: protocol,
    cid: cid
  }
}

IpfsLibrary.prototype.isCid = function(cid) {
  try {
    const newCid = new CID(cid);
    return CID.isCID(newCid);
  } catch (error) {
    return false;
  }
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function() {
  // API URL
  const apiUrl = $tw.utils.getIpfsApiUrl();
  // Check
  if (apiUrl == null) {
    throw new Error("Undefined IPFS API URL...");
  }
  // Load IpfsHttpClient
  await this.loadIpfsHttpLibrary();
  // Getting
  try {
    const { httpClient, windowIpfs } = providers;
    const { ipfs, provider } = await getIpfs({
      providers: [
        windowIpfs(),
        httpClient({
          apiAddress: apiUrl
        })
      ]
    });
    return {
      ipfs: ipfs,
      provider: provider + ", " + apiUrl
    };
  } catch (error) {
    console.error(error.message);
    throw new Error("Unable to connect. Check IPFS Companion and your API URL...");
  }
}

// window.enable
IpfsLibrary.prototype.getWindowIpfs = async function() {
  // Getting
  try {
    const { windowIpfs } = providers;
    const { ipfs, provider } = await getIpfs({
      providers: [
        windowIpfs()
      ]
    });
    return {
      ipfs: ipfs,
      provider: provider
    };
  } catch (error) {
    console.error(error.message);
    throw new Error("Unable to connect. Check IPFS Companion...");
  }
}

// ipfs-http-client
IpfsLibrary.prototype.getHttpIpfs = async function() {
  // API URL
  const apiUrl = $tw.utils.getIpfsApiUrl();
  // Check
  if (apiUrl == null) {
    throw new Error("Undefined IPFS API URL...");
  }
  // Load IpfsHttpClient
  await this.loadIpfsHttpLibrary();
  // Getting
  try {
    const { httpClient } = providers;
    const { ipfs, provider } = await getIpfs({
      providers: [
        httpClient({
          apiAddress: apiUrl
        })
      ]
    });
    return {
      ipfs: ipfs,
      provider: provider + ", " + apiUrl
    };
  } catch (error) {
    console.error(error.message);
    throw new Error("Unable to connect. Check your API URL...");
  }
}

IpfsLibrary.prototype.add = async function(client, content) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (content == undefined || content == null) {
    throw new Error("Undefined content...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["add"]});
  }
  // Process
  if (client !== undefined && client.add !== undefined) {
    // Process
    var buffer = Buffer.from(content);
    if (this.isVerbose()) console.info("Processing IPFS add...");
    // https://github.com/ipfs/go-ipfs/issues/5683
    // chunker: "size-262144"
    // chunker: "rabin-262144-524288-1048576"
    const result = await client.add(buffer, {
      cidVersion: 1,
      hashAlg: "sha2-256",
      chunker: "rabin-262144-524288-1048576",
      pin: false
    });
    return result;
  }
  throw new Error("Undefined IPFS command add...");
}

IpfsLibrary.prototype.get = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["get"]});
  }
  // Process
  if (client !== undefined && client.get !== undefined) {
    if (this.isVerbose()) console.info("Processing IPFS get...");
    const result = await client.get(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS get...");
}

IpfsLibrary.prototype.cat = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["cat"]});
  }
  // Process
  if (client !== undefined && client.cat !== undefined) {
    if (this.isVerbose()) console.info("Processing IPFS cat...");
    const result = await client.cat(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS cat...");
}

IpfsLibrary.prototype.pin = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["pin"]});
  }
  // Process
  if (client !== undefined && client.pin !== undefined && client.pin.add !== undefined) {
    if (this.isVerbose()) console.info("Processing IPFS pin add...");
    const result = await client.pin.add(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS pin add...");
}

IpfsLibrary.prototype.unpin = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["pin"]});
  }
  // Process
  if (client !== undefined && client.pin !== undefined && client.pin.rm !== undefined) {
    if (this.isVerbose()) console.info("Processing IPFS pin rm...");
    const result = await client.pin.rm(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS pin rm");
}

IpfsLibrary.prototype.publish = async function(client, name, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (name == undefined || name == null || name.trim() === "") {
    throw new Error("Undefined IPNS name...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["name"]});
  }
  if (client !== undefined && client.name !== undefined && client.name.publish !== undefined) {
    if (this.isVerbose()) console.info("Processing IPNS name publish...");
    const result = await client.name.publish(cid.trim(), { key: name.trim() });
    return result;
  }
  throw new Error("Undefined IPNS name publish...");
}

IpfsLibrary.prototype.resolve = async function(client, id) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (id == undefined || id == null || id.trim() === "") {
    throw new Error("Undefined IPNS key...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["name"]});
  }
  if (client !== undefined && client.name !== undefined && client.name.resolve !== undefined) {
    if (this.isVerbose()) console.info("Processing IPNS name resolve...");
    const resolved = await client.name.resolve(id.trim(), {
      recursive: true
    });
    return resolved;
  }
  throw new Error("Undefined IPNS name resolve...");
}

IpfsLibrary.prototype.getKeys = async function(client) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.list !== undefined) {
    if (this.isVerbose()) console.info("Processing IPNS key list...");
    const result = await client.key.list();
    return result;
  }
  throw new Error("Undefined IPNS key list...");
}

// Only rsa is supported yet...
// https://github.com/ipfs/interface-js-ipfs-core/blob/master/SPEC/KEY.md#keygen
// https://github.com/libp2p/js-libp2p-crypto/issues/145
IpfsLibrary.prototype.genKey = async function(client, name) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (name == undefined || name == null || name.trim() === "") {
    throw new Error("Undefined IPNS name...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.gen !== undefined) {
    if (this.isVerbose()) console.info("Processing IPNS key gen...");
    const key = await client.key.gen(name.trim(), {
      type: "rsa",
      size: 2048
    });
    if (key !== undefined && key.id !== undefined && key.id !== null) {
      return key.id;
    }
    return null;
  }
  throw new Error("Undefined IPNS key gen...");
}

IpfsLibrary.prototype.rmKey = async function(client, name) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (name == undefined || name == null || name.trim() === "") {
    throw new Error("Undefined IPNS name...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.rm !== undefined) {
    if (this.isVerbose()) console.info("Processing IPNS key rm...");
    const key = await client.key.rm(name.trim());
    if (key !== undefined && key.id !== undefined && key.id !== null) {
      return key.id;
    }
    return null;
  }
  throw new Error("Undefined IPNS key rm...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
