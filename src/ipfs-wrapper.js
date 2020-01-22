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

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;

const ipfsKeyword = "/ipfs/";
const ipnsKeyword = "/ipns/";

var IpfsWrapper = function() {
  // Library
  this.ipfsLibrary = new IpfsLibrary();
  // Logger
  try {
    this.logger = new $tw.utils.Logger("ipfs-plugin");
  } catch (error) {
    this.logger = console;
  }
}

IpfsWrapper.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
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
    if (this.isVerbose()) this.logger.info(
      "IPFS provider: "
      + policy.provider
    );
    return {
      error: null,
      ipfs: policy.ipfs,
      provider: policy.provider
    };
  } catch (error) {
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info(
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
    if (this.isVerbose()) this.logger.info(
      "Successfully fetched IPNS name and IPNS key..."
    );
  } else if (ipnsName !== null) {
    if (this.isVerbose()) this.logger.info(
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
    if (this.isVerbose()) this.logger.info(
      "Successfully fetched IPNS key: "
      + ipnsKey
    );
  } else {
    if (this.isVerbose()) this.logger.info(
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
    if (this.isVerbose()) this.logger.info(
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
    if (this.isVerbose()) this.logger.info(
      "Successfully generated IPNS key: "
      + id
    );
    return {
      error: null,
      key: id
    };
  } catch (error) {
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info(
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
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info(
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
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info("Successfully fetched IPNS keys...");
    return {
      error: null,
      keys: keys
    };
  } catch (error) {
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info(
      "Successfully fetched: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      fetched: fetched
    };
  } catch (error) {
    this.logger.error(error.message);
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
    const added = await this.ipfsLibrary.add(ipfs, content);
    if (added == undefined || added == null || Array.isArray(added) == false || added.length == 0) {
      return {
        error: err,
        added: null
      };
    }
    if (this.isVerbose()) this.logger.info(
      "Successfully added content: "
      + ipfsKeyword
      + added[0].hash
    );
    return {
      error: null,
      added: added[0].hash
    };
  } catch (error) {
    this.logger.error(error.message);
    return {
      error: err,
      added: null
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
    if (this.isVerbose()) this.logger.info(
      "Successfully resolved IPNS key: "
      + resolved
    );
    return {
      error: null,
      resolved: resolved
    };
  } catch (error) {
    this.logger.error(error.message);
    return {
      error: err,
      resolved: null
    };
  };
}

IpfsWrapper.prototype.publishToIpfs = async function(ipfs, name, cid) {
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
    if (this.isVerbose()) this.logger.info(
      "Successfully published: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      published: published
    };
  } catch (error) {
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info(
      "Successfully pinned: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      pinned: pinned
    };
  } catch (error) {
    this.logger.error(error.message);
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
    if (this.isVerbose()) this.logger.info(
      "Successfully unpinned: "
      + ipfsKeyword
      + cid
    );
    return {
      error: null,
      unpinned: unpinned
    };
  } catch (error) {
    this.logger.error(error.message);
    return {
      error: err,
      unpinned: null
    };
  };
}

exports.IpfsWrapper = IpfsWrapper;

})();
