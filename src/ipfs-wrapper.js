/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Wrapper

\*/

(function () {
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

  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-wrapper";

  var IpfsWrapper = function (ipfsBundle) {
    this.ipfsLibrary = ipfsBundle.ipfsLibrary;
    this.ipfsUrl = ipfsBundle.ipfsUrl;
  };

  IpfsWrapper.prototype.getLogger = function () {
    return root.log.getLogger(name);
  };

  IpfsWrapper.prototype.decodeCid = function (pathname) {
    return this.ipfsLibrary.decodeCid(pathname);
  };

  IpfsWrapper.prototype.getAttachmentContent = function (tiddler) {
    var type = null;
    var info = null;
    // Retrieve Content-Type
    try {
      var { type, info } = $tw.ipfsController.getContentType(tiddler);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return null;
    }
    // Check
    if (info.encoding !== "base64" && type !== "image/svg+xml") {
      $tw.utils.alert(name, "Unsupported Tiddler Content-Type...");
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
      $tw.utils.alert(name, "Failed to encrypt Attachment content...");
      return null;
    }
    return text;
  };

  IpfsWrapper.prototype.exportTiddlersAsJson = async function (filter, spaces) {
    var tiddlers = $tw.wiki.filterTiddlers(filter);
    var spaces = spaces === undefined ? $tw.config.preferences.jsonSpaces : spaces;
    var data = [];
    // Process Tiddlers
    for (var t = 0; t < tiddlers.length; t++) {
      // Load Tiddler
      var tiddler = $tw.wiki.getTiddler(tiddlers[t]);
      // Process
      var isIpfs = false;
      var fields = new Object();
      // Process fields
      for (var field in tiddler.fields) {
        // Discard
        if (field === "tags" || field === "_export_uri") {
          continue;
        }
        // Process value
        var cid = null;
        const fieldValue = tiddler.getFieldString(field);
        try {
          var { cid } = await this.ipfsUrl.resolveUrl(false, fieldValue);
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        }
        if (cid !== null) {
          isIpfs = true;
        }
        // Store field
        fields[field] = fieldValue;
      }
      // Process tags
      var tags = tiddler.fields["tags"];
      if (tags !== undefined && tags !== null) {
        var tagValues = "";
        for (var i = 0; i < tags.length; i++) {
          const tag = tags[i];
          // Discard
          if (tag === "$:/isExported" || tag === "$:/isImported" || (isIpfs === false && tag === "$:/isIpfs")) {
            continue;
          }
          tagValues = (tagValues.length === 0 ? "[[" : tagValues + " [[") + tag + "]]";
        }
        // Store tags
        fields["tags"] = tagValues;
      }
      // Store
      data.push(fields);
    }
    return JSON.stringify(data, null, spaces);
  };

  IpfsWrapper.prototype.exportTiddler = async function (tiddler, child) {
    // Check
    if (tiddler == undefined || tiddler == null) {
      const error = new Error("Unknown Tiddler...");
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return null;
    }
    // Title
    const title = tiddler.getFieldString("title");
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
      content = await this.exportTiddlersAsJson(exportFilter);
    } else if ($tw.utils.getIpfsExport() === "static") {
      // Export Tiddler as Static River
      const options = {
        downloadType: "text/plain",
        method: "download",
        template: "$:/core/templates/exporters/StaticRiver",
        variables: {
          exportFilter: exportFilter,
        },
      };
      content = $tw.wiki.renderTiddler("text/plain", "$:/core/templates/exporters/StaticRiver", options);
    } else {
      // Export Tiddler as tid
      const options = {
        downloadType: "text/plain",
        method: "download",
        template: "$:/core/templates/exporters/TidFile",
        variables: {
          exportFilter: exportFilter,
        },
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

  IpfsWrapper.prototype.transcludeContent = function (title) {
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

  IpfsWrapper.prototype.locateTiddlers = function (transclude, tiddlers) {
    // Children lookup
    for (var i = 0; i < transclude.children.length; i++) {
      // Current child
      const child = transclude.children[i];
      if (child.variables !== undefined && child.variables !== null) {
        // Locate Tiddler
        const currentTiddler = "currentTiddler";
        const current = child.variables[currentTiddler];
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

  IpfsWrapper.prototype.getWindowIpfsClient = async function () {
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

  IpfsWrapper.prototype.getHttpIpfsClient = async function (url) {
    // HTTP Client
    try {
      const policy = await this.ipfsLibrary.getHttpIpfs(url);
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to retrieve an IPFS HTTP provider...");
  };

  IpfsWrapper.prototype.getIpfsClient = async function (url) {
    // IPFS client
    try {
      var policy = null;
      const ipfsProvider = $tw.utils.getIpfsProvider();
      if (ipfsProvider === "window") {
        policy = await this.ipfsLibrary.getWindowIpfs();
      } else if (ipfsProvider === "http") {
        policy = await this.ipfsLibrary.getHttpIpfs(url);
      } else {
        policy = await this.ipfsLibrary.getDefaultIpfs(url);
      }
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to retrieve an IPFS provider...");
  };

  IpfsWrapper.prototype.getIpnsIdentifiers = async function (ipfs, ipnsKey, ipnsName) {
    // Cleanup
    if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() === "") {
      ipnsKey = null;
    } else {
      ipnsKey = ipnsKey.trim();
    }
    if (ipnsName == undefined || ipnsName == null || ipnsName.trim() === "") {
      ipnsName = null;
    } else {
      ipnsName = ipnsName.trim();
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
    const url = await this.ipfsUrl.normalizeUrl("/" + ipnsKeyword + "/" + ipnsKey);
    this.getLogger().info("Successfully Fetched IPNS name: " + ipnsName + "\n " + url.href);
    return {
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
    };
  };

  IpfsWrapper.prototype.generateIpnsKey = async function (ipfs, ipnsName) {
    try {
      const key = await this.ipfsLibrary.genKey(ipfs, ipnsName);
      const url = await this.ipfsUrl.normalizeUrl("/" + ipnsKeyword + "/" + key);
      this.getLogger().info("Successfully generated IPNS key with IPNS name: " + ipnsName + "\n " + url.href);
      return key;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to generate and IPNS key...");
  };

  IpfsWrapper.prototype.removeIpnsKey = async function (ipfs, ipnsName) {
    try {
      const hash = await this.ipfsLibrary.rmKey(ipfs, ipnsName);
      this.getLogger().info("Successfully removed IPNS name: " + ipnsName);
      return hash;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to remove an IPNS Key...");
  };

  IpfsWrapper.prototype.renameIpnsName = async function (ipfs, oldIpnsName, newIpnsName) {
    try {
      const { id: key, was, now } = await this.ipfsLibrary.renameKey(ipfs, oldIpnsName, newIpnsName);
      this.getLogger().info("Successfully renamed IPNS name: " + was + " with " + now);
      return {
        ipnsKey: key,
        ipnsName: now,
      };
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to rename an IPNS name...");
  };

  IpfsWrapper.prototype.getIpnsKeys = async function (ipfs) {
    try {
      const keys = await this.ipfsLibrary.getKeys(ipfs);
      this.getLogger().info("Successfully fetched IPNS keys...");
      return keys;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to fetch IPNS keys...");
  };

  IpfsWrapper.prototype.fetchFromIpfs = async function (ipfs, cid) {
    // Check
    if (cid == undefined || cid == null || cid.trim() === "") {
      throw new Error("Undefined IPNS identifier...");
    }
    const pathname = "/" + ipfsKeyword + "/" + cid.trim();
    try {
      const fetched = await this.ipfsLibrary.cat(ipfs, pathname);
      const url = await this.ipfsUrl.normalizeUrl(pathname);
      this.getLogger().info("Successfully fetched:" + "\n " + url.href);
      return fetched;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to fetch from IPFS...");
  };

  IpfsWrapper.prototype.addToIpfs = async function (ipfs, content) {
    try {
      const { hash, size } = await this.ipfsLibrary.add(ipfs, content);
      const pathname = "/" + ipfsKeyword + "/" + hash;
      const url = await this.ipfsUrl.normalizeUrl(pathname);
      this.getLogger().info("Successfully added " + size + " bytes:" + "\n " + url.href);
      return {
        added: hash,
        size: size,
      };
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to add content to IPFS...");
  };

  IpfsWrapper.prototype.resolveIpnsKey = async function (ipfs, ipnsKey) {
    // Check
    if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() === "") {
      throw new Error("Undefined IPNS key...");
    }
    const pathname = "/" + ipnsKeyword + "/" + ipnsKey.trim();
    try {
      const url = await this.ipfsUrl.normalizeUrl(pathname);
      const resolved = await this.ipfsLibrary.resolve(ipfs, pathname);
      const { cid } = await this.ipfsLibrary.decodeCid(resolved);
      if (cid !== null) {
        const parsed = await this.ipfsUrl.normalizeUrl(resolved);
        this.getLogger().info("Successfully resolved IPNS key:" + "\n " + url.href + "\n " + parsed.href);
        return cid;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to resolve an IPNS key...");
  };

  IpfsWrapper.prototype.publishToIpns = async function (ipfs, ipnsKey, ipnsName, cid) {
    // Check
    if (ipnsKey == undefined || ipnsKey == null || ipnsKey.trim() === "") {
      throw new Error("Undefined IPNS key...");
    }
    if (cid == undefined || cid == null || cid.trim() === "") {
      throw new Error("Undefined IPNS identifier...");
    }
    // Path
    const key = "/" + ipnsKeyword + "/" + ipnsKey.trim();
    const pathname = "/" + ipfsKeyword + "/" + cid;
    try {
      // Publish
      const published = await this.ipfsLibrary.publish(ipfs, ipnsName, pathname);
      const keyParsed = await this.ipfsUrl.normalizeUrl(key);
      const url = await this.ipfsUrl.normalizeUrl(pathname);
      this.getLogger().info(
        "Successfully published IPNS name: " + ipnsName + "\n " + keyParsed.href + "\n " + url.href
      );
      return published;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to publish an IPNS name...");
  };

  IpfsWrapper.prototype.pinToIpfs = async function (ipfs, cid) {
    // Check
    if (cid == undefined || cid == null || cid.trim() === "") {
      throw new Error("Undefined IPNS identifier...");
    }
    const pathname = "/" + ipfsKeyword + "/" + cid.trim();
    try {
      const pinned = await this.ipfsLibrary.pin(ipfs, pathname);
      const url = await this.ipfsUrl.normalizeUrl(pathname);
      this.getLogger().info("Successfully pinned:" + "\n " + url.href);
      return pinned;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to pin to IPFS...");
  };

  IpfsWrapper.prototype.unpinFromIpfs = async function (ipfs, cid) {
    // Check
    if (cid == undefined || cid == null || cid.trim() === "") {
      throw new Error("Undefined IPNS identifier...");
    }
    const pathname = "/" + ipfsKeyword + "/" + cid.trim();
    try {
      const unpinned = await this.ipfsLibrary.unpin(ipfs, pathname);
      const url = await this.ipfsUrl.normalizeUrl(pathname);
      this.getLogger().info("Successfully unpinned:" + "\n " + url.href);
      return unpinned;
    } catch (error) {
      this.getLogger().error(error);
    }
    throw new Error("Failed to unpin from IPFS...");
  };

  exports.IpfsWrapper = IpfsWrapper;
})();
