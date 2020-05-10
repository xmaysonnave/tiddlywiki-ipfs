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

  IpfsImport.prototype.import = async function (canonicalUri, importUri, title) {
    this.host = title !== undefined && title !== null && title.trim() !== "" ? $tw.wiki.getTiddler(title) : null;
    if (this.host == undefined) {
      this.host = null;
    }
    this.tiddlers = new Map();
    this.processedImported = new Map();
    this.processedTitles = new Map();
    this.root = null;
    this.getLogger().info("*** Begin Import ***");
    try {
      // Load and prepare imported tiddlers to be processed
      var added = 0;
      var updated = 0;
      var currentUrl = $tw.ipfs.normalizeUrl("/" + title);
      var loaded = await this.loadRemote(canonicalUri, importUri, currentUrl, title);
      this.getLogger().info("*** Loaded " + loaded + " Tiddler(s) ***");
      this.getLogger().info("*** Loaded " + this.tiddlers.size + " remote resource(s) ***");
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
    this.tiddlers = null;
    this.processedImported = null;
    this.processedTitles = null;
    this.root = null;
  };

  IpfsImport.prototype.loadRemote = async function (canonicalUri, importUri, parentUrl, parentTitle) {
    var loaded = 0;
    var tiddlers = null;
    var currentUrl = $tw.ipfs.normalizeUrl(importUri);
    if (importUri !== undefined && importUri !== null && importUri.toString().trim() !== "") {
      tiddlers = await this.loadTiddlers(importUri, parentUrl, parentTitle);
      // Fallback
      if (tiddlers == null) {
        if (canonicalUri !== undefined && canonicalUri !== null && canonicalUri.toString().trim() !== "") {
          currentUrl = $tw.ipfs.normalizeUrl(canonicalUri);
          tiddlers = await this.loadTiddlers(canonicalUri, parentUrl, parentTitle);
        }
      }
    } else if (canonicalUri !== undefined && canonicalUri.toString().trim() !== "") {
      currentUrl = $tw.ipfs.normalizeUrl(canonicalUri);
      tiddlers = await this.loadTiddlers(canonicalUri, parentUrl, parentTitle);
    }
    // Process Imported
    if (tiddlers !== null) {
      loaded += await this.processLoadedTiddlers(currentUrl, tiddlers);
    }
    return loaded;
  };

  IpfsImport.prototype.loadTiddlers = async function (url, parentUrl, parentTitle) {
    if (parentTitle == undefined || parentTitle == null || parentTitle.trim() === "") {
      return null;
    } else {
      parentTitle = parentTitle.trim();
    }
    if (parentUrl == undefined || parentUrl == null || parentUrl.toString().trim() === "") {
      return null;
    } else {
      parentUrl = parentUrl.toString().trim();
    }
    if (url == undefined || url == null || url.toString().trim() === "") {
      return null;
    } else {
      url = url.toString().trim();
    }
    var cid = null;
    var content = null;
    var imported = new Map();
    var ipnsKey = null;
    var key = null;
    var normalizedUrl = null;
    var resolvedUrl = null;
    var tiddlers = null;
    var loadUrl = null;
    try {
      var { cid, ipnsKey, normalizedUrl, resolvedUrl } = await $tw.ipfs.resolveUrl(false, true, url);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(
        name,
        'Failed to resolve URL: <a rel="noopener noreferrer" target="_blank" href="' +
          parentUrl +
          '">' +
          parentTitle +
          "</a>"
      );
      return null;
    }
    if (normalizedUrl == null) {
      return null;
    }
    loadUrl = resolvedUrl !== null ? resolvedUrl.href : normalizedUrl.href;
    // Key
    if (cid !== null) {
      key = cid;
    } else if (ipnsKey !== null) {
      key = ipnsKey;
    } else {
      key = normalizedUrl.href;
    }
    // Circular
    if (this.tiddlers.get(key) !== undefined) {
      this.getLogger().warn("Circular URL in Tiddler: " + parentTitle + "\n " + parentUrl);
      $tw.utils.alert(
        name,
        'Circular URL in Tiddler: <a rel="noopener noreferrer" target="_blank" href="' +
          parentUrl +
          '">' +
          parentTitle +
          "</a>"
      );
      return null;
    }
    // Load
    try {
      content = await $tw.ipfs.loadToUtf8(loadUrl);
      if ($tw.ipfs.isJson(content.data)) {
        tiddlers = $tw.wiki.deserializeTiddlers(".json", content.data, $tw.wiki.getCreationFields());
      } else {
        tiddlers = $tw.wiki.deserializeTiddlers(".tid", content.data, $tw.wiki.getCreationFields());
      }
      if (tiddlers == undefined || tiddlers == null) {
        return null;
      }
      // Filter out unknown titles and duplicates
      for (var i in tiddlers) {
        var tiddler = tiddlers[i];
        var title = tiddler["title"];
        if (title == undefined || title == null || title.trim() === "") {
          this.getLogger().warn("Ignored unknown Tiddler title:" + "\n " + loadUrl);
          $tw.utils.alert(
            name,
            'Ignored unknown: <a rel="noopener noreferrer" target="_blank" href="' +
              loadUrl +
              '"> Tiddler</a>' +
              " title."
          );
          continue;
        }
        if (imported.get(title) !== undefined) {
          this.getLogger().warn("Ignored Duplicate Tiddler: " + title + "\n " + loadUrl);
          $tw.utils.alert(
            name,
            'Ignored duplicate Tiddler: <a rel="noopener noreferrer" target="_blank" href="' +
              loadUrl +
              '">' +
              title +
              "</a>"
          );
          continue;
        }
        imported.set(title, tiddler);
      }
      this.tiddlers.set(key, imported);
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
      return null;
    }
    return imported.size === 0 ? null : imported;
  };

  IpfsImport.prototype.processLoadedTiddlers = async function (currentUrl, tiddlers) {
    var loaded = 0;
    if (tiddlers == undefined || tiddlers == null) {
      return loaded;
    }
    for (var [title, tiddler] of tiddlers.entries()) {
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
        loaded += await this.loadRemote(tiddler["_canonical_uri"], tiddler["_import_uri"], currentUrl, title);
      }
      loaded += 1;
    }
    return loaded;
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
