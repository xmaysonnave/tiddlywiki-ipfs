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
  const root =
    (typeof self === "object" && self.self === self && self) ||
    (typeof global === "object" && global.global === global && global) ||
    this;

  const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;
  const IpfsUri = require("./ipfs-uri.js").IpfsUri;

  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-wrapper";

  var IpfsWrapper = function() {
    this.ipfsLibrary = new IpfsLibrary();
    this.ipfsUri = new IpfsUri();
  };

  IpfsWrapper.prototype.getLogger = function() {
    return root.log.getLogger(name);
  };

  IpfsWrapper.prototype.decodeCid = function(pathname) {
    return this.ipfsLibrary.decodeCid(pathname);
  };

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
    if (info == undefined || info == null) {
      $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
      return null;
    }

    // Check
    if (info.encoding !== "base64" && type !== "image/svg+xml") {
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
    }

    return text;
  };

  IpfsWrapper.prototype.isJSON = function(content) {
    if (content !== undefined && content !== null && typeof content === "string") {
      try {
        JSON.parse(content);
        return true;
      } catch (erro) {
        // Ignore
      }
    }
    return false;
  };

  IpfsWrapper.prototype.getTiddlersAsJson = async function(filter, spaces) {
    var tiddlers = $tw.wiki.filterTiddlers(filter);
    var spaces = spaces === undefined ? $tw.config.preferences.jsonSpaces : spaces;
    var data = [];
    for (var t = 0; t < tiddlers.length; t++) {
      var tiddler = $tw.wiki.getTiddler(tiddlers[t]);
      if (tiddler) {
        var hasCid = false;
        var fields = new Object();
        // Process fields
        for (var field in tiddler.fields) {
          if (field === "tags" || field === "_export_uri" || field === "_import_uri") {
            continue;
          }
          var value = tiddler.getFieldString(field);
          // Check cid once
          if (hasCid == false) {
            var uri = null;
            var cid = null;
            try {
              uri = await $tw.ipfs.normalizeIpfsUrl(value);
            } catch (error) {
              // Ignore
            }
            if (uri !== null) {
              try {
                var { cid } = this.decodeCid(uri.pathname);
              } catch (error) {
                // Ignore
              }
            }
            if (cid !== null) {
              hasCid = true;
            }
          }
          fields[field] = value;
        }
        // Process tags
        for (var field in tiddler.fields) {
          if (field !== "tags") {
            continue;
          }
          var value = "";
          var tags = (tiddler.fields.tags || []).slice(0);
          for (var i = 0; i < tags.length; i++) {
            const tag = tags[i];
            if (tag === "$:/isExported" || tag === "$:/isImported" || (hasCid === false && tag === "$:/isIpfs")) {
              continue;
            }
            value = value + " " + tag;
          }
          fields[field] = value;
        }
        data.push(fields);
      }
    }
    return JSON.stringify(data, null, spaces);
  };

  /*
   * imported tiddler supersed hosting tiddler
   */
  IpfsWrapper.prototype.loadTiddlers = async function(uri) {
    // Normalize
    const normalized_uri = await $tw.ipfs.normalizeIpfsUrl(uri);
    // Load
    var importedTiddlers = null;
    const content = await $tw.utils.loadToUtf8(normalized_uri);
    if (this.isJSON(content.data)) {
      importedTiddlers = $tw.wiki.deserializeTiddlers(".json", content.data, $tw.wiki.getCreationFields());
    } else {
      importedTiddlers = $tw.wiki.deserializeTiddlers(".tid", content.data, $tw.wiki.getCreationFields());
    }
    $tw.utils.each(importedTiddlers, function(importedTiddler) {
      importedTiddler["_canonical_uri"] = uri;
    });
    return importedTiddlers;
  };

  IpfsWrapper.prototype.exportTiddler = async function(tiddler, child) {
    // Check
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown Tiddler...");
      return null;
    }

    const title = tiddler.getFieldString("title");

    // Type
    var type = tiddler.getFieldString("type");
    // Default
    if (type == undefined || type == null || type.trim() === "") {
      type = "text/vnd.tiddlywiki";
    }

    // Content Type
    const info = $tw.config.contentTypeInfo[type];
    // Check
    if (info == undefined || info == null) {
      $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
      return null;
    }

    // Filter
    var exportFilter = "[[" + tiddler.fields.title + "]]";

    // Child filters
    if (child) {
      // Links
      const linked = $tw.wiki.getTiddlerLinks(title);
      this.getLogger().info("Found " + linked.length + " Tiddler link(s).");
      // Transcluded
      const transcluded = this.transcludeContent(title);
      this.getLogger().info("Found " + transcluded.length + " transcluded Tiddler reference(s).");
      const filtered = linked.concat(transcluded);
      // Process filtered content
      for (var i = 0; i < filtered.length; i++) {
        if (exportFilter.includes("[[" + filtered[i] + "]]") == false) {
          exportFilter = exportFilter + " [[" + filtered[i] + "]]";
        }
      }
    }

    var content = null;

    if (child || $tw.utils.getIpfsExport() === "json") {
      content = await this.getTiddlersAsJson(exportFilter);
    } else if ($tw.utils.getIpfsExport() === "static") {
      // Export Tiddler as Static River
      const options = {
        downloadType: "text/plain",
        method: "download",
        template: "$:/core/templates/exporters/StaticRiver",
        variables: {
          exportFilter: exportFilter
        }
      };
      content = $tw.wiki.renderTiddler("text/plain", "$:/core/templates/exporters/StaticRiver", options);
    } else {
      // Export Tiddler as tid
      const options = {
        downloadType: "text/plain",
        method: "download",
        template: "$:/core/templates/exporters/TidFile",
        variables: {
          exportFilter: exportFilter
        }
      };
      content = $tw.wiki.renderTiddler("text/plain", "$:/core/templates/exporters/TidFile", options);
    }

    try {
      // Encrypt
      if ($tw.crypto.hasPassword()) {
        content = $tw.crypto.encrypt(content, $tw.crypto.currentPassword);
      }
      content = $tw.utils.StringToUint8Array(content);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, "Failed to encrypt content...");
      return null;
    }

    return content;
  };

  IpfsWrapper.prototype.transcludeContent = function(title) {
    var tiddlers = [];
    // Build a transclude widget
    var transclude = $tw.wiki.makeTranscludeWidget(title);
    // Build a fake document element
    const container = $tw.fakeDocument.createElement("div");
    // Transclude
    transclude.render(container, null);
    // Process children
    this.locateTiddlers(transclude, tiddlers);
    // Return
    return tiddlers;
  };

  IpfsWrapper.prototype.locateTiddlers = function(transclude, tiddlers) {
    // Children lookup
    for (var i = 0; i < transclude.children.length; i++) {
      // Current child
      const child = transclude.children[i];
      if (child.variables !== undefined && child.variables !== null) {
        // Locate Tiddler
        const name = "currentTiddler";
        const current = child.variables[name];
        if (current !== undefined && current !== null && current.value !== undefined && current.value !== null) {
          if (tiddlers.indexOf(current.value) === -1) {
            tiddlers.push(current.value);
          }
        }
      }
      // Process children
      this.locateTiddlers(child, tiddlers);
    }
  };

  IpfsWrapper.prototype.getWindowIpfsClient = async function() {
    // IPFS Companion
    try {
      const policy = await this.ipfsLibrary.getWindowIpfs();
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to retrieve IPFS Companion...");
  };

  IpfsWrapper.prototype.getHttpIpfsClient = async function(apiUrl) {
    // HTTP Client
    try {
      const policy = await this.ipfsLibrary.getHttpIpfs(apiUrl);
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to retrieve an IPFS HTTP provider...");
  };

  IpfsWrapper.prototype.getIpfsClient = async function(apiUrl) {
    // IPFS client
    try {
      var policy = null;
      const ipfsProvider = $tw.utils.getIpfsProvider();
      if (ipfsProvider === "window") {
        policy = await this.ipfsLibrary.getWindowIpfs();
      } else if (ipfsProvider === "http") {
        policy = await this.ipfsLibrary.getHttpIpfs(apiUrl);
      } else {
        policy = await this.ipfsLibrary.getDefaultIpfs(apiUrl);
      }
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to retrieve an IPFS provider...");
  };

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
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].id === ipnsKey && keys[index].name === ipnsName) {
          found = true;
          break;
        }
      }
      if (found === false) {
        throw new Error("Unknown IPNS key and IPNS name...");
      }
    } else if (ipnsName !== null) {
      var found = false;
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
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
    } else {
      var found = false;
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
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
    }

    // Log
    const url = await this.ipfsUri.normalizeUrl("/" + ipnsKeyword + "/" + ipnsKey);
    this.getLogger().info("Successfully Fetched IPNS name: " + ipnsName + "\n " + url.href);

    return {
      ipnsKey: ipnsKey,
      ipnsName: ipnsName
    };
  };

  IpfsWrapper.prototype.generateIpnsKey = async function(ipfs, ipnsName) {
    try {
      const key = await this.ipfsLibrary.genKey(ipfs, ipnsName);
      const url = await this.ipfsUri.normalizeUrl("/" + ipnsKeyword + "/" + key);
      this.getLogger().info("Successfully generated IPNS key with IPNS name: " + ipnsName + "\n " + url.href);
      return key;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to generate IPNS key with IPNS name: " + ipnsName);
  };

  IpfsWrapper.prototype.removeIpnsKey = async function(ipfs, ipnsKey, ipnsName) {
    try {
      const hash = await this.ipfsLibrary.rmKey(ipfs, ipnsName);
      this.getLogger().info("Successfully removed IPNS name: " + ipnsName);
      return hash;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to remove IPNS name: " + ipnsName + "\n " + "/" + ipnsKeyword + "/" + ipnsKey);
  };

  IpfsWrapper.prototype.renameIpnsName = async function(ipfs, oldName, newName) {
    try {
      const { id: key, was, now } = await this.ipfsLibrary.renameKey(ipfs, oldName, newName);
      this.getLogger().info("Successfully renamed IPNS name: " + was + " with " + now);
      return {
        key: key,
        name: now
      };
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to rename IPNS name: " + oldName + " with " + newName);
  };

  IpfsWrapper.prototype.getIpnsKeys = async function(ipfs) {
    try {
      const keys = await this.ipfsLibrary.getKeys(ipfs);
      this.getLogger().info("Successfully fetched IPNS keys...");
      return keys;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to fetch IPNS keys...");
  };

  IpfsWrapper.prototype.fetchFromIpfs = async function(ipfs, cid) {
    const pathname = "/" + ipfsKeyword + "/" + cid;
    try {
      const url = await this.ipfsUri.normalizeUrl(pathname);
      const fetched = await this.ipfsLibrary.cat(ipfs, pathname);
      this.getLogger().info("Successfully fetched:" + "\n " + url.href);
      return fetched;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to fetch:" + "\n " + pathname);
  };

  IpfsWrapper.prototype.addToIpfs = async function(ipfs, content) {
    try {
      const { hash, size } = await this.ipfsLibrary.add(ipfs, content);
      const pathname = "/" + ipfsKeyword + "/" + hash;
      const url = await this.ipfsUri.normalizeUrl(pathname);
      this.getLogger().info("Successfully added " + size + " bytes:" + "\n " + url.href);
      return {
        added: hash,
        size: size
      };
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to add content...");
  };

  IpfsWrapper.prototype.resolveIpnsKey = async function(ipfs, ipnsKey) {
    const pathname = "/" + ipnsKeyword + "/" + ipnsKey;
    try {
      const url = await this.ipfsUri.normalizeUrl(pathname);
      const resolved = await this.ipfsLibrary.resolve(ipfs, pathname);
      const { cid } = await this.ipfsLibrary.decodeCid(resolved);
      if (cid !== null) {
        const parsed = await this.ipfsUri.normalizeUrl("/" + ipfsKeyword + "/" + resolved);
        this.getLogger().info("Successfully resolved IPNS key:" + "\n " + url.href + "\n " + parsed.href);
        return cid;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to resolve IPNS key:" + "\n " + pathname);
  };

  IpfsWrapper.prototype.publishToIpns = async function(ipfs, ipnsKey, ipnsName, cid) {
    // Publish
    const key = "/" + ipnsKeyword + "/" + ipnsKey;
    const pathname = "/" + ipfsKeyword + "/" + cid;
    try {
      const keyParsed = await this.ipfsUri.normalizeUrl(key);
      const parsed = await this.ipfsUri.normalizeUrl(pathname);
      const published = await this.ipfsLibrary.publish(ipfs, ipnsName, pathname);
      this.getLogger().info(
        "Successfully published IPNS name: " + ipnsName + "\n " + keyParsed.href + "\n " + parsed.href
      );
      return published;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to publish IPNS name: " + ipnsName + "\n " + key + "\n " + pathname);
  };

  IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
    const pathname = "/" + ipfsKeyword + "/" + cid;
    try {
      const url = await this.ipfsUri.normalizeUrl(pathname);
      const pinned = await this.ipfsLibrary.pin(ipfs, pathname);
      this.getLogger().info("Successfully pinned:" + "\n " + url.href);
      return pinned;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to pin:" + "\n " + pathname);
  };

  IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
    const pathname = "/" + ipfsKeyword + "/" + cid;
    try {
      const parsed = await this.ipfsUri.normalizeUrl(pathname);
      const unpinned = await this.ipfsLibrary.unpin(ipfs, pathname);
      this.getLogger().info("Successfully unpinned:" + "\n " + parsed.href);
      return unpinned;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to unpin:" + "\n " + pathname);
  };

  exports.IpfsWrapper = IpfsWrapper;
})();
