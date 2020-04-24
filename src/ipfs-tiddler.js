/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Tiddler

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

  const fileProtocol = "file:";
  const ipnsKeyword = "ipns";

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
    "type"
  ];

  var IpfsTiddler = function() {
    this.once = false;
    this.ipfsWrapper = new IpfsWrapper();
  };

  IpfsTiddler.prototype.getLogger = function() {
    return window.log.getLogger(name);
  };

  IpfsTiddler.prototype.init = function() {
    // Init once
    if (this.once) {
      return;
    }
    const self = this;
    // Wiki
    $tw.wiki.addEventListener("change", function(changes) {
      return self.handleChangeEvent(changes);
    });
    // Hook
    $tw.hooks.addHook("th-deleting-tiddler", async function(tiddler) {
      return await self.handleDeleteTiddler(tiddler);
    });
    $tw.hooks.addHook("th-importing-tiddler", function(tiddler) {
      return self.handleFileImport(tiddler);
    });
    $tw.hooks.addHook("th-saving-tiddler", async function(tiddler) {
      return await self.handleSaveTiddler(tiddler);
    });
    // Widget
    $tw.rootWidget.addEventListener("tm-ipfs-pin", async function(event) {
      return await self.handleIpfsPin(event);
    });
    $tw.rootWidget.addEventListener("tm-refresh-tiddler", async function(event) {
      return await self.handleRefreshTiddler(event);
    });
    $tw.rootWidget.addEventListener("tm-ipfs-unpin", async function(event) {
      return await self.handleIpfsUnpin(event);
    });
    // Init once
    this.once = true;
  };

  IpfsTiddler.prototype.handleChangeEvent = function(changes) {
    // Gateway preference
    const gateway = changes["$:/ipfs/saver/gateway"];
    if (gateway !== undefined && gateway.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl();
      if ($tw.utils.getIpfsUrlPolicy() === "gateway") {
        this.getLogger().info("Gateway Relative URL:" + "\n " + base.toString());
      }
    }
    // IPNS name preference
    const name = changes["$:/ipfs/saver/ipns/name"];
    if (name !== undefined && name.modified) {
      const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined) {
        if ($tw.utils.getIpfsIpnsKey() !== null) {
          const updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            fields: [{ key: "text", value: "" }]
          });
          $tw.wiki.addTiddler(updatedTiddler);
        }
      }
    }
    // Policy preference
    const policy = changes["$:/ipfs/saver/policy"];
    if (policy !== undefined && policy.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl();
      if ($tw.utils.getIpfsUrlPolicy() === "origin") {
        this.getLogger().info("Origin base URL:" + "\n " + base.toString());
      } else {
        this.getLogger().info("Gateway base URL:" + "\n " + base.toString());
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

  IpfsTiddler.prototype.handleIpfsPin = async function(event) {
    try {
      const title = event.tiddlerTitle;

      // Load tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler == undefined || tiddler == null) {
        $tw.utils.alert(name, "Unknown tiddler: " + title);
        return false;
      }

      // Tiddler
      if (event.param !== undefined && event.param !== null) {
        // Process fields
        for (var name in tiddler.fields) {
          // Reserved fields
          if (reservedFields.indexOf(name) !== -1) {
            continue;
          }
          // Technical fields
          if (name === "_canonical_uri" || name == "_import_uri") {
            continue;
          }
          // Process
          var uri = null;
          var value = tiddler.getFieldString(name);
          // URI or not
          try {
            uri = await $tw.ipfs.normalizeIpfsUrl(value);
          } catch (error) {
            // Ignore
          }
          // Process
          if (uri !== null) {
            try {
              await this.ipfsPin(name, uri);
            } catch (error) {
              this.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            }
          }
        }
        // Document
      } else {
        const url = await $tw.ipfs.getDocumentUrl();
        await this.ipfsPin("document", url);
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsTiddler.prototype.ipfsPin = async function(name, url) {
    // Check
    if (url == undefined || url == null) {
      throw new Error("Undefined URL...");
    }

    if (url.protocol === fileProtocol) {
      throw new Error("Unable to Pin a local filesystem resource...");
    }

    if (url.pathname === "/") {
      throw new Error("Unknown pathname...");
    }

    // Extract and check URL IPFS protocol and cid
    var { protocol, cid } = this.ipfsWrapper.decodeCid(url.pathname);

    // Process if valid
    if (protocol !== null && cid !== null) {
      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve ipns key if applicable
      if (protocol === ipnsKeyword) {
        const { ipnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      }

      this.getLogger().info("Pinning reference: " + name + "\n " + url.href);

      // Pin
      await this.ipfsWrapper.pinToIpfs(ipfs, cid);

      // Remove unpin request
      $tw.ipfs.removeFromUnpin(cid);
    }
  };

  IpfsTiddler.prototype.handleIpfsUnpin = async function(event) {
    try {
      const title = event.tiddlerTitle;

      // Load tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler == undefined || tiddler == null) {
        $tw.utils.alert(name, "Unknown tiddler: " + title);
        return false;
      }

      // Tiddler
      if (event.param !== undefined && event.param !== null) {
        // Process fields
        for (var name in tiddler.fields) {
          // Reserved fields
          if (reservedFields.indexOf(name) !== -1) {
            continue;
          }
          // Technical fields
          if (name === "_canonical_uri" || name == "_import_uri") {
            continue;
          }
          // Process
          var uri = null;
          var value = tiddler.getFieldString(name);
          // URI or not
          try {
            uri = await $tw.ipfs.normalizeIpfsUrl(value);
          } catch (error) {
            // Ignore
          }
          // Process
          if (uri !== null) {
            try {
              await this.ipfsUnpin(name, uri);
            } catch (error) {
              this.getLogger().error(error);
              $tw.utils.alert(name, error.message);
            }
          }
        }
        // Document
      } else {
        const url = await $tw.ipfs.getDocumentUrl();
        await this.ipfsUnpin("document", url);
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsTiddler.prototype.ipfsUnpin = async function(name, url) {
    // Check
    if (url == undefined || url == null) {
      throw new Error("Undefined URL...");
    }

    if (url.protocol === fileProtocol) {
      throw new Error("Unable to Unpin a local filesystem resource...");
    }

    if (url.pathname === "/") {
      throw new Error("Unknown pathname...");
    }

    // Extract and check URL IPFS protocol and cid
    var { protocol, cid } = this.ipfsWrapper.decodeCid(url.pathname);

    // Process if valid
    if (protocol !== null && cid !== null) {
      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve IPNS key if applicable
      if (protocol === ipnsKeyword) {
        const { ipnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      }

      this.getLogger().info("Unpinning reference: " + name + "\n " + url.href);

      // Unpin
      await this.ipfsWrapper.unpinFromIpfs(ipfs, cid);

      // Remove unpin request
      $tw.ipfs.removeFromUnpin(cid);
    }
  };

  IpfsTiddler.prototype.updateLoggers = function(level) {
    window.log.setLevel(level, false);
    const loggers = window.log.getLoggers();
    for (var property in loggers) {
      if (Object.prototype.hasOwnProperty.call(loggers, property)) {
        const logger = window.log.getLogger(property);
        logger.setLevel(level, false);
      }
    }
  };

  IpfsTiddler.prototype.handleDeleteTiddler = async function(tiddler) {
    // Process fields
    for (var name in tiddler.fields) {
      // Reserved fields
      if (reservedFields.indexOf(name) !== -1) {
        continue;
      }
      // Technical fields
      if (name === "_canonical_uri" || name == "_import_uri") {
        continue;
      }
      // Process
      var uri = null;
      var value = tiddler.getFieldString(name);
      // URI or not
      try {
        uri = await $tw.ipfs.normalizeIpfsUrl(value);
      } catch (error) {
        // Ignore
      }
      // Process
      if (uri !== null) {
        try {
          const { cid } = this.ipfsWrapper.decodeCid(uri.pathname);
          // Request to unpin
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.requestToUnpin(cid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        }
      }
    }
    return tiddler;
  };

  IpfsTiddler.prototype.handleFileImport = function(tiddler) {
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

  IpfsTiddler.prototype.handleRefreshTiddler = async function(event) {
    // current tiddler title
    const title = event.tiddlerTitle;

    // Load tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown tiddler: " + title);
      return false;
    }

    // Process fields
    for (var name in tiddler.fields) {
      // Not a reserved keyword
      if (reservedFields.indexOf(name) !== -1) {
        continue;
      }
      // Process
      var uri = null;
      var value = tiddler.getFieldString(name);
      if (value !== undefined && value !== null) {
        // URI or not
        try {
          uri = await $tw.ipfs.normalizeIpfsUrl(value);
        } catch (error) {
          // Ignore
        }
        // Process once
        if (uri !== undefined && uri !== null && (name === "_canonical_uri" || name === "_import_uri")) {
          // Empty text to force a refresh
          const updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            fields: [{ key: "text", value: "" }]
          });
          $tw.wiki.addTiddler(updatedTiddler);
          return true;
        }
      }
    }
    return true;
  };

  IpfsTiddler.prototype.handleSaveTiddler = async function(tiddler) {
    var updatedTiddler = new $tw.Tiddler(tiddler);
    var type = null;
    var info = null;

    // Retrieve Content-Type
    try {
      var { type, info } = $tw.ipfs.getContentType(tiddler);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      $tw.wiki.addTiddler(updatedTiddler);
      return updatedTiddler;
    }

    // Previous tiddler
    const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);

    // Process deleted fields
    if (oldTiddler !== undefined && oldTiddler !== null) {
      for (var name in oldTiddler.fields) {
        // Not a reserved keyword
        if (reservedFields.indexOf(name) !== -1) {
          continue;
        }
        // Discard updated
        const field = tiddler.fields[name];
        if (field !== undefined && field !== null && tiddler.getFieldString(name).trim() !== "") {
          continue;
        }
        // Process
        const value = oldTiddler.getFieldString(name);
        var { uri, cid } = await this.ipfsWrapper.decodeUrl(value);
        if (name === "_canonical_uri") {
          var content = tiddler.getFieldString("text");
          // Attachment
          if (info.encoding === "base64" || type === "image/svg+xml") {
            // Embed
            if (uri !== null) {
              try {
                if (info.encoding === "base64") {
                  content = await $tw.utils.loadToBase64(uri);
                } else {
                  content = await $tw.utils.loadToUtf8(uri);
                }
                updatedTiddler = $tw.utils.updateTiddler({
                  tiddler: updatedTiddler,
                  addTags: ["$:/isAttachment", "$:/isEmbedded"],
                  fields: [{ key: "text", value: content.data }]
                });
                this.getLogger().info("Embed attachment: " + content.data.length + " bytes" + "\n " + uri.href);
              } catch (error) {
                this.getLogger().error(error);
                $tw.utils.alert(name, error.message);
              }
            }
          }
        }
        // Unpin
        if (uri !== null && name === "_export_uri") {
          try {
            // Unpin request
            if ($tw.utils.getIpfsUnpin() && cid !== null) {
              $tw.ipfs.requestToUnpin(cid);
            }
          } catch (error) {
            this.getLogger().error(error);
            $tw.utils.alert(name, error.message);
          }
        }
      }
    }

    // Special fields
    var canonicalUri = null;
    var exportUri = null;
    var importUri = null;
    var canonicalCid = null;
    var exportCid = null;
    var importCid = null;

    // Process new and updated fields
    for (var name in tiddler.fields) {
      // Not a reserved keyword
      if (reservedFields.indexOf(name) !== -1) {
        continue;
      }
      // Process
      const value = tiddler.getFieldString(name);
      const { uri, cid } = await this.ipfsWrapper.decodeUrl(value);
      // Store
      if (name === "_canonical_uri") {
        canonicalUri = uri;
        canonicalCid = cid;
      }
      if (name === "_import_uri") {
        importUri = uri;
        importCid = cid;
      }
      if (name === "_export_uri") {
        exportUri = uri;
        exportCid = cid;
      }

      // Previous values if any
      var oldValue = null;
      if (oldTiddler !== undefined && oldTiddler !== null) {
        oldValue = oldTiddler.getFieldString(name);
      }
      const { uri: oldUri, cid: oldCid } = await this.ipfsWrapper.decodeUrl(oldValue);
      // Process new or updated
      if (value === oldValue) {
        continue;
      }
      // Process _canonical_uri
      if (name === "_canonical_uri") {
        updatedTiddler = $tw.utils.updateTiddler({
          tiddler: updatedTiddler,
          fields: [{ key: "text", value: "" }]
        });
      }
      // Unpin request
      if (oldUri !== null && name === "_export_uri") {
        try {
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        }
      }
      // Discard unpin request
      if (uri !== null) {
        try {
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.discardRequestToUnpin(cid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        }
      }
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
        removeTags: removeTags
      });
    }

    // Update
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  };

  exports.IpfsTiddler = IpfsTiddler;
})();
