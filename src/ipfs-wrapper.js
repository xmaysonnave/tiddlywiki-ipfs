/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsWrapper

\*/

(function() {

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

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;
const IpfsUri = require("./ipfs-uri.js").IpfsUri;

const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

const name = "ipfs-wrapper";

var IpfsWrapper = function() {
  this.ipfsLibrary = new IpfsLibrary();
  this.ipfsUri = new IpfsUri();
}

IpfsWrapper.prototype.decodeCid = function(pathname) {
  return this.ipfsLibrary.decodeCid(pathname);
}

IpfsWrapper.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

IpfsWrapper.prototype.getTiddlerContent = function(tiddler) {

  // Check
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return null;
  }

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return null;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml")  {
    $tw.utils.alert(name, "Unsupported Tiddler Content Type...\nLook at the documentation...");
    return null;
  }

  // Retrieve content
  var text = tiddler.getFieldString("text");
  if (text == undefined || text == null || text.trim() === "") {
    return null;
  }

  try {
    // Encrypt
    if ($tw.crypto.hasPassword()) {
      // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/9
      if (info.encoding === "base64") {
        text = atob(text);
      }
      text = $tw.crypto.encrypt(text, $tw.crypto.currentPassword);
      text = $tw.utils.StringToUint8Array(text);
    } else {
      // process base64
      if (info.encoding === "base64") {
        text = $tw.utils.Base64ToUint8Array(text);
      } else {
        text = $tw.utils.StringToUint8Array(text);
      }
    }
  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, "Failed to encrypt content...");
    return null;
  };

  return text;

}

IpfsWrapper.prototype.getTiddlerAsTid = function(tiddler) {

  // Check
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return null;
  }

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return null;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
    $tw.utils.alert(name, "Unsupported Tiddler Content Type...\nLook at the documentation...");
    return null;
  }

  // Export Tiddler as tid
  const options = {
    downloadType: "text/plain",
    method: "download",
    template: "$:/core/templates/exporters/TidFile",
    variables: {
      exportFilter: "[[" + tiddler.fields.title + "]]"
    }
  };
  var tid = $tw.wiki.renderTiddler(
    "text/plain",
    "$:/core/templates/exporters/TidFile",
    options
  );

  try {
    // Encrypt
    if ($tw.crypto.hasPassword()) {
      tid = $tw.crypto.encrypt(tid, $tw.crypto.currentPassword);
    }
    tid = $tw.utils.StringToUint8Array(tid);
  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, "Failed to encrypt content...");
    return null;
  };

  return tid;

}

IpfsWrapper.prototype.getIpfsClient = async function(apiUrl) {
  // IPFS client
  const err = new Error("Failed to get an IPFS provider...");
  try {
    var policy = { ipfs: null, provider: null };
    const ipfsProvider = $tw.utils.getIpfsProvider();
     if (ipfsProvider === "window") {
      policy = await this.ipfsLibrary.getWindowIpfs();
    } else if (ipfsProvider === "http") {
      policy = await this.ipfsLibrary.getHttpIpfs(apiUrl);
    } else  {
      policy  = await this.ipfsLibrary.getDefaultIpfs(apiUrl);
    }
    // Return if undefined
    if (policy.ipfs == null || policy.provider == null)  {
      throw err;
    }
    // Done
    return policy;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.getIpnsIdentifiers = async function(ipfs, ipnsKey, ipnsName) {

  // Cleanup
  if (ipnsKey == undefined || ipnsKey == null) {
    ipnsKey = null;
  }
  if (ipnsName == undefined || ipnsName == null) {
    ipnsName = null;
  }

  // Check
  if (ipnsKey == null && ipnsName == null) {
    throw new Error("Undefined IPNS key and IPNS name...");
  }

  // Load IPNS keys
  const keys = await this.getIpnsKeys(ipfs);

  // Fetch IPNS name and IPNS key
  if (ipnsName !== null && ipnsKey !== null) {
    var found = false;
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      this.getLogger().info(
        "Fetch IPNS name: "
        + ipnsName
        + " and IPNS key:"
        + "\n "
        + "/"
        + ipnsKeyword
        + "/"
        + ipnsKey
      );
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].id === ipnsKey && keys[index].name === ipnsName) {
          found = true;
          break;
        }
      }
    }
    if (found === false) {
      throw new Error("Unknown IPNS key and IPNS name...");
    }
    this.getLogger().info(
      "Successfully fetched IPNS key and IPNS name..."
    );
  } else if (ipnsName !== null) {
    var found = false;
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      this.getLogger().info(
        "Fetch IPNS name: "
        + ipnsName
      );
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].name === ipnsName) {
          ipnsKey = keys[index].id;
          found = true;
          break;
        }
      }
    }
    if (found === false) {
      throw new Error("Unknown IPNS name...");
    }
    this.getLogger().info(
      "Successfully fetched IPNS key:"
      + "\n "
      + "/"
      + ipnsKeyword
      + "/"
      + ipnsKey
    );
  } else {
    var found = false;
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      this.getLogger().info(
        "Fetch IPNS key: "
        + "\n "
        + "/"
        + ipnsKeyword
        + "/"
        + ipnsKey
      );
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].id === ipnsKey) {
          ipnsName = keys[index].name;
          found = true;
          break;
        }
      }
    }
    if (found === false) {
      throw new Error("Unknown IPNS key...");
    }
    this.getLogger().info(
      "Successfully fetched IPNS name: "
      + ipnsName
    );
  }

  return {
    ipnsKey: ipnsKey,
    ipnsName: ipnsName
  }

}

