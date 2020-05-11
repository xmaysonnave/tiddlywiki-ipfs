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

  IpfsImport.prototype.getKey = async function (field, url, title, value) {
    var cid = null;
    var ipnsKey = null;
    var normalizedUrl = null;
    var key = null;
    if (value == undefined || value == null || value.trim() === "") {
      return null;
    }
    try {
      var { cid, ipnsKey, normalizedUrl } = await $tw.ipfs.resolveUrl(false, false, value);
      if (normalizedUrl == null) {
        throw new Error("Failed to resolve URL...");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(
        name,
        'Failed to resolve field: "' +
          field +
          '" from Tiddler <a rel="noopener noreferrer" target="_blank" href="' +
          url +
          '">' +
          title +
          "</a>"
      );
      this.notResolved.push(value);
    }
    if (normalizedUrl !== null) {
      if (normalizedUrl.hostname.endsWith(".eth")) {
        key = normalizedUrl.hostname;
      } else if (ipnsKey !== null) {
        key = ipnsKey;
      }
      if (cid !== null) {
        key = cid;
      } else {
        key = normalizedUrl.toString();
      }
    }
    return key;
  };

  IpfsImport.prototype.getReferences = function (title) {
    const references = new Map();
    for (var [key, imported] of this.loaded.entries()) {
      for (var [importedTitle, { canonicalUri, importUri }] of imported.entries()) {
        if (importedTitle === title) {
          references.set(key, { canonicalUri, importUri });
        }
      }
    }
    return references;
  };

  IpfsImport.prototype.import = async function (canonicalUri, importUri, title) {
    this.host = title !== undefined && title !== null && title.trim() !== "" ? $tw.wiki.getTiddler(title) : null;
    if (this.host == undefined) {
      this.host = null;
    }
    this.loaded = new Map();
    this.notResolved = new Array();
    this.notLoaded = new Array();
    this.processedImported = new Map();
    this.processedTitles = new Map();
    this.root = null;
    var count = 0;
    this.getLogger().info("*** Begin Import ***");
    try {
      // Load and prepare imported tiddlers to be processed
      var added = 0;
      var updated = 0;
      var currentUrl = $tw.ipfs.getUrl("/" + title, $tw.ipfs.getDocumentUrl());
      var canonicalUri = await this.getKey("_canonical_uri", currentUrl, title, canonicalUri);
      var importUri = await this.getKey("_import_uri", currentUrl, title, importUri);
      if (canonicalUri !== null || importUri !== null) {
        count = await this.load(canonicalUri, importUri, currentUrl, title);
      }
      var references = this.getReferences("Node 1");
      this.getLogger().info("*** Loaded: " + count + " Tiddler(s) ***");
      this.getLogger().info("*** Loaded: " + this.loaded.size + " remote content ***");
      this.getLogger().info("*** Fail to load: " + this.notLoaded.length + " remote content ***");
      this.getLogger().info("*** Fail to resolve: " + this.notResolved.length + " URL(s) ***");
      // // Update Tiddly
      // for (var [title, merged] of this.processedImported.entries()) {
      //   $tw.wiki.addTiddler(merged);
      // }
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
      // if (this.processedTitles.size > 0) {
      //   $tw.utils.alert(name, "Successfully Added: " + added + ", Updated: " + updated + " Tiddlers...");
      // }
      // if (this.host !== null && this.processedTitles.get(this.host.fields.title) == undefined) {
      //   var updatedTiddler = new $tw.Tiddler(this.host);
      //   if (this.root !== null) {
      //     updatedTiddler = $tw.utils.updateTiddler({
      //       tiddler: updatedTiddler,
      //       fields: [{ key: "text", value: "Successfully Imported Tiddlers: [[" + this.root + "]]..." }],
      //     });
      //   } else if (this.processedTitles.size === 0) {
      //     updatedTiddler = $tw.utils.updateTiddler({
      //       tiddler: updatedTiddler,
      //       fields: [{ key: "text", value: "No Tiddlers have been Imported..." }],
      //     });
      //   } else {
      //     updatedTiddler = $tw.utils.updateTiddler({
      //       tiddler: updatedTiddler,
      //       fields: [{ key: "text", value: "Successfully Imported Tiddlers..." }],
      //     });
      //   }
      //   // Update
      //   $tw.wiki.addTiddler(updatedTiddler);
      // }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
    }
    this.getLogger().info("*** End Import ***");
    this.host = null;
    this.loaded = null;
    this.notLoaded = null;
    this.notResolved = null;
    this.processedImported = null;
    this.processedTitles = null;
    this.root = null;
  };

  IpfsImport.prototype.load = async function (canonicalUri, importUri, parentUrl, parentTitle) {
    var count = 0;
    if (canonicalUri !== null && this.notResolved.indexOf(canonicalUri) === -1) {
      var { imported, url } = await this.importTiddlers("_canonical_uri", canonicalUri, parentUrl, parentTitle);
      if (imported !== null) {
        count += await this.processLoaded(url, imported);
      }
    }
    if (importUri !== null && this.notResolved.indexOf(importUri) === -1) {
      var { imported, url } = await this.importTiddlers("_import_uri", importUri, parentUrl, parentTitle);
      if (imported !== null) {
        count += await this.processLoaded(url, imported);
      }
    }
    return count;
  };

  IpfsImport.prototype.importTiddlers = async function (field, key, parentUrl, parentTitle) {
    var content = null;
    var imported = new Map();
    var normalizedUrl = null;
    var resolvedUrl = null;
    var tiddlers = null;
    var url = null;
    try {
      var { normalizedUrl, resolvedUrl } = await $tw.ipfs.resolveUrl(false, true, key);
      if (normalizedUrl == null) {
        throw new Error("Failed to resolve URL...");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(
        name,
        'Failed to resolve field: "' +
          field +
          '" from Tiddler <a rel="noopener noreferrer" target="_blank" href="' +
          parentUrl +
          '">' +
          parentTitle +
          "</a>"
      );
      this.notResolved.push(key);
      return {
        imported: null,
        url: null,
      };
    }
    url = resolvedUrl !== null ? resolvedUrl : normalizedUrl;
    // Already loaded or can't be loaded
    if (this.loaded.get(key) !== undefined || this.notLoaded.indexOf(key) !== -1) {
      // this.getLogger().warn("Cycle detected in Tiddler: " + parentTitle + "\n " + parentUrl);
      // $tw.utils.alert(
      //   name,
      //   'Cycle detected in Tiddler: <a rel="noopener noreferrer" target="_blank" href="' +
      //     parentUrl +
      //     '">' +
      //     parentTitle +
      //     "</a>"
      // );
      return {
        imported: null,
        url: null,
      };
    }
    try {
      content = await $tw.ipfs.loadToUtf8(url.toString());
      if ($tw.ipfs.isJson(content.data)) {
        tiddlers = $tw.wiki.deserializeTiddlers(".json", content.data, $tw.wiki.getCreationFields());
      } else {
        tiddlers = $tw.wiki.deserializeTiddlers(".tid", content.data, $tw.wiki.getCreationFields());
      }
      if (tiddlers == undefined || tiddlers == null) {
        return {
          imported: null,
          url: null,
        };
      }
      // Filter out
      for (var i in tiddlers) {
        var tiddler = tiddlers[i];
        var title = tiddler["title"];
        if (title == undefined || title == null || title.trim() === "") {
          this.getLogger().warn("Ignored unknown Tiddler field: 'title'" + "\n " + url);
          $tw.utils.alert(
            name,
            'Ignored unknown field "title" from <a rel="noopener noreferrer" target="_blank" href="' +
              url +
              '"> Tiddler</a>'
          );
          continue;
        }
        if (imported.get(title) !== undefined) {
          this.getLogger().warn("Ignored Duplicate Tiddler: " + title + "\n " + url);
          $tw.utils.alert(
            name,
            'Ignored duplicate Tiddler: <a rel="noopener noreferrer" target="_blank" href="' +
              url +
              '">' +
              title +
              "</a>"
          );
          continue;
        }
        var canonicalUri = await this.getKey("_canonical_uri", url, title, tiddler["_canonical_uri"]);
        var importUri = await this.getKey("_import_uri", url, title, tiddler["_import_uri"]);
        imported.set(title, { canonicalUri, importUri, tiddler });
      }
      this.loaded.set(key, imported);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(
        name,
        'Failed to import Tiddler: <a rel="noopener noreferrer" target="_blank" href="' +
          parentUrl +
          '">' +
          parentTitle +
          "</a>"
      );
      this.notLoaded.push(key);
      return {
        imported: null,
        url: null,
      };
    }
    return {
      imported: imported.size === 0 ? null : imported,
      url: url,
    };
  };

  IpfsImport.prototype.processLoaded = async function (url, imported) {
    var count = 0;
    if (imported == undefined || imported == null) {
      return count;
    }
    for (var [title, { canonicalUri, importUri, tiddler }] of imported.entries()) {
      var type = tiddler["type"];
      if (type == undefined || type == null) {
        type = "text/vnd.tiddlywiki";
      }
      var info = $tw.config.contentTypeInfo[type];
      if (info == undefined || info == null) {
        type = "text/vnd.tiddlywiki";
        info = $tw.config.contentTypeInfo[type];
      }
      tiddler["type"] = type;
      if (info.encoding !== "base64" && tiddler["type"] !== "image/svg+xml") {
        if (canonicalUri !== null || importUri !== null) {
          count += await this.load(canonicalUri, importUri, url, title);
        }
      }
      count += 1;
    }
    return count;
  };

  IpfsImport.prototype.loadRemoteImportedTiddlers = async function (importUri, canonicalUri, title) {
    var added = 0;
    var key = null;
    var importedTiddlers = null;
    var normalizedUrl = null;
    var updated = 0;
    var url = null;
    // Load Imported
    if (importUri !== undefined && importUri !== null) {
      url = importUri;
      var { importedTiddlers, key, normalizedUrl } = await this.getImportedTiddlers("_import_uri", title, url);
      // Fallback
      if (importedTiddlers == null) {
        url = canonicalUri;
        if (url !== undefined && url !== null) {
          var { importedTiddlers, key, normalizedUrl } = await this.getImportedTiddlers("_canonical_uri", title, url);
        }
      }
    } else if (canonicalUri !== undefined && canonicalUri !== null) {
      url = canonicalUri;
      var { importedTiddlers, key, normalizedUrl } = await this.getImportedTiddlers("_canonical_uri", title, url);
    }
    // Process Imported
    if (importedTiddlers !== null) {
      var { added, updated } = await this.processLoadedImportedTiddlers(importedTiddlers, key, url, normalizedUrl);
    }
    return {
      added: added,
      updated: updated,
    };
  };

  IpfsImport.prototype.processImportedTiddlers = async function (
    importedTiddlers,
    key,
    importedUrl,
    importedNormalizedUrl
  ) {
    var importedAdded = 0;
    var importedUpdated = 0;
    // Process new and existing
    for (var [importedTitle, importedTiddler] of this.importedTiddlers.entries()) {
      var merged = null;
      var currentTiddler = null;
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
          try {
            var { added, updated } = await this.loadRemoteImportedTiddlers(
              importedTiddler["_import_uri"],
              importedTiddler["_canonical_uri"],
              importedTitle
            );
            importedAdded += added;
            importedUpdated += updated;
          } catch (error) {
            if (error.name !== undefined && error.name === "CircularImport") {
              $tw.utils.alert(name, error.message);
              break;
            }
            throw error;
          }
        }
      }
      // Imported root
      if (this.host !== null && this.root == null) {
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
      if ($tw.ipfs.isCid(key) && importedTags.includes("$:/isIpfs") == false) {
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
      var titles = this.processedTitles.get(importedTitle);
      if (titles == undefined) {
        titles = new Array();
        this.processedTitles.set(importedTitle, titles);
      }
      if (key !== null) {
        if (titles.indexOf(key) === -1) {
          titles.push(key);
        }
      } else {
        if (titles.indexOf(importedNormalizedUrl) === -1) {
          titles.push(importedNormalizedUrl);
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
