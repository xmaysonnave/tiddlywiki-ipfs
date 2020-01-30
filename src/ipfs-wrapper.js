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

const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const ipfsKeyword = "/ipfs/";
const ipnsKeyword = "/ipns/";

const name = "ipfs-wrapper";

var IpfsWrapper = function() {
  this.ipfsLibrary = new IpfsLibrary();
}

IpfsWrapper.prototype.getLogger = function() {
  if (root !== undefined) {
    return root.log.getLogger(name);
  }
  return console;
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
    const ipfsPolicy = $tw.utils.getIpfsPolicy();
     if (ipfsPolicy === "window") {
      policy = await this.ipfsLibrary.getWindowIpfs();
    } else if (ipfsPolicy === "http") {
      policy = await this.ipfsLibrary.getHttpIpfs(apiUrl);
    } else  {
      policy  = await this.ipfsLibrary.getDefaultIpfs(apiUrl);
    }
    // Return if undefined
    if (policy.ipfs == null || policy.provider == null)  {
      return {
        error: err,
        ipfs: null,
        provider: null
      };
    }
   this.getLogger().info(
      "IPFS provider: "
      + policy.provider
    );
    return {
      error: null,
      ipfs: policy.ipfs,
      provider: policy.provider
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      ipfs: null,
      provider: null
    };
  }
}

IpfsWrapper.prototype.fetchIpns = async function(ipfs, ipnsKey, ipnsName) {

  // Cleanup
  if (ipnsKey == undefined || ipnsKey == null) {
    ipnsKey = null;
  }
  if (ipnsName == undefined || ipnsName == null) {
    ipnsName = null;
  }

  // check
  if (ipnsKey == null && ipnsName == null) {
    return {
      error: new Error("Undefined IPNS key and IPNS name..."),
      ipnsName: null,
      ipnsKey: null
    };
  }

  // Load IPNS keys
  var { error, keys } = await this.getIpnsKeys(ipfs);
  if (error !== null)  {
    return {
      error: error,
      ipnsName: null,
      ipnsKey: null
    };
  }

  // Fetch IPNS name and IPNS key
  if (ipnsName !== null && ipnsKey !== null) {
   this.getLogger().info(
      "Fetch IPNS name: "
      + ipnsName
      + " and IPNS key: "
      + ipnsKey
    );
    var found = false;
    for (var index = 0; index < keys.length; index++) {
      if (keys[index].name === ipnsName && keys[index].id === ipnsKey) {
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        error: new Error("Unknown IPNS key and IPNS name..."),
        ipnsName: null,
        ipnsKey: null
      };
    }
   this.getLogger().info(
      "Successfully fetched IPNS name and IPNS key..."
    );
  } else if (ipnsName !== null) {
   this.getLogger().info(
      "Fetch IPNS name: "
      + ipnsName
    );
    var found = false;
    for (var index = 0; index < keys.length; index++) {
      if (keys[index].name === ipnsName) {
        ipnsKey = keys[index].id;
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        error: new Error("Unknown IPNS name..."),
        ipnsName: null,
        ipnsKey: null
      };
    }
   this.getLogger().info(
      "Successfully fetched IPNS key: "
      + ipnsKey
    );
  } else {
   this.getLogger().info(
      "Fetch IPNS key: "
      + ipnsKey
    );
    var found = false;
    for (var index = 0; index < keys.length; index++) {
      if (keys[index].id === ipnsKey) {
        ipnsName = keys[index].name;
        found = true;
        break;
      }
    }
    if (found === false) {
      return {
        error: new Error("Unknown IPNS key..."),
        ipnsName: null,
        ipnsKey: null
      };
    }
   this.getLogger().info(
      "Successfully fetched IPNS name: "
      + ipnsName
    );
  }

  return {
    error: null,
    ipnsName: ipnsName,
    ipnsKey: ipnsKey
  }

}

IpfsWrapper.prototype.resolveIpns = async function(ipfs, ipnsKey, ipnsName) {

  var { error, ipnsName, ipnsKey } = await this.fetchIpns(ipfs, ipnsKey, ipnsName);
  if (error != null) {
    return {
      error: error,
      ipnsName: null,
      ipnsKey: null,
      resolved: null
    };
  }

  // Resolve IPNS key if any
  // ipfs-http-client generates different kind of errors when an IPNS key is unassigned
  var { error, resolved } = await this.resolveIpnsKey(ipfs, ipnsKey);
  if (error !== null) {
    return {
      error: error,
      ipnsName: ipnsName,
      ipnsKey: ipnsKey,
      resolved: null
    }
  }

  // Resolve cid
  const { cid } = await this.ipfsLibrary.decodeCid(resolved);
  return {
    error: null,
    ipnsName: ipnsName,
    ipnsKey: ipnsKey,
    resolved: cid
  }

}

IpfsWrapper.prototype.generateIpnsKey = async function(ipfs, name) {
  const err = new Error(
    "Failed to generate IPNS key named: "
    + name
  );
  try {
    const id = await this.ipfsLibrary.genKey(ipfs, name);
    if (id == undefined || id == null)  {
      return {
        error: err,
        key: null
      };
    }
   this.getLogger().info(
      "Successfully generated IPNS key: "
      + id
    );
    return {
      error: null,
      key: id
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      key: null
    };
  }
}

