/*\
title: $:/plugins/ipfs/ipfs-import.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Import

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const name = "ipfs-import";

  var IpfsImport = function () {};

  IpfsImport.prototype.getLogger = function () {
    return window.log.getLogger(name);
  };

  IpfsImport.prototype.loadRemoteTiddlers = async function (canonicalUri, importUri, title) {
    this.host = title !== undefined && title !== null ? $tw.wiki.getTiddler(title) : null;
    this.processedImported = new Map();
    this.processedKeys = new Map();
    this.processedTitles = new Map();
    this.root = null;
    try {
      var { added, updated } = await this.loadImportedRemoteTiddlers(canonicalUri, importUri, title);
      // Update Tiddly
      for (var [title, merged] of this.processedImported.entries()) {
        $tw.wiki.addTiddler(merged);
      }
      // Process deleted
      // $tw.wiki.forEachTiddler({ includeSystem: true }, function (title, tiddler) {
      //   var value = tiddler.getFieldString("_canonical_uri");
      //   if (value !== undefined && value !== null && value === importedUri && processed.indexOf(title) === -1) {
      //     $tw.wiki.deleteTiddler(title);
      //     return;
      //   }
      //   var value = tiddler.getFieldString("_import_uri");
      //   if (value !== undefined && value !== null && value === importedUri && processed.indexOf(title) === -1) {
      //     $tw.wiki.deleteTiddler(title);
      //     return;
      //   }
      // });
      if (this.processedImported.size > 0) {
        $tw.utils.alert(name, "Successfully Added: " + added + ", Updated: " + updated + " Tiddlers...");
      }
      if (this.host !== null && this.processedTitles.get(this.host.fields.title) == undefined) {
        var updatedTiddler = new $tw.Tiddler(this.host);
        if (this.root !== null) {
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler,
            fields: [{ key: "text", value: "Successfully Imported Tiddlers: [[" + this.root + "]]..." }],
          });
        } else if (this.processedImported.size === 0) {
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler,
            fields: [{ key: "text", value: "No Tiddlers have been Imported..." }],
          });
        } else {
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler,
            fields: [{ key: "text", value: "Successfully Imported Tiddlers..." }],
          });
        }
        // Update
        $tw.wiki.addTiddler(updatedTiddler);
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    }
    // Cleanup
    this.host = null;
    this.processedImported = null;
    this.processedKeys = null;
    this.processedTitles = null;
    this.root = null;
  };

  IpfsImport.prototype.getImportedTiddlers = async function (field, title, url) {
    var cid = null;
    var importedTiddlers = null;
    var normalizedUrl = null;
    var { cid, importedTiddlers, normalizedUrl } = await $tw.ipfs.importTiddlers(url);
    if (importedTiddlers == null) {
      $tw.utils.alert(
        name,
        'Failed to import : <a rel="noopener noreferrer" target="_blank" href="' +
          normalizedUrl +
          '">' +
          field +
          "</a> from Imported Tiddler [[" +
          title +
          "]]"
      );
    }
    return {
      cid,
      importedTiddlers,
      normalizedUrl,
    };
  };

  IpfsImport.prototype.loadImportedRemoteTiddlers = async function (canonicalUri, importUri, title) {
    var added = 0;
    var cid = null;
    var importedTiddlers = null;
    var updated = 0;
    var url = null;
    // Load Imported
    if (importUri !== undefined && importUri !== null) {
      url = importUri;
      var { cid, importedTiddlers, normalizedUrl } = await this.getImportedTiddlers("_import_uri", title, url);
      // Fallback
      if (importedTiddlers == null) {
        url = canonicalUri;
        if (url !== undefined && url !== null) {
          var { cid, importedTiddlers, normalizedUrl } = await this.getImportedTiddlers("_canonical_uri", title, url);
        }
      }
    } else if (canonicalUri !== undefined && canonicalUri !== null) {
      url = canonicalUri;
      var { cid, importedTiddlers, normalizedUrl } = await this.getImportedTiddlers("_canonical_uri", title, url);
    }
    // Process Imported
    if (importedTiddlers !== null) {
      var { added, updated } = await this.processImportedTiddlers(cid, importedTiddlers, url, normalizedUrl);
    }
    return {
      added: added,
      updated: updated,
    };
  };

  IpfsImport.prototype.processImportedTiddlers = async function (
    cid,
    importedTiddlers,
    importedUrl,
    importedNormalizedUrl
  ) {
    var importedAdded = 0;
    var importedUpdated = 0;
    // Process new and existing
    for (var i in importedTiddlers) {
      var merged = null;
      var currentTiddler = null;
      var importedTiddler = importedTiddlers[i];
      var importedTitle = importedTiddler["title"];
      // Check
      if (importedTitle == undefined || importedTitle == null || importedTitle.trim() === "") {
        continue;
      }
      var importedTags = importedTiddler["tags"] !== undefined ? importedTiddler["tags"] : "";
      // Type
      var type = importedTiddler["type"];
      // Default
      if (type == undefined || type == null) {
        type = "text/vnd.tiddlywiki";
      }
      // Content-Type
      var info = $tw.config.contentTypeInfo[type];
      // Check
      if (info == undefined || info == null) {
        $tw.utils.alert(
          name,
          "Unknown Content-Type: '" +
            type +
            "', default to: 'text/vnd.tiddlywiki', <a rel='noopener noreferrer' target='_blank' href='" +
            importedNormalizedUrl +
            "'>" +
            importedTitle +
            "</a>"
        );
        // Default
        type = "text/vnd.tiddlywiki";
        info = $tw.config.contentTypeInfo[type];
      }
      // Load until we reach the leaf
      if (info.encoding !== "base64" && type !== "image/svg+xml") {
        var uri = importedTiddler["_import_uri"];
        if (uri == undefined || uri == null) {
          uri = importedTiddler["_canonical_uri"];
        }
        if (uri !== undefined && uri !== null) {
          var { added, updated } = await this.loadImportedRemoteTiddlers(
            importedTiddler["_canonical_uri"],
            importedTiddler["_import_uri"],
            importedTitle
          );
          importedAdded += added;
          importedUpdated += updated;
        }
      }
      // Imported root
      if (this.root == null) {
        this.root = importedTitle;
      }
      // Retrieve target host Tiddler
      if (this.host !== null && this.host.fields.title === importedTitle) {
        currentTiddler = this.host;
      } else {
        currentTiddler = $tw.wiki.getTiddler(importedTitle);
      }
      // Retrieve or prepare merged content
      merged = this.processedImported.get(importedTitle);
      if (merged == undefined) {
        merged = new Object();
        this.processedImported.set(importedTitle, merged);
      }
      // Fields
      for (var field in importedTiddler) {
        // Discard
        if (field === "tags") {
          continue;
        }
        // Unknown from leaf to top, we keep the top modified field
        if (merged[field] == undefined || merged[field] == null || field === "modified") {
          merged[field] = importedTiddler[field];
        }
        if (field === "type") {
          merged[field] = type;
        }
      }
      // Tags,
      // We use the target tiddler to manage complex tags like [[IPFS Documentation]]
      if (currentTiddler !== undefined && currentTiddler !== null) {
        var tags = (currentTiddler.fields.tags || []).slice(0);
        for (var i = 0; i < tags.length; i++) {
          var tag = tags[i];
          if (importedTags.includes(tag) == false) {
            importedTags = importedTags + " " + tag;
          }
        }
      }
      // IPFS tag
      if (cid !== null && importedTags.includes("$:/isIpfs") == false) {
        importedTags = importedTags + " $:/isIpfs";
      }
      // Imported tag
      if (importedTags.includes("$:/isImported") == false) {
        importedTags = importedTags + " $:/isImported";
      }
      // Processed tags
      merged["tags"] = importedTags;
      // URI
      if (info.encoding === "base64" || type === "image/svg+xml") {
        merged["_import_uri"] = importedUrl;
      } else {
        var canonical_uri = merged["_canonical_uri"];
        if (canonical_uri == undefined || canonical_uri == null) {
          merged["_canonical_uri"] = importedUrl;
          // import_uri
        } else if (canonical_uri !== importedUrl) {
          merged["_import_uri"] = importedUrl;
        }
      }
      // Count
      if (currentTiddler !== undefined && currentTiddler !== null) {
        importedUpdated += 1;
      } else {
        importedAdded += 1;
      }
      // Processed Titles
      var keys = this.processedTitles.get(importedTitle);
      if (keys == undefined) {
        keys = new Array();
        this.processedTitles.set(importedTitle, keys);
      }
      if (cid !== null) {
        if (keys.indexOf(cid) === -1) {
          keys.push(cid);
        }
      } else {
        if (keys.indexOf(importedNormalizedUrl) === -1) {
          keys.push(importedNormalizedUrl);
        }
      }
      // Processed Keys
      if (cid !== null) {
        var titles = this.processedKeys.get(cid);
        if (titles == undefined) {
          titles = new Array();
          this.processedKeys.set(cid, titles);
        }
        if (titles.indexOf(importedTitle) === -1) {
          titles.push(importedTitle);
        }
      } else {
        var titles = this.processedKeys.get(importedNormalizedUrl);
        if (titles == undefined) {
          titles = new Array();
          this.processedKeys.set(importedNormalizedUrl, titles);
        }
        if (titles.indexOf(importedTitle) === -1) {
          titles.push(importedTitle);
        }
      }
    }
    return {
      added: importedAdded,
      updated: importedUpdated,
    };
  };
  exports.IpfsImport = IpfsImport;
})();
