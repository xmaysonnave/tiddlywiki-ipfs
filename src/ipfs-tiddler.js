/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsTiddler

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const name = "ipfs-tiddler";

var IpfsTiddler = function() {
  this.once = false;
  this.ipfsWrapper = new IpfsWrapper();
};

IpfsTiddler.prototype.getLogger = function() {
  return window.log.getLogger(name);
}

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
  $tw.rootWidget.addEventListener("tm-refresh-tiddler", async function(event) {
    return await self.handleRefreshTiddler(event);
  });
  // Init once
  this.once = true;
}

IpfsTiddler.prototype.handleChangeEvent = function(changes) {
  // Gateway preference
  const gateway = changes["$:/ipfs/saver/gateway"];
  if (gateway !== undefined && gateway.modified) {
    const base = $tw.ipfs.getIpfsBaseUrl();
    if ($tw.utils.getIpfsUrlPolicy() === "gateway") {
      this.getLogger().info(
        "Gateway Relative URL:"
        + "\n "
        + base.toString()
      );
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
          fields: [
            { key: "text", value: "" }
          ]
        });
        if (updatedTiddler !== null) {
          $tw.wiki.addTiddler(updatedTiddler);
        }
      }
    }
  }
  // Policy preference
  const policy = changes["$:/ipfs/saver/policy"];
  if (policy !== undefined && policy.modified) {
    const base = $tw.ipfs.getIpfsBaseUrl();
    if ($tw.utils.getIpfsUrlPolicy() === "host") {
      this.getLogger().info(
        "Host Relative URL:"
        + "\n "
        + base.toString()
      );
    } else {
      this.getLogger().info(
        "Gateway Relative URL:"
        + "\n "
        + base.toString()
      );
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
}

IpfsTiddler.prototype.updateLoggers = function(level) {
  window.log.setLevel(level, false);
  const loggers = window.log.getLoggers();
  for (var property in loggers) {
    if (Object.prototype.hasOwnProperty.call(loggers, property)) {
      const logger = window.log.getLogger(property);
      logger.setLevel(level, false);
    }
  }
}

IpfsTiddler.prototype.handleDeleteTiddler = async function(tiddler) {
  // Process if _canonical_uri is set
  const uri = tiddler.getFieldString("_canonical_uri");
  if (uri == undefined || uri == null || uri.trim() === "") {
    return tiddler;
  }
  try {
    // Decode
    const parsed = await $tw.ipfs.normalizeIpfsUrl(uri);
    if (parsed.pathname === "/") {
      return tiddler;
    }
    const { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
    // Request to unpin
    if ($tw.utils.getIpfsUnpin() && cid !== null) {
      $tw.ipfs.requestToUnpin(cid);
    }
  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
  }
  return tiddler;
}

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
}

IpfsTiddler.prototype.merge = function(tiddler, target) {

  // Merge
  const currentTags = (tiddler.fields.tags || []).slice(0);
  const currentTitle = tiddler.getFieldString("title");

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

  // Title
  if (target["title"] !== currentTitle) {
    fields.push({ key: "_imported_title", value: target["title"] });
  }

  // Update Tiddler
  const updatedTiddler = $tw.utils.updateTiddler({
    tiddler: tiddler,
    addTags: addTags,
    fields: fields
  });

  return updatedTiddler;

}

IpfsTiddler.prototype.mergeImported = async function(tiddler, uri) {

  // current tiddler title
  const title = tiddler.getFieldString("title");
  if (title == undefined || title == null) {
    return false;
  }

  if (uri == undefined || uri == null) {
    return false;
  }

  // Load remote
  const remotes = await this.ipfsWrapper.loadTiddlers(tiddler, uri);

  // Search local
  var options = {
    field: ["_imported_uri"]
  }
  var local = $tw.wiki.getTiddlers(options);

  // Iterate over local to detect deleted
  for (var i = local.length - 1; i >= 0; i--) {
    const innerTiddler = $tw.wiki.getTiddler(local[i]);
    const innerTitle = innerTiddler.getFieldString("title");
    // Filter out
    if (innerTiddler.getFieldString("_imported_uri") !== uri) {
      continue;
    }
    // Lookup
    var found = false;
    for (var j = 0; j < remotes.length ; j++) {
      const remote = remotes[j];
      if (remote.title === innerTitle) {
        found = true;
        break;
      }
    }
    // Not found
    if (found === false) {
      $tw.wiki.deleteTiddler(local[i]);
    }
  }

  // Iterate over remote for new and update
  var current = null;
  for (var k = 0; k < remotes.length ; k++) {
    // Current remote
    const remote = remotes[k];
    // Root
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
    // Merge
    const updatedTiddler = this.merge(current, remote);
    // Update
    $tw.wiki.addTiddler(updatedTiddler);
  }

  return true;

}

IpfsTiddler.prototype.mergeImportedTiddler = async function(tiddler, uri) {

  // current tiddler title
  const title = tiddler.getFieldString("title");
  if (title == undefined || title == null) {
    return false;
  }

  if (uri == undefined || uri == null) {
    return false;
  }

  // Load remote
  const remotes = await this.ipfsWrapper.loadTiddlers(tiddler, uri);

  // Deleted remote
  var remote = null;
  for (var j = 0; j < remotes.length ; j++) {
    if (remotes[j].title === title) {
      remote = remotes[j];
      break;
    }
  }

  // Not found
  if (remote == null) {
    $tw.wiki.deleteTiddler(title);
    return false;
  }

  // Merge
  const updatedTiddler = this.merge(tiddler, remote);

  // Update
  $tw.wiki.addTiddler(updatedTiddler);

  return true;

}

IpfsTiddler.prototype.handleRefreshTiddler = async function(event) {

  var imported_uri = null;

  // current tiddler title
  const title = event.tiddlerTitle;
  if (title == undefined || title == null || title.trim() === "") {
    return false;
  }

  // current tiddler
  const tiddler = $tw.wiki.getTiddler(title);
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown tiddler: " + title);
    return false;
  }

  try {

    // Manage imported_root_uri
    var imported_root_uri = tiddler.getFieldString("_imported_root_uri");
    if (imported_root_uri !== undefined && imported_root_uri !== null && imported_root_uri.trim() !== "") {
      await this.mergeImported(tiddler, imported_root_uri.trim());
    }

    // Manage imported_uri
    var imported_uri = tiddler.getFieldString("_imported_uri");
    if (imported_uri !== undefined && imported_uri !== null && imported_uri.trim() !== "") {
      await this.mergeImportedTiddler(tiddler, imported_uri.trim());
    }

    // Empty the 'text' field from _canonical_uri Tiddler holder
    var canonical_uri = tiddler.getFieldString("_canonical_uri");
    if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [
          { key: "text", value: "" }
        ]
      });
      $tw.wiki.addTiddler(updatedTiddler);
    }

    // Empty cache
    $tw.wiki.clearCache(title);

    // Tiddler to be refreshed
    const changedTiddler = $tw.utils.getChangedTiddler(title);
    
    // Refresh
    $tw.rootWidget.refresh(changedTiddler);

  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
    return false;
  }

  return true;

}