IpfsWrapper.prototype.removeIpnsKey = async function(ipfs, name) {
  const err = new Error(
    "Failed to remove IPNS name and IPNS key named: "
    + name
  );
  try {
    const id = await this.ipfsLibrary.rmKey(ipfs, name);
    if (id == undefined || id == null)  {
      return {
        error: err,
        key: null
      };
    }
   this.getLogger().info(
      "Successfully removed IPNS name: "
      + name
      + " and IPNS key: "
      + id
    );
    return {
      error: null,
      key: id
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      key: null
    };
  }
}

IpfsWrapper.prototype.renameIpnsName = async function(ipfs, oldName, newName) {
  const err = new Error(
    "Failed to rename IPNS name: "
    + oldName
    + " with "
    + newName
  );
  try {
    const { id, was, now } = await this.ipfsLibrary.renameKey(ipfs, oldName, newName);
    if (now == undefined || now == null)  {
      return {
        error: err,
        key: null,
        name: null
      };
    }
   this.getLogger().info(
      "Successfully renamed IPNS name: "
      + was
      + " with "
      + now
    );
    return {
      error: null,
      key: id,
      name: now
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      key: null,
      name: null
    };
  }
}

IpfsWrapper.prototype.getIpnsKeys = async function(ipfs) {
  const err = new Error("Failed to fetch IPNS keys...");
  try {
    const keys = await this.ipfsLibrary.getKeys(ipfs);
    if (keys == undefined || keys == null)  {
      return {
        error: err,
        keys: null
      };
    }
   this.getLogger().info("Successfully fetched IPNS keys...");
    return {
      error: null,
      keys: keys
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      keys: null
    };
  }
}

IpfsWrapper.prototype.fetchFromIpfs = async function(ipfs, cid) {
  const err = new Error(
    "Failed to fetch: "
    + ipfsKeyword
    + cid
  );
  try {
    const fetched = await this.ipfsLibrary.cat(ipfs, ipfsKeyword + cid);
    if (fetched == undefined || fetched == null)  {
      return {
        error: err,
        fetched: null
      };
    }
   this.getLogger().info(
      "Successfully fetched: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      fetched: fetched
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      fetched: null
    };
  }
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, content) {
  // Add
  const err = new Error("Failed to add content...");
  try {
    const { hash, size } = await this.ipfsLibrary.add(ipfs, content);
    if (hash == null) {
      return {
        error: err,
        added: null,
        size: null
      };
    }
    this.getLogger().info(
      "Successfully added "
      + size
      + " bytes to "
      + ipfsKeyword
      + hash
    );
    return {
      error: null,
      added: hash,
      size: size
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      added: null,
      size: null
    };
  };
}

IpfsWrapper.prototype.resolveIpnsKey = async function(ipfs, id) {
  // Resolve
  const err = new Error(
    "Failed to resolve IPNS key: "
    + id
);
  try {
    const resolved = await this.ipfsLibrary.resolve(ipfs, ipnsKeyword + id);
    if (resolved == undefined || resolved == null) {
      return {
        error: err,
        resolved: null
      };
    }
   this.getLogger().info(
      "Successfully resolved IPNS key: "
      + resolved
    );
    return {
      error: null,
      resolved: resolved
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      resolved: null
    };
  };
}

IpfsWrapper.prototype.publishToIpns = async function(ipfs, name, cid) {
  // Publish
  const err = new Error(
    "Failed to publish: "
    + ipfsKeyword
    + cid
  );
  try {
    const published = await this.ipfsLibrary.publish(ipfs, name, ipfsKeyword + cid);
    if (published == undefined || published == null) {
      return {
        error: err,
        published: null
      };
    }
   this.getLogger().info(
      "Successfully published: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      published: published
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      published: null
    };
  };
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
  // Unpin
  const err = new Error(
    "Failed to pin: "
    + ipfsKeyword
    + cid
  );
  try {
    const pinned = await this.ipfsLibrary.pin(ipfs, ipfsKeyword + cid);
    if (pinned == undefined || pinned == null) {
      return {
        error: err,
        pinned: null
      };
    }
   this.getLogger().info(
      "Successfully pinned: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      pinned: pinned
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      pinned: null
    };
  };
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
  // Unpin
  const err = new Error(
    "Failed to unpin: "
    + ipfsKeyword
    + cid
  );
  try {
    const unpinned = await this.ipfsLibrary.unpin(ipfs, ipfsKeyword + cid);
    if (unpinned == undefined || unpinned == null) {
      return {
        error: err,
        unpinned: null
      };
    }
   this.getLogger().info(
      "Successfully unpinned: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      unpinned: unpinned
    };
  } catch (error) {
    this.getLogger().error(error);
    return {
      error: err,
      unpinned: null
    };
  };
}

exports.IpfsWrapper = IpfsWrapper;

})();
