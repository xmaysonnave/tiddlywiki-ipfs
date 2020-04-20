/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsTiddler

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

  /*
   * $:/core/modules/server/routes/get-tiddler.js
   */
  const reservedFields = [
    "bag",
    "created",
    "creator",
    "modified",
    "modifier",
    "permissions",
    "recipe",
    "revision",
    "tags",
    "fields",
    "list",
    "text",
    "title",
    "type"
  ];

  const fileProtocol = "file:";
  const ipnsKeyword = "ipns";

  const name = "ipfs-tiddler";

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
      const self = this;

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
        $tw.utils.each(tiddler.fields, async function(field, name) {
          var uri = null;
          var value = tiddler.getFieldString(name);
          // Not a reserved keyword process
          if (reservedFields.indexOf(name) == -1) {
            // URI or not
            try {
              uri = await $tw.ipfs.normalizeIpfsUrl(value);
            } catch (error) {
              // Ignore
            }
            // Process
            if (uri !== null) {
              try {
                await self.ipfsPin(name, uri);
              } catch (error) {
                self.getLogger().error(error);
                $tw.utils.alert(name, error.message);
              }
            }
          }
        });
        // Document
      } else {
        const parsed = await $tw.ipfs.getDocumentUrl();
        await this.ipfsPin("document", parsed);
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsTiddler.prototype.ipfsPin = async function(name, uri) {
    // Check
    if (uri == undefined || uri == null) {
      throw new Error("Undefined URI...");
    }

    if (uri.protocol === fileProtocol) {
      throw new Error("Unable to Pin a local filesystem resource...");
    }

    if (uri.pathname === "/") {
      throw new Error("Unknown pathname...");
    }

    // Extract and check URL IPFS protocol and cid
    var { protocol, cid } = this.ipfsWrapper.decodeCid(uri.pathname);

    // Process if valid
    if (protocol !== null && cid !== null) {
      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve ipns key if applicable
      if (protocol === ipnsKeyword) {
        const { ipnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      }

      this.getLogger().info("Pinning reference: " + name + "\n " + uri.href);

      // Pin
      await this.ipfsWrapper.pinToIpfs(ipfs, cid);

      // Remove unpin request
      $tw.ipfs.removeFromUnpin(cid);
    }
  };

  IpfsTiddler.prototype.handleIpfsUnpin = async function(event) {
    try {
      const self = this;

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
        $tw.utils.each(tiddler.fields, async function(field, name) {
          var uri = null;
          var value = tiddler.getFieldString(name);
          // Not a reserved keyword process
          if (reservedFields.indexOf(name) == -1) {
            // URI or not
            try {
              uri = await $tw.ipfs.normalizeIpfsUrl(value);
            } catch (error) {
              // Ignore
            }
            // Process
            if (uri !== null) {
              try {
                await self.ipfsUnpin(name, uri);
              } catch (error) {
                self.getLogger().error(error);
                $tw.utils.alert(name, error.message);
              }
            }
          }
        });
        // Document
      } else {
        const parsed = await $tw.ipfs.getDocumentUrl();
        await this.ipfsUnpin("document", parsed);
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsTiddler.prototype.ipfsUnpin = async function(name, uri) {
    // Check
    if (uri == undefined || uri == null) {
      throw new Error("Undefined URI...");
    }

    if (uri.protocol === fileProtocol) {
      throw new Error("Unable to Unpin a local filesystem resource...");
    }

    if (uri.pathname === "/") {
      throw new Error("Unknown pathname...");
    }

    // Extract and check URL IPFS protocol and cid
    var { protocol, cid } = this.ipfsWrapper.decodeCid(uri.pathname);

    // Process if valid
    if (protocol !== null && cid !== null) {
      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve IPNS key if applicable
      if (protocol === ipnsKeyword) {
        const { ipnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      }

      this.getLogger().info("Unpinning reference: " + name + "\n " + uri.href);

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
    // self
    const self = this;
    // Process fields
    $tw.utils.each(tiddler.fields, async function(field, name) {
      var uri = null;
      var value = tiddler.getFieldString(name);
      // Not a reserved keyword process
      if (reservedFields.indexOf(name) == -1) {
        // URI or not
        try {
          uri = await $tw.ipfs.normalizeIpfsUrl(value);
        } catch (error) {
          // Ignore
        }
        // Process
        if (uri !== null) {
          try {
            const { cid } = self.ipfsWrapper.decodeCid(uri.pathname);
            // Request to unpin
            if ($tw.utils.getIpfsUnpin() && cid !== null) {
              $tw.ipfs.requestToUnpin(cid);
            }
          } catch (error) {
            self.getLogger().error(error);
            $tw.utils.alert(name, error.message);
          }
        }
      }
    });
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

  IpfsTiddler.prototype.merge = function(tiddler, target) {
    // Merge
    const currentTags = (tiddler.fields.tags || []).slice(0);

    // Merge Tiddler fields with remote fields
    // $:/core/modules/server/routes/get-tiddler.js
    const fields = [];

    // Iterate over target properties
    for (var properties in target) {
      fields.push({ key: properties, value: target[properties] });
    }

    // Merge target tags with current tags
    var importedTags = target["tags"] == undefined ? "" : target["tags"];
    for (var i = 0; i < currentTags.length; i++) {
      const tag = currentTags[i];
      if (importedTags.includes(tag) == false) {
        importedTags = importedTags + " " + tag;
      }
    }
    const addTags = importedTags;

    // Update Tiddler
    const updatedTiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: addTags,
      fields: fields
    });

    return updatedTiddler;
  };

  IpfsTiddler.prototype.mergeImported = async function(tiddler, uri) {
    // Check
    if (tiddler == undefined || tiddler == null) {
      return tiddler;
    }
    const title = tiddler.getFieldString("title");
    if (title == undefined || title == null) {
      return tiddler;
    }
    if (uri == undefined || uri == null) {
      return tiddler;
    }

    // Load remote if any
    const remotes = await this.ipfsWrapper.loadTiddlers(uri);

    // Iterate over remote for new and update
    if (remotes !== undefined && remotes !== null) {
      var current = null;
      for (var k = 0; k < remotes.length; k++) {
        // Current remote
        const remote = remotes[k];

        // Head
        if (current == null) {
          current = tiddler;
        } else {
          current = $tw.wiki.getTiddler(remote.title);
        }

        // New
        if (current == null) {
          // New Tiddler
          current = new $tw.Tiddler({
            title: remote.title
          });
        }

        if (current !== null) {
          // Merge
          const mergedTiddler = this.merge(current, remote);
          // Update
          $tw.wiki.addTiddler(mergedTiddler);
        }
      }
    }

    return true;
  };

  IpfsTiddler.prototype.handleRefreshTiddler = async function(event) {
    // self
    const self = this;
    // current tiddler title
    const title = event.tiddlerTitle;

    // Load tiddler
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler == undefined || tiddler == null) {
      $tw.utils.alert(name, "Unknown tiddler: " + title);
      return false;
    }

    // Count fields
    var count = 0;
    $tw.utils.each(tiddler.getFieldStrings(), function(value, fieldName) {
      count += 1;
    });

    // Process fields
    $tw.utils.each(tiddler.fields, async function(field, name) {
      // Not a reserved keyword process
      if (reservedFields.indexOf(name) == -1) {
        // Uri
        var uri = null;
        // Value
        var value = tiddler.getFieldString(name);
        // Process if any update
        if (value !== undefined && value !== null) {
          // URI or not
          try {
            uri = await $tw.ipfs.normalizeIpfsUrl(value);
          } catch (error) {
            // Ignore
          }
          // Process if any update
          if (uri !== undefined && uri !== null) {
            // Process canonical_uri if any
            if (name === "_canonical_uri") {
              // import_uri supersed canonical_uri
              var import_uri = tiddler.getFieldString("_import_uri");
              if (import_uri !== undefined && import_uri !== null) {
                uri = import_uri;
              }
              // Import and merge
              var updatedTiddler = await self.mergeImported(tiddler, uri);
              // Empty text to force refresh
              updatedTiddler = $tw.utils.updateTiddler({
                tiddler: updatedTiddler,
                fields: [{ key: "text", value: "" }]
              });
              $tw.wiki.addTiddler(updatedTiddler);
            }
          }
        }
      }

      // Empty cache once
      if (--count == 0) {
        $tw.wiki.clearCache(title);
        // Tiddler to be refreshed
        const changedTiddler = $tw.utils.getChangedTiddler(title);
        // Refresh
        $tw.rootWidget.refresh(changedTiddler);
      }
    });

    return true;
  };

  IpfsTiddler.prototype.handleSaveTiddler = async function(tiddler) {
    var updatedTiddler = new $tw.Tiddler(tiddler);

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
      const unknownType = new Error("Unknown Tiddler type: " + type);
      this.getLogger().error(unknownType);
      $tw.utils.alert(name, unknownType.message);
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
        var { uri, cid } = this.ipfsWrapper.decodeUrl(value);
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
        if (uri !== null) {
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
      var { uri, cid } = this.ipfsWrapper.decodeUrl(value);
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
      var { oldUri, oldCid } = this.ipfsWrapper.decodeUrl(oldValue);
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
      // Unpin
      if (oldUri !== null) {
        try {
          // Unpin request
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
        }
      }
      // Discard unpin
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