IpfsTiddler.prototype.handleSaveTiddler = async function(tiddler) {

  var updatedTiddler = null;

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml" && type !== "text/vnd.tiddlywiki")  {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  // Retrieve tiddler _canonical_uri if any
  var canonical_uri = tiddler.getFieldString("_canonical_uri");
  if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
    canonical_uri = canonical_uri.trim();
  } else {
    canonical_uri = null;
  }

  // Retrieve tiddler _tiddler_uri if any
  var tiddler_uri = tiddler.getFieldString("_tiddler_uri");
  if (tiddler_uri !== undefined && tiddler_uri !== null && tiddler_uri.trim() !== "") {
    tiddler_uri = tiddler_uri.trim();
  } else {
    tiddler_uri = null;
  }

  // Retrieve tiddler _tiddler_content_uri if any
  var tiddler_content_uri = tiddler.getFieldString("_tiddler_content_uri");
  if (tiddler_content_uri !== undefined && tiddler_content_uri !== null && tiddler_content_uri.trim() !== "") {
    tiddler_content_uri = tiddler_content_uri.trim();
  } else {
    tiddler_content_uri = null;
  }

  // Retrieve old tiddler _export_uri and _canonical_uri if any
  var old_canonical_uri = null;
  var old_tiddler_content_uri = null;
  var old_tiddler_uri = null;
  const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title);
  if (oldTiddler !== undefined && oldTiddler !== null) {
    // Retrieve oldTiddler _canonical_uri if any
    old_canonical_uri = oldTiddler.getFieldString("_canonical_uri");
    if (old_canonical_uri !== undefined && old_canonical_uri !== null && old_canonical_uri.trim() !== "") {
      old_canonical_uri = old_canonical_uri.trim();
    } else {
      old_canonical_uri = null;
    }
    // Retrieve oldTiddler _tiddler_uri if any
    old_tiddler_uri = oldTiddler.getFieldString("_tiddler_uri");
    if (old_tiddler_uri !== undefined && old_tiddler_uri !== null && old_tiddler_uri.trim() !== "") {
      old_tiddler_uri = old_tiddler_uri.trim();
    } else {
      old_tiddler_uri = null;
    }
    // Retrieve oldTiddler _content_uri if any
    old_tiddler_content_uri = oldTiddler.getFieldString("_tiddler_content_uri");
    if (old_tiddler_content_uri !== undefined && old_tiddler_content_uri !== null && old_tiddler_content_uri.trim() !== "") {
      old_tiddler_content_uri = old_tiddler_content_uri.trim();
    } else {
      old_tiddler_content_uri = null;
    }
  }

  // Nothing to do
  if (canonical_uri == old_canonical_uri && tiddler_uri == old_tiddler_uri && tiddler_content_uri == old_tiddler_content_uri) {
    updatedTiddler = new $tw.Tiddler(tiddler);
    $tw.wiki.addTiddler(updatedTiddler);
    return updatedTiddler;
  }

  var addTags = [];
  var removeTags = [];

  var content = tiddler.getFieldString("text");

  // Attachment
  if (info.encoding === "base64" || type === "image/svg+xml") {

    // Process canonical_uri if any update
    if (canonical_uri !== old_canonical_uri) {

      // _canonical_uri attribute has been removed, embed
      if (canonical_uri == null) {

        // Load
        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_canonical_uri);
          if (info.encoding === "base64") {
            content = await $tw.utils.loadToBase64(parsed);
          } else {
            content = await $tw.utils.loadToUtf8(parsed);
          }
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            addTags: ["$:/isAttachment", "$:/isEmbedded"],
            removeTags: ["$:/isImported", "$:/isIpfs"],
            fields: [
              { key: "text", value: content.data }
            ]
          });
          this.getLogger().info(
            "Embeded remote attachment: "
            + content.data.length
            + " bytes"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _canonical_uri attribute has been updated
      } else {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(canonical_uri);
          // Decode CID
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          // IPFS resource
          if (cid !== null) {
            addTags = ["$:/isAttachment", "$:/isIpfs"];
            removeTags = ["$:/isEmbedded", "$:/isImported"];
          } else {
            addTags = ["$:/isAttachment"];
            removeTags = ["$:/isEmbedded", "$:/isImported", "$:/isIpfs"];
          }
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            addTags: addTags,
            removeTags: removeTags,
            fields: [
              { key: "text", value: "" }
            ]
          });
          // Discard unpin request
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.discardRequestToUnpin(cid);
          }
          this.getLogger().info(
            "Updated remote attachment:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous canonical_uri if any
      if (old_canonical_uri !== null) {
        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_canonical_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }
      }

    }

  // Tiddler
  } else {

    // Process if any update
    if (canonical_uri !== old_canonical_uri) {

      // _canonical_uri attribute has been removed
      if (canonical_uri == null) {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_canonical_uri);
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            removeTags: ["$:/isAttachment", "$:/isEmbedded", "$:/isImported", "$:/isIpfs"]
          });
          this.getLogger().info(
            "Embeded remote Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _canonical_uri attribute has been updated
      } else {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(canonical_uri);
          var { cid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          // IPFS resource
          if (cid !== null) {
            addTags = ["$:/isImported", "$:/isIpfs"];
            removeTags = ["$:/isAttachment", "$:/isEmbedded"];
          } else {
            addTags = ["$:/isImported"];
            removeTags = ["$:/isAttachment", "$:/isEmbedded", "$:/isIpfs"];
          }
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: tiddler,
            addTags: addTags,
            removeTags: removeTags,
            fields: [
              { key: "text", value: "" }
            ]
          });
          this.getLogger().info(
            "Updated remote Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

    }

    // Process if any update
    if (tiddler_uri !== old_tiddler_uri) {

      updatedTiddler = updatedTiddler !== null ? updatedTiddler : tiddler;

      // _tiddler_uri attribute has been removed
      if (tiddler_uri == null) {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_tiddler_uri);
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler
          });
          this.getLogger().info(
            "Removed exported Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _tiddler_uri attribute has been updated
      } else {

        try {
          // New _tiddler_uri
          const parsed = await $tw.ipfs.normalizeIpfsUrl(tiddler_uri);
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler
          });
          // Discard unpin request
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.discardRequestToUnpin(cid);
          }
          this.getLogger().info(
            "Updated exported Tiddler:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous tiddler_uri if any
      if (old_tiddler_uri !== null) {
        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_tiddler_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }
      }

    }

    // Process if any update
    if (tiddler_content_uri !== old_tiddler_content_uri) {

      updatedTiddler = updatedTiddler !== null ? updatedTiddler : tiddler;

      // _tiddler_content_uri attribute has been removed
      if (tiddler_content_uri == null) {

        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_tiddler_content_uri);
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler
          });
          this.getLogger().info(
            "Removed Tiddler content:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      // _tiddler_content_uri attribute has been updated
      } else {

        try {
          // New _tiddler_content_uri
          const parsed = await $tw.ipfs.normalizeIpfsUrl(tiddler_content_uri);
          // Update Tiddler
          updatedTiddler = $tw.utils.updateTiddler({
            tiddler: updatedTiddler
          });
          // Discard unpin request
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.discardRequestToUnpin(cid);
          }
          this.getLogger().info(
            "Updated Tiddler content:"
            + "\n "
            + parsed.href
          );
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }

      }

      // Process previous tiddler_content_uri if any
      if (old_tiddler_content_uri !== null) {
        try {
          const parsed = await $tw.ipfs.normalizeIpfsUrl(old_tiddler_content_uri);
          const { cid: oldCid } = this.ipfsWrapper.decodeCid(parsed.pathname);
          if ($tw.utils.getIpfsUnpin() && oldCid !== null) {
            $tw.ipfs.requestToUnpin(oldCid);
          }
        } catch (error) {
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          return oldTiddler;
        }
      }

    }

  }

  // Check
  if (updatedTiddler == null) {
    updatedTiddler = new $tw.Tiddler(tiddler);
  }

  // Update
  $tw.wiki.addTiddler(updatedTiddler);
  return updatedTiddler;

}

exports.IpfsTiddler = IpfsTiddler;

})();