IpfsWrapper.prototype.generateIpnsKey = async function(ipfs, name) {
  const err = new Error(
    "Failed to generate IPNS key with IPNS name: "
    + name
  );
  try {
    const key = await this.ipfsLibrary.genKey(ipfs, name);
    if (key == undefined || key == null)  {
      throw err;
    }
    this.getLogger().info(
      "Successfully generated IPNS key:"
      + "\n "
      + "/"
      + ipnsKeyword
      + "/"
      + key
    );
    return key;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.removeIpnsKey = async function(ipfs, name) {
  const err = new Error(
    "Failed to remove IPNS key and IPNS name: "
    + name
  );
  try {
    const key = await this.ipfsLibrary.rmKey(ipfs, name);
    if (key == undefined || key == null)  {
      throw err;
    }
    this.getLogger().info(
      "Successfully removed IPNS name: "
      + name
      + " and IPNS key:"
      + "\n "
      + "/"
      + ipnsKeyword
      + "/"
      + key
    );
    return key;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.renameIpnsName = async function(ipfs, oldName, newName) {
  const err = new Error(
    "Failed to rename IPNS name: "
    + oldName
    + " with "
    + newName
  );
  try {
    const { id: key, was, now } = await this.ipfsLibrary.renameKey(ipfs, oldName, newName);
    if (now == undefined || now == null)  {
      throw err;
    }
   this.getLogger().info(
      "Successfully renamed IPNS name: "
      + was
      + " with "
      + now
    );
    return {
      key: key,
      name: now
    };
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.getIpnsKeys = async function(ipfs) {
  const err = new Error("Failed to fetch IPNS keys...");
  try {
    const keys = await this.ipfsLibrary.getKeys(ipfs);
    if (keys == undefined || keys == null)  {
      throw err;
    }
    this.getLogger().info("Successfully fetched IPNS keys...");
    return keys;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.fetchFromIpfs = async function(ipfs, cid) {
  // Fetch
  const pathname = "/" + ipfsKeyword + "/" + cid;
  const err = new Error(
    "Failed to fetch:"
    + "\n "
    + pathname
  );
  try {
    const fetched = await this.ipfsLibrary.cat(ipfs, pathname);
    if (fetched == undefined || fetched == null)  {
      throw err;
    }
    this.getLogger().info(
      "Successfully fetched:"
      + "\n "
      + pathname
    );
    return fetched;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, content) {
  // Add
  const err = new Error("Failed to add content...");
  try {
    const { hash, size } = await this.ipfsLibrary.add(ipfs, content);
    if (hash == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully added "
      + size
      + " bytes:"
      + "\n "
      + "/"
      + ipfsKeyword
      + "/"
      + hash
    );
    return {
      added: hash,
      size: size
    };
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.resolveIpnsKey = async function(ipfs, key) {
  // Resolve
  const pathname = "/" + ipnsKeyword + "/" + key;
  const err = new Error(
    "Failed to resolve IPNS key:"
    + "\n "
    + pathname
  );
  try {
    const resolved = await this.ipfsLibrary.resolve(ipfs, pathname);
    if (resolved == undefined || resolved == null) {
      throw err;
    }
    // Resolve cid
    const { cid } = await this.ipfsLibrary.decodeCid(resolved);
    this.getLogger().info(
      "Successfully resolved IPNS key:"
      + "\n "
      + "/"
      + ipfsKeyword
      + "/"
      + resolved
    );
    return cid;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.publishToIpns = async function(ipfs, name, cid) {
  // Publish
  const pathname = "/" + ipfsKeyword + "/" + cid;
  const err = new Error(
    "Failed to publish:"
    + "\n "
    + pathname
  );
  try {
    const published = await this.ipfsLibrary.publish(ipfs, name, pathname);
    if (published == undefined || published == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully published to IPNS:"
      + "\n "
      + pathname
    );
    return published;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
  // Pin
  const pathname = "/" + ipfsKeyword + "/" + cid;
  const err = new Error(
    "Failed to pin:"
    + "\n "
    + pathname
  );
  try {
    const pinned = await this.ipfsLibrary.pin(ipfs, pathname);
    if (pinned == undefined || pinned == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully pinned:"
      + "\n "
      + pathname
    );
    return pinned;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
  // Unpin
  const pathname = "/" + ipfsKeyword + "/" + cid;
  const err = new Error(
    "Failed to unpin:"
    + "\n "
    + pathname
  );
  try {
    const unpinned = await this.ipfsLibrary.unpin(ipfs, pathname);
    if (unpinned == undefined || unpinned == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully unpinned:"
      + "\n "
      + pathname
    );
    return unpinned;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

exports.IpfsWrapper = IpfsWrapper;

})();
