/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Tiddler

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const IpfsImport = require("$:/plugins/ipfs/ipfs-import.js").IpfsImport;

  const name = "ipfs-tiddler";

  /*
   * https://tiddlywiki.com/#TiddlerFields
   * $:/core/modules/server/routes/get-tiddler.js
   * TODO: expose it as Tiddler ??
   */
  const reservedFields = [
    "bag",
    "caption",
    "class",
    "color",
    "description",
    "created",
    "creator",
    "fields",
    "footer",
    "hide-body",
    "icon",
    "_is_skinny",
    "library",
    "list",
    "list-after",
    "list-before",
    "modified",
    "modifier",
    "name",
    "plugin-priority",
    "plugin-type",
    "permissions",
    "recipe",
    "revision",
    // "source",
    "subtitle",
    "tags",
    "text",
    // "url",
    "throttle.refresh",
    "toc-link",
    "title",
    "type",
  ];

  var IpfsTiddler = function () {
    this.once = false;
  };

  IpfsTiddler.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsTiddler.prototype.init = function () {
    // Init once
    if (this.once) {
      return;
    }
    const self = this;
    // Wiki
    $tw.wiki.addEventListener("change", function (changes) {
      return self.handleChangeEvent(changes);
    });
    // Hook
    $tw.hooks.addHook("th-deleting-tiddler", async function (tiddler) {
      return await self.handleDeleteTiddler(tiddler);
    });
    $tw.hooks.addHook("th-importing-tiddler", function (tiddler) {
      return self.handleFileImport(tiddler);
    });
    $tw.hooks.addHook("th-saving-tiddler", async function (tiddler) {
      return await self.handleSaveTiddler(tiddler);
    });
    // Widget
    $tw.rootWidget.addEventListener("tm-ipfs-pin", function (event) {
      return self.handleIpfsPin(event);
    });
    $tw.rootWidget.addEventListener("tm-refresh-tiddler", function (event) {
      return self.handleRefreshTiddler(event);
    });
    $tw.rootWidget.addEventListener("tm-ipfs-unpin", function (event) {
      return self.handleIpfsUnpin(event);
    });
    // Init once
    this.once = true;
  };

  IpfsTiddler.prototype.handleChangeEvent = function (changes) {
    // Gateway preference
    const gateway = changes["$:/ipfs/saver/gateway"];
    if (gateway !== undefined && gateway.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl();
      if ($tw.utils.getIpfsUrlPolicy() === "gateway") {
        this.getLogger().info("Gateway Relative URL:" + "\n " + base);
      }
    }
    // Policy preference
    const policy = changes["$:/ipfs/saver/policy"];
    if (policy !== undefined && policy.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl();
      if ($tw.utils.getIpfsUrlPolicy() === "origin") {
        this.getLogger().info("Origin base URL:" + "\n " + base);
      } else {
        this.getLogger().info("Gateway base URL:" + "\n " + base);
      }
    }
    // Unpin preference
    const unpin = changes["$:/ipfs/saver/unpin"];
    if (unpin !== undefined && unpin.modified) {
      if ($tw.utils.getIpfsUnpin()) {
        this.getLogger().info("Unpin previous IPFS content...");
      } else {
        this.getLogger().info("Do not unpin previous IPFS content...");
      }
    }
    // Verbose preference
    const verbose = changes["$:/ipfs/saver/verbose"];
    if (verbose !== undefined && verbose.modified) {
      if ($tw.utils.getIpfsVerbose()) {
        this.updateLoggers("info");
      } else {
        this.updateLoggers("warn");
      }
    }
  };

  IpfsTiddler.prototype.handleIpfsPin = function (event) {
    const title = event.tiddlerTitle;
    const tiddler = $tw.wiki.getTiddler(title);
    if (event.param !== undefined && event.param !== null) {
      // Tiddler
      for (var field in tiddler.fields) {
        if (reservedFields.indexOf(field) !== -1) {
          continue;
        }
        const value = tiddler.getFieldString(field);
        if (value !== undefined && value !== null) {
          this.ipfsPin(value, field);
        }
      }
    } else {
      // Wiki
      this.ipfsPin($tw.ipfs.getDocumentUrl().href, "Wiki");
    }
    return true;
  };

  IpfsTiddler.prototype.ipfsPin = function (value, field) {
    if (value == undefined || value == null || value.trim() === "") {
      return;
    }
    if (field == undefined || field == null || field.trim() === "") {
      return;
    }
    const self = this;
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then((data) => {
        const { cid, resolvedUrl } = data;
        if (resolvedUrl !== null && cid !== null) {
          self.getLogger().info("Pinning: '" + field + "'.\n " + resolvedUrl);
          $tw.ipfs
            .pinToIpfs(cid)
            .then((data) => {
              if (data !== undefined && data !== null) {
                $tw.ipfs.removeFromPinUnpin(cid, resolvedUrl);
                $tw.utils.alert(
                  name,
                  'Successfully Pinned : <a rel="noopener noreferrer" target="_blank" href="' +
                    resolvedUrl +
                    '">' +
                    field +
                    "</a>"
                );
              }
            })
            .catch((error) => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        }
      })
      .catch((error) => {
        self.getLogger().error(error);
        $tw.utils.alert(name, error.message);
      });
  };

  IpfsTiddler.prototype.handleIpfsUnpin = async function (event) {
    const title = event.tiddlerTitle;
    const tiddler = $tw.wiki.getTiddler(title);
    if (event.param !== undefined && event.param !== null) {
      // Tiddler
      for (var field in tiddler.fields) {
        if (reservedFields.indexOf(field) !== -1) {
          continue;
        }
        const value = tiddler.getFieldString(field);
        if (value !== undefined && value !== null) {
          this.ipfsUnpin(value, field);
        }
      }
    } else {
      // Wiki
      this.ipfsUnpin($tw.ipfs.getDocumentUrl().href, "Wiki");
    }
    return true;
  };

  IpfsTiddler.prototype.ipfsUnpin = function (value, field) {
    if (value == undefined || value == null || value.trim() === "") {
      return;
    }
    if (field == undefined || field == null || field.trim() === "") {
      return;
    }
    const self = this;
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then((data) => {
        const { cid, resolvedUrl } = data;
        if (resolvedUrl !== null && cid !== null) {
          self.getLogger().info("Unpinning: '" + field + "'.\n " + resolvedUrl);
          $tw.ipfs
            .unpinFromIpfs(cid)
            .then((data) => {
              if (data !== undefined && data !== null) {
                $tw.ipfs.removeFromPinUnpin(cid, resolvedUrl);
                $tw.utils.alert(
                  name,
                  'Successfully Unpinned : <a rel="noopener noreferrer" target="_blank" href="' +
                    resolvedUrl +
                    '">' +
                    field +
                    "</a>"
                );
              }
            })
            .catch((error) => {
              self.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            });
        }
      })
      .catch((error) => {
        self.getLogger().error(error);
        $tw.utils.alert(name, error.message);
      });
  };

  IpfsTiddler.prototype.updateLoggers = function (level) {
    window.log.setLevel(level, false);
    const loggers = window.log.getLoggers();
    for (var property in loggers) {
      if (Object.prototype.hasOwnProperty.call(loggers, property)) {
        const logger = window.log.getLogger(property);
        logger.setLevel(level, false);
      }
    }
  };

  IpfsTiddler.prototype.handleDeleteTiddler = async function (tiddler) {
    try {
      const { type, info } = $tw.utils.getContentType(tiddler);
      // Process
      var field = null;
      if (info.encoding === "base64" || type === "image/svg+xml") {
        field = "_canonical_uri";
      } else {
        field = "_export_uri";
      }
      // Value
      var url = null;
      const value = tiddler.getFieldString(field);
      if (value !== undefined && value !== null && value !== "") {
        // URL or not
        try {
          url = $tw.ipfs.normalizeUrl(value);
        } catch (error) {
          // Ignore
        }
        // Process
        if (url !== undefined && url !== null) {
          const { cid } = $tw.ipfs.decodeCid(url.pathname);
          // Request to unpin
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.requestToUnpin(cid);
          }
        }
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    }
    return tiddler;
  };

  IpfsTiddler.prototype.handleFileImport = function (tiddler) {
    // Update tiddler
    const addition = $tw.wiki.getModificationFields();
    addition.title = tiddler.fields.title;
    addition.tags = (tiddler.fields.tags || []).slice(0);
    // Add isAttachment tag
    if (addition.tags.indexOf("$:/isAttachment") == -1) {
      $tw.utils.pushTop(addition.tags, "$:/isAttachment");
    }
    // Add isEmbedded tag
    if (addition.tags.indexOf("$:/isEmbedded") == -1) {
      $tw.utils.pushTop(addition.tags, "$:/isEmbedded");
    }
    return new $tw.Tiddler(tiddler, addition);
  };

  IpfsTiddler.prototype.handleRefreshTiddler = function (event) {
    const self = this;
    const title = event.tiddlerTitle;
    const tiddler = $tw.wiki.getTiddler(title);
    const { type, info } = $tw.utils.getContentType(tiddler);
    var hasCanonicalUrl = false;
    var canonicalUrl = tiddler.getFieldString("_canonical_uri");
    if (canonicalUrl !== undefined && canonicalUrl !== null && canonicalUrl !== "") {
      hasCanonicalUrl = true;
    } else {
      canonicalUrl = null;
    }
    var hasImportUrl = false;
    var importUrl = tiddler.getFieldString("_import_uri");
    if (importUrl !== undefined && importUrl !== null && importUrl !== "") {
      hasImportUrl = true;
    } else {
      importUrl = null;
    }
    // Nothing to do
    if (hasCanonicalUrl === false && hasImportUrl === false) {
      $tw.utils.alert(name, "Nothing to refresh here...");
      return true;
    }
    // Reload Attachment content
    if ((info.encoding === "base64" || type === "image/svg+xml") && hasCanonicalUrl && hasImportUrl === false) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: "text", value: "" }],
      });
      $tw.wiki.addTiddler(updatedTiddler);
      return true;
    }
    // Async Import
    var ipfsImport = new IpfsImport();
    ipfsImport.import(canonicalUrl, importUrl, title).catch((error) => {
      self.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    });
    return true;
  };

  IpfsTiddler.prototype.handleSaveTiddler = async function (tiddler) {
    // Previous tiddler
    const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);
    const { type, info } = $tw.utils.getContentType(tiddler);
    // Prepare
    var updatedTiddler = new $tw.Tiddler(tiddler);
    // Process deleted fields
    if (oldTiddler !== undefined && oldTiddler !== null) {
      for (var field in oldTiddler.fields) {
        // Not a reserved keyword
        if (reservedFields.indexOf(field) !== -1) {
          continue;
        }
        // Updated
        const discard = tiddler.fields[field];
        if (discard !== undefined && discard !== null && tiddler.getFieldString(field) !== "") {
          continue;
        }
        // Process
        var oldCid = null;
        var oldIpnsKey = null;
        var oldNormalizedUrl = null;
        var oldResolvedUrl = null;
        var oldUrl = null;
        var oldValue = oldTiddler.getFieldString(field);
        try {
          var {
            cid: oldCid,
            ipnsKey: oldIpnsKey,
            normalizedUrl: oldNormalizedUrl,
            resolvedUrl: oldResolvedUrl,
          } = await $tw.ipfs.resolveUrl(false, true, oldValue);
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return tiddler;
        }
        var oldUrl =
          oldResolvedUrl !== null ? oldResolvedUrl.href : oldNormalizedUrl !== null ? oldNormalizedUrl.href : null;
        if (oldUrl !== null && field === "_canonical_uri") {
          var content = tiddler.getFieldString("text");
          // Attachment
          if (info.encoding === "base64" || type === "image/svg+xml") {
            // Embed
            try {
              if (info.encoding === "base64") {
                content = await $tw.ipfs.loadToBase64(oldUrl);
              } else {
                content = await $tw.ipfs.loadToUtf8(oldUrl);
              }
              updatedTiddler = $tw.utils.updateTiddler({
                tiddler: updatedTiddler,
                addTags: ["$:/isAttachment", "$:/isEmbedded"],
                fields: [{ key: "text", value: content.data }],
              });
              this.getLogger().info("Embed attachment: " + content.data.length + " bytes" + "\n " + oldUrl);
            } catch (error) {
              this.getLogger().error(error);
              $tw.utils.alert(name, error.message);
              return tiddler;
            }
          }
        }
        $tw.ipfs.requestToUnpin(oldCid, oldIpnsKey, oldNormalizedUrl);
      }
    }
    var canonicalUri = null;
    var exportUri = null;
    var importUri = null;
    var canonicalCid = null;
    var exportCid = null;
    var importCid = null;
    // Process new and updated fields
    for (var field in tiddler.fields) {
      // Not a reserved keyword
      if (reservedFields.indexOf(field) !== -1) {
        continue;
      }
      // Process
      var cid = null;
      var ipnsKey = null;
      var normalizedUrl = null;
      var resolvedUrl = null;
      var value = tiddler.getFieldString(field);
      try {
        var { cid, ipnsKey, normalizedUrl, resolvedUrl } = await $tw.ipfs.resolveUrl(false, true, value);
      } catch (error) {
        this.getLogger().error(error);
        $tw.utils.alert(name, error.message);
        return tiddler;
      }
      // Store
      var url = resolvedUrl !== null ? resolvedUrl.href : normalizedUrl !== null ? normalizedUrl.href : null;
      if (field === "_canonical_uri") {
        canonicalUri = url;
        canonicalCid = cid;
      }
      if (field === "_import_uri") {
        importUri = url;
        importCid = cid;
      }
      if (field === "_export_uri") {
        exportUri = url;
        exportCid = cid;
      }
      // Previous values if any
      var oldValue = null;
      if (oldTiddler !== undefined && oldTiddler !== null) {
        oldValue = oldTiddler.getFieldString(field);
      }
      // Process new or updated
      if (value === oldValue) {
        continue;
      }
      var oldCid = null;
      var oldIpnsKey = null;
      var oldNormalizedUrl = null;
      try {
        var { cid: oldCid, ipnsKey: oldIpnsKey, normalizedUrl: oldNormalizedUrl } = await $tw.ipfs.resolveUrl(
          false,
          true,
          oldValue
        );
      } catch (error) {
        this.getLogger().error(error);
        $tw.utils.alert(name, error.message);
        return tiddler;
      }
      // Process _canonical_uri
      if (field === "_canonical_uri") {
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: updatedTiddler,
          fields: [{ key: "text", value: "" }],
        });
      }
      $tw.ipfs.requestToPin(cid, ipnsKey, normalizedUrl);
      $tw.ipfs.requestToUnpin(oldCid, oldIpnsKey, oldNormalizedUrl);
    }
    // Tag management
    var addTags = [];
    var removeTags = [];
    if (canonicalUri == null && exportUri == null && importUri == null) {
      removeTags.push("$:/isExported", "$:/isImported", "$:/isIpfs");
    }
    if (canonicalCid == null && exportCid == null && importCid == null) {
      if (removeTags.indexOf("$:/isIpfs") === -1) {
        removeTags.push("$:/isIpfs");
      }
    } else {
      addTags.push("$:/isIpfs");
    }
    if (canonicalUri !== null) {
      // Attachment
      if (info.encoding === "base64" || type === "image/svg+xml") {
        if (addTags.indexOf("$:/isAttachment") === -1) {
          addTags.push("$:/isAttachment");
        }
        if (removeTags.indexOf("$:/isEmbedded") === -1) {
          removeTags.push("$:/isEmbedded");
        }
        if (importUri !== null) {
          if (addTags.indexOf("$:/isImported") === -1) {
            addTags.push("$:/isImported");
          }
        } else {
          if (removeTags.indexOf("$:/isImported") === -1) {
            removeTags.push("$:/isImported");
          }
        }
        // Others
      } else {
        if (removeTags.indexOf("$:/isAttachment") === -1) {
          removeTags.push("$:/isAttachment");
        }
        if (removeTags.indexOf("$:/isEmbedded") === -1) {
          removeTags.push("$:/isEmbedded");
        }
        if (addTags.indexOf("$:/isImported") === -1) {
          addTags.push("$:/isImported");
        }
      }
    } else {
      // Attachment
      if (info.encoding === "base64" || type === "image/svg+xml") {
        if (addTags.indexOf("$:/isAttachment") === -1) {
          addTags.push("$:/isAttachment");
        }
        if (addTags.indexOf("$:/isEmbedded") === -1) {
          addTags.push("$:/isEmbedded");
        }
        // Others
      } else {
        if (removeTags.indexOf("$:/isAttachment") === -1) {
          removeTags.push("$:/isAttachment");
        }
        if (removeTags.indexOf("$:/isEmbedded") === -1) {
          removeTags.push("$:/isEmbedded");
        }
      }
      if (importUri !== null) {
        if (addTags.indexOf("$:/isImported") === -1) {
          addTags.push("$:/isImported");
        }
      } else {
        if (removeTags.indexOf("$:/isImported") === -1) {
          removeTags.push("$:/isImported");
        }
      }
    }
    if (exportUri !== null) {
      if (addTags.indexOf("$:/isExported") === -1) {
        addTags.push("$:/isExported");
      }
    } else {
      if (removeTags.indexOf("$:/isExported") === -1) {
        removeTags.push("$:/isExported");
      }
    }
    if (addTags.length > 0 || removeTags.length > 0) {
      updatedTiddler = $tw.utils.updateTiddler({
        tiddler: updatedTiddler,
        addTags: addTags,
        removeTags: removeTags,
      });
    }
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  };

  exports.IpfsTiddler = IpfsTiddler;
})();
