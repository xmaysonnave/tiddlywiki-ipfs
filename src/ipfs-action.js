/*\
title: $:/plugins/ipfs/ipfs-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Action

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const fileProtocol = "file:";
  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-action";

  var IpfsAction = function () {
    this.once = false;
    this.console = false;
    this.ipnsName = $tw.utils.getIpfsIpnsName();
    this.ipnsKey = $tw.utils.getIpfsIpnsKey();
  };

  IpfsAction.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsAction.prototype.init = function () {
    // Init once
    if (this.once) {
      return;
    }
    const self = this;
    // Widget
    $tw.rootWidget.addEventListener("tm-ipfs-export", async function (event) {
      return await self.handleExportToIpfs(event, false);
    });
    $tw.rootWidget.addEventListener("tm-ipfs-export-content", async function (event) {
      return await self.handleExportToIpfs(event, true);
    });
    $tw.rootWidget.addEventListener("tm-ipns-fetch", async function (event) {
      return await self.handleFetchIpnsKey(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-generate", async function (event) {
      return await self.handleGenerateIpnsKey(event);
    });
    $tw.rootWidget.addEventListener("tm-console-mobile", async function (event) {
      return await self.handleMobileConsole(event);
    });
    $tw.rootWidget.addEventListener("tm-ipfs-export-attachment", async function (event) {
      return await self.handleExportAttachmentToIpfs(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-publish", async function (event) {
      return await self.handlePublishToIpns(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-remove", async function (event) {
      return await self.handleRemoveIpnsKey(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-rename", async function (event) {
      return await self.handleRenameIpnsName(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-resolve-and-open", async function (event) {
      return await self.handleResolveIpnsKeyAndOpen(event);
    });
    // Init once
    this.once = true;
  };

  IpfsAction.prototype.handleExportToIpfs = async function (event, child) {
    var cid = null;
    var ipnsKey = null;
    var ipnsName = null;
    var normalizedUrl = null;
    var added = null;
    var fields = [];
    const title = event.tiddlerTitle;
    var tiddler = $tw.wiki.getTiddler(title);
    var exportUri = tiddler.getFieldString("_export_uri");
    try {
      var { cid, ipnsKey, ipnsName, normalizedUrl } = await $tw.ipfs.resolveUrl(false, exportUri);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    // Retrieve content
    const content = await this.exportTiddler(tiddler, child);
    // Check
    if (content == null) {
      return false;
    }
    this.getLogger().info("Uploading Tiddler: " + content.length + " bytes");
    try {
      var { added } = await $tw.ipfs.addToIpfs(content);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    // Prepare New value
    fields.push({ key: "_export_uri", value: "/" + ipfsKeyword + "/" + added });
    var tiddler = $tw.wiki.getTiddler(title);
    var updatedTiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: ["$:/isExported", "$:/isIpfs"],
      fields: fields,
    });
    $tw.wiki.addTiddler(updatedTiddler);
    $tw.ipfs.requestToPin(added);
    $tw.ipfs.requestToUnpin(cid);
    if (ipnsKey !== null) {
      // Publish to IPNS
      this.getLogger().info("Publishing IPNS name: " + ipnsName);
      $tw.ipfs
        .requestToUnpin(null, ipnsKey, normalizedUrl)
        .then(() => {
          $tw.ipfs
            .publishIpnsName(added, ipnsKey, ipnsName)
            .then(() => {
              fields.push({ key: "_export_uri", value: exportUri });
              tiddler = $tw.utils.updateTiddler({
                tiddler: tiddler,
                addTags: ["$:/isExported", "$:/isIpfs"],
                fields: fields,
              });
              $tw.wiki.addTiddler(tiddler);
              $tw.utils.alert("Successfully Published IPNS name...");
            })
            .catch((error) => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        })
        .catch((error) => {
          self.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        });
    } else if (normalizedUrl !== null && normalizedUrl.hostname.endsWith(".eth")) {
      $tw.ipfs
        .setEns(normalizedUrl.hostname, added)
        .then(() => {
          fields.push({ key: "_export_uri", value: exportUri });
          tiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            addTags: ["$:/isExported", "$:/isIpfs"],
            fields: fields,
          });
          $tw.wiki.addTiddler(tiddler);
          $tw.utils.alert("Successfully Published ENS...");
        })
        .catch((error) => {
          self.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        });
    }
    return true;
  };

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function (event) {
    const title = event.tiddlerTitle;
    var tiddler = $tw.wiki.getTiddler(title);
    const { type, info } = $tw.utils.getContentType(tiddler);
    var added = null;
    if (info.encoding !== "base64" && type !== "image/svg+xml") {
      $tw.utils.alert(name, "This Tiddler do not contain any Attachment...");
      return false;
    }
    // Do not process if _canonical_uri is set
    const canonical_uri = tiddler.getFieldString("_canonical_uri");
    if (canonical_uri !== undefined && canonical_uri !== null) {
      $tw.utils.alert(name, "Attachment is already published...");
      return false;
    }
    try {
      const content = this.getAttachmentContent(tiddler);
      if (content == null) {
        return false;
      }
      this.getLogger().info("Uploading attachment: " + content.length + " bytes");
      var { added } = await $tw.ipfs.addToIpfs(content);
      await $tw.ipfs.requestToPin(added);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    var addTags = [];
    var removeTags = [];
    if ($tw.crypto.hasPassword()) {
      addTags = ["$:/isAttachment", "$:/isIpfs"];
      removeTags = ["$:/isEmbedded"];
    } else {
      addTags = ["$:/isAttachment", "$:/isIpfs"];
      removeTags = ["$:/isEmbedded"];
    }
    // Update
    tiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: addTags,
      removeTags: removeTags,
      fields: [
        { key: "text", value: "" },
        { key: "_canonical_uri", value: "/" + ipfsKeyword + "/" + added },
      ],
    });
    $tw.wiki.addTiddler(tiddler);
    return true;
  };

  IpfsAction.prototype.getAttachmentContent = function (tiddler) {
    const { type, info } = $tw.utils.getContentType(tiddler);
    if (info.encoding !== "base64" && type !== "image/svg+xml") {
      $tw.utils.alert(name, "Unsupported Tiddler Content-Type...");
      return null;
    }
    var text = tiddler.getFieldString("text");
    if (text == undefined || text == null) {
      $tw.utils.alert(name, "Empty attachment content...");
      return null;
    }
    if ($tw.crypto.hasPassword()) {
      try {
        // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/9
        if (info.encoding === "base64") {
          text = atob(text);
        }
        text = $tw.crypto.encrypt(text, $tw.crypto.currentPassword);
        text = $tw.utils.StringToUint8Array(text);
      } catch (error) {
        this.getLogger().error(error);
        $tw.utils.alert(name, "Failed to process encrypted Attachment content...");
        return null;
      }
    } else {
      try {
        if (info.encoding === "base64") {
          text = $tw.utils.Base64ToUint8Array(text);
        } else {
          text = $tw.utils.StringToUint8Array(text);
        }
      } catch (error) {
        this.getLogger().error(error);
        $tw.utils.alert(name, "Failed to process Attachment content...");
        return null;
      }
    }
    return text;
  };

  IpfsAction.prototype.handleRenameIpnsName = async function (event) {
    var ipnsKey = null;
    const ipnsName = $tw.utils.getIpfsIpnsName();
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }
    if (this.ipnsName == null || this.ipnsName === ipnsName) {
      $tw.utils.alert(name, "Nothing to rename....");
      return false;
    }
    try {
      var { ipnsKey } = await $tw.ipfs.renameIpnsName(this.ipnsName, ipnsName);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: ipnsKey }],
      });
      $tw.wiki.addTiddler(tiddler);
    }
    this.ipnsKey = ipnsKey;
    this.ipnsName = ipnsName;
    return true;
  };

  IpfsAction.prototype.handleGenerateIpnsKey = async function (event) {
    var ipnsKey = null;
    const ipnsName = $tw.utils.getIpfsIpnsName();
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }
    try {
      var ipnsKey = await $tw.ipfs.generateIpnsKey(ipnsName);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: ipnsKey }],
      });
      $tw.wiki.addTiddler(tiddler);
    }
    this.ipnsKey = ipnsKey;
    this.ipnsName = ipnsName;
    return true;
  };

  IpfsAction.prototype.handleRemoveIpnsKey = async function (event) {
    var ipnsKey = null;
    var normalizedUrl = null;
    const ipnsName = $tw.utils.getIpfsIpnsName();
    const self = this;
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }
    try {
      var { ipnsKey, normalizedUrl } = await $tw.ipfs.getIpnsIdentifiers(ipnsName);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return;
    }
    // Async
    $tw.ipfs
      .requestToUnpin(null, ipnsKey, normalizedUrl)
      .then(() => {
        $tw.ipfs
          .removeIpnsKey(ipnsName)
          .then(() => {
            $tw.utils.alert(name, "Succesfully removed Ipns key....");
          })
          .catch((error) => {
            self.getLogger().error(error);
            $tw.utils.alert(name, error.message);
          });
      })
      .catch((error) => {
        self.getLogger().error(error);
        $tw.utils.alert(name, error.message);
      });
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: "" }],
      });
      $tw.wiki.addTiddler(updatedTiddler);
    }
    tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: "" }],
      });
      $tw.wiki.addTiddler(updatedTiddler);
    }
    this.ipnsName = null;
    this.ipnsKey = null;
    return true;
  };

  IpfsAction.prototype.handleFetchIpnsKey = async function (event) {
    var ipnsKey = null;
    const ipnsName = $tw.utils.getIpfsIpnsName();
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }
    try {
      var { ipnsKey } = await $tw.ipfs.getIpnsIdentifiers(ipnsName);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: ipnsKey }],
      });
      $tw.wiki.addTiddler(tiddler);
      this.ipnsKey = ipnsKey;
    }
    this.ipnsName = ipnsName;
    return true;
  };

  IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function (event) {
    var ipnsKey = null;
    const ipnsName = $tw.utils.getIpfsIpnsName();
    var normalizedUrl = null;
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }
    try {
      var { ipnsKey, normalizedUrl } = await $tw.ipfs.resolveUrl(false, "/" + ipnsKeyword + "/" + ipnsName);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: ipnsKey }],
      });
      this.ipnsKey = ipnsKey;
      $tw.wiki.addTiddler(tiddler);
    }
    this.ipnsName = ipnsName;
    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    return true;
  };

  IpfsAction.prototype.handleMobileConsole = async function (tiddler) {
    // Load mobile console if applicable
    if (typeof window.eruda === "undefined") {
      try {
        // Load eruda
        await $tw.ipfs.ipfsBundle.ipfsLoader.loadErudaLibrary();
      } catch (error) {
        this.getLogger().error(error);
        throw new Error(error.message);
      }
      const eruda = window.document.createElement("div");
      window.document.body.appendChild(eruda);
      window.eruda.init({
        container: eruda,
        tool: ["console"],
        useShadowDom: false,
      });
      // Inherit font
      eruda.style.fontFamily = "inherit";
      // Preserve user preference if any, default is 80
      if (window.eruda.get().config.get("displaySize") === 80) {
        window.eruda.get().config.set("displaySize", 40);
      }
      // Preserve user preference if any, default is 0.95
      if (window.eruda.get().config.get("transparency") === 0.95) {
        window.eruda.get().config.set("transparency", 1);
      }
      // Remove the button
      const buttons = document.getElementsByClassName("eruda-entry-btn");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].remove();
      }
      // The first output line is eaten...
      this.getLogger().info("Mobile console has been loaded...");
    }
    if (this.console == false) {
      // Show
      window.eruda.show();
      window.eruda.show("console");
      this.console = true;
    } else {
      window.eruda.hide();
      this.console = false;
    }
  };

  IpfsAction.prototype.handlePublishToIpns = async function (event) {
    const self = this;
    var currentCid = null;
    var currentIpnsKey = null;
    var ipnsKey = null;
    const ipnsName = $tw.utils.getIpfsIpnsName();
    var normalizedUrl = null;
    const wiki = $tw.ipfs.getDocumentUrl();
    if (wiki.protocol === fileProtocol) {
      $tw.utils.alert(name, "Undefined IPFS identifier...");
      return false;
    }
    if (wiki.pathname === "/") {
      $tw.utils.alert(name, "Unknown IPFS identifier...");
      return false;
    }
    if (ipnsName == null) {
      $tw.utils.alert(name, "Undefined IPNS name....");
      return false;
    }
    try {
      var { ipnsKey, normalizedUrl } = await $tw.ipfs.getIpnsIdentifiers(ipnsName);
      var { cid: currentCid, ipnsKey: currentIpnsKey } = await $tw.ipfs.resolveUrl(false, wiki);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return;
    }
    if (currentCid == null || currentIpnsKey == null) {
      $tw.utils.alert(name, "Unknown IPFS identifier...");
      return false;
    }
    if (currentIpnsKey !== null && currentIpnsKey === ipnsKey) {
      $tw.utils.alert(name, "Default IPNS key matches current IPNS key....");
      return false;
    }
    $tw.ipfs
      .requestToUnpin(null, ipnsKey, normalizedUrl)
      .then(() => {
        $tw.ipfs
          .publishIpnsName(currentCid, ipnsKey, ipnsName)
          .then(() => {
            $tw.utils.alert("Successfully Published IPNS name...");
          })
          .catch((error) => {
            self.getLogger().error(error);
            $tw.utils.alert(name, error.message);
          });
      })
      .catch((error) => {
        self.getLogger().error(error);
        $tw.utils.alert(name, error.message);
      });
    return true;
  };

  IpfsAction.prototype.exportTiddlersAsJson = async function (filter, spaces) {
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
        var ipnsKey = null;
        var fieldValue = tiddler.getFieldString(field);
        try {
          var { cid, ipnsKey } = await $tw.ipfs.resolveUrl(false, fieldValue);
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        }
        if (cid !== null || ipnsKey !== null) {
          isIpfs = true;
        }
        // IPNS
        if (ipnsKey !== null) {
          fieldValue = "/" + ipnsKeyword + "/" + ipnsKey;
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

  IpfsAction.prototype.exportTiddler = async function (tiddler, child) {
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

  IpfsAction.prototype.transcludeContent = function (title) {
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

  IpfsAction.prototype.locateTiddlers = function (transclude, tiddlers) {
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

  exports.IpfsAction = IpfsAction;
})();
