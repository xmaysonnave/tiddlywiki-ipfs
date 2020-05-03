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

  var IpfsAction = function (ipfsController) {
    this.once = false;
    this.console = false;
    this.ipfsController = ipfsController;
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
    try {
      var fields = [];
      var export_uri = null;
      var ipnsKey = null;
      var ipnsName = null;
      var ipnsCid = null;
      var ipfs = null;
      var ensCid = null;
      var protocol = null;
      var cid = null;
      const title = event.tiddlerTitle;
      const tiddler = $tw.wiki.getTiddler(title);
      // Check
      export_uri = tiddler.getFieldString("_export_uri");
      if (export_uri == undefined || export_uri == null || export_uri.trim() === "") {
        export_uri = null;
      } else {
        export_uri = export_uri.trim();
      }
      try {
        export_uri = this.ipfsController.getUrl(export_uri);
      } catch (error) {
        // Log an continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }
      // URL Analysis
      if (export_uri !== null && export_uri.protocol !== fileProtocol) {
        // Decode pathname
        var { protocol, cid } = this.ipfsController.decodeCid(export_uri.pathname);
        // Check
        if ($tw.utils.getIpfsUnpin() && protocol != null && protocol === ipfsKeyword && cid != null) {
          await this.ipfsController.requestToUnpin(cid);
        }
      }
      // Analyse IPNS
      if (protocol == ipnsKeyword) {
        var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(cid);
        try {
          ipnsCid = await this.ipfsController.resolveIpnsKey(ipnsKey);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
        // Request to unpin
        if ($tw.utils.getIpfsUnpin() && ipnsCid !== null) {
          await this.ipfsController.requestToUnpin(ipnsCid);
        }
      }
      // Analyse URI
      if (export_uri.hostname.endsWith(".eth")) {
        // Fetch ENS domain content
        var { content: ensCid } = await this.ipfsController.resolveEns(export_uri.hostname);
        // Request to unpin
        if ($tw.utils.getIpfsUnpin() && ensCid !== null) {
          await this.ipfsController.requestToUnpin(ensCid);
        }
      }
      // Retrieve content
      const content = await this.ipfsController.exportTiddler(tiddler, child);
      // Check
      if (content == null) {
        return false;
      }
      this.getLogger().info("Uploading Tiddler: " + content.length + " bytes");
      // Add
      const { added } = await this.ipfsController.addToIpfs(content);
      // Save
      fields.push({ key: "_export_uri", value: "/" + ipfsKeyword + "/" + added });
      try {
        await this.ipfsController.pinToIpfs(added);
      } catch (error) {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }
      // Publish to IPNS
      if (protocol == ipnsKeyword) {
        this.getLogger().info("Publishing IPNS Tiddler: " + ipnsName);
        fields.push({ key: "_export_uri", value: "/" + ipnsKeyword + "/" + ipnsKey });
        /*
         * Publishing is failing as the server is behind a nat
         * However the local server is getting the update ????
         **/
        try {
          await this.ipfsController.publishToIpns(ipnsKey, ipnsName, added);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
      // Publish to ENS
      if (export_uri.hostname.endsWith(".eth")) {
        fields.push({ key: "_export_uri", value: "https://" + export_uri.hostname });
        try {
          await this.ipfsController.setEns(export_uri.hostname, added);
        } catch (error) {
          // Log and continue
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          // Discard unpin request
          this.ipfsController.discardRequestToUnpin(ensCid);
        }
      }
      var updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        addTags: ["$:/isExported", "$:/isIpfs"],
        fields: fields,
      });
      $tw.wiki.addTiddler(updatedTiddler);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }
    return true;
  };

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function (event) {
    try {
      const title = event.tiddlerTitle;

      // Load tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      // Retrieve Content-Type
      const { type, info } = this.ipfsController.getContentType(tiddler);

      // Check
      if (info.encoding !== "base64" && type !== "image/svg+xml") {
        $tw.utils.alert(name, "This Tiddler do not contain any attachment...");
        return false;
      }

      // Do not process if _canonical_uri is set
      const canonical_uri = tiddler.getFieldString("_canonical_uri");
      if (canonical_uri !== undefined && canonical_uri !== null && canonical_uri.trim() !== "") {
        $tw.utils.alert(name, "Attachment is already published...");
        return false;
      }

      // Getting content
      const content = this.ipfsController.getAttachmentContent(tiddler);
      // Check
      if (content == null) {
        return false;
      }

      this.getLogger().info("Uploading attachment: " + content.length + " bytes");

      // Add
      const { added } = await this.ipfsController.addToIpfs(content);

      try {
        await this.ipfsController.pinToIpfs(added);
      } catch (error) {
        // Log an continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
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
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        addTags: addTags,
        removeTags: removeTags,
        fields: [
          { key: "text", value: "" },
          { key: "_canonical_uri", value: "/" + ipfsKeyword + "/" + added },
        ],
      });
      $tw.wiki.addTiddler(updatedTiddler);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleRenameIpnsName = async function (event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }
      if (this.ipnsName == null || this.ipnsName === ipnsName) {
        $tw.utils.alert(name, "Nothing to rename....");
        return false;
      }

      // Rename IPNS name
      const { ipnsKey } = await this.ipfsController.renameIpnsName(this.ipnsName, ipnsName);

      // Update Tiddler
      const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: ipnsKey }],
        });
        $tw.wiki.addTiddler(updatedTiddler);
      }

      // Successfully renamed
      this.ipnsName = ipnsName;
      this.ipnsKey = ipnsKey;
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleGenerateIpnsKey = async function (event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // Generate IPNS key
      const key = await this.ipfsController.generateIpnsKey(ipnsName);

      // Update Tiddler
      const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: key }],
        });
        $tw.wiki.addTiddler(updatedTiddler);
      }

      // Successfully generated
      this.ipnsName = ipnsName;
      this.ipnsKey = key;
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleRemoveIpnsKey = async function (event) {
    try {
      // Retrieve default IPNS name
      var cid = null;
      var ipnsName = $tw.utils.getIpfsIpnsName();
      var ipnsKey = $tw.utils.getIpfsIpnsKey();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // Resolve CID,
      var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(ipnsKey, ipnsName);
      try {
        cid = await this.ipfsController.resolveIpnsKey(ipnsKey);
      } catch (error) {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }

      // Unpin
      if ($tw.utils.getIpfsUnpin() && cid != null) {
        try {
          await this.ipfsController.unpinFromIpfs(cid);
          this.ipfsController.discardRequestToUnpin(cid);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }

      // Remove IPNS key
      await this.ipfsController.removeIpnsKey(ipnsName);

      // Update Tiddlers
      var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: "" }],
        });
        $tw.wiki.addTiddler(updatedTiddler);
      }
      tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined && $tw.utils.getIpfsIpnsKey() !== null) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: "" }],
        });
        $tw.wiki.addTiddler(updatedTiddler);
      }

      // Successfully removed
      this.ipnsName = null;
      this.ipnsKey = null;
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleFetchIpnsKey = async function (event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();
      var ipnsKey = $tw.utils.getIpfsIpnsKey();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // Fetch
      const { ipnsKey: resolvedIpnsKey } = await this.ipfsController.getIpnsIdentifiers(ipnsKey, ipnsName);

      // Update Tiddler
      var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: resolvedIpnsKey }],
        });
        $tw.wiki.addTiddler(updatedTiddler);
        this.ipnsKey = resolvedIpnsKey;
      }
      this.ipnsName = ipnsName;
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function (event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();
      var ipnsKey = $tw.utils.getIpfsIpnsKey();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // Resolve CID
      var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(ipnsKey, ipnsName);
      const resolved = await this.ipfsController.resolveIpnsKey(ipnsKey);

      // Update Tiddler
      var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
        $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: ipnsKey }],
        });
        this.ipnsKey = ipnsKey;
      }
      this.ipnsName = ipnsName;

      if (resolved !== null) {
        // Build URL
        const url = await this.ipfsController.normalizeUrl("/" + ipfsKeyword + "/" + resolved);
        window.open(url.href, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleMobileConsole = async function (tiddler) {
    // Load mobile console if applicable
    if (typeof window.eruda === "undefined") {
      try {
        // Load eruda
        await this.ipfsController.ipfsBundle.ipfsLoader.loadErudaLibrary();
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
    try {
      // Process document URL
      const wiki = this.ipfsController.getDocumentUrl();

      // Check
      if (wiki.protocol === fileProtocol) {
        $tw.utils.alert(name, "Undefined IPFS identifier...");
        return false;
      }
      if (wiki.pathname === "/") {
        $tw.utils.alert(name, "Unknown IPFS identifier...");
        return false;
      }

      // Extract and check URL IPFS protocol and CID
      var { protocol, cid } = this.ipfsController.decodeCid(wiki.pathname);

      // Check
      if (protocol == null) {
        $tw.utils.alert(name, "Unknown IPFS protocol...");
        return false;
      }
      if (cid == null) {
        $tw.utils.alert(name, "Unknown IPFS identifier...");
        return false;
      }

      // Default IPNS key and IPNS name
      var ipnsKey = $tw.utils.getIpfsIpnsKey();
      var ipnsName = $tw.utils.getIpfsIpnsName();
      var resolved = null;

      // Check
      if (ipnsKey == null) {
        $tw.utils.alert(name, "Undefined default IPNS key....");
        return false;
      }

      if (protocol === ipnsKeyword) {
        // Check
        if (ipnsKey === cid) {
          $tw.utils.alert(name, "Default IPNS key matches current IPNS key....");
          return false;
        }
        // Resolve current IPNS key
        this.getLogger().info("Processing current IPNS...");
        const { ipnsKey: currentIpnsKey } = await this.ipfsController.getIpnsIdentifiers(cid);
        try {
          cid = null;
          cid = await this.ipfsController.resolveIpnsKey(currentIpnsKey);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }

      // Resolve default IPNS key and IPNS name
      this.getLogger().info("Processing default IPNS...");
      var { ipnsKey, ipnsName } = await this.ipfsController.getIpnsIdentifiers(ipnsKey, ipnsName);
      try {
        resolved = await this.ipfsController.resolveIpnsKey(ipnsKey);
      } catch (error) {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }

      // Check
      if (resolved !== null && resolved === cid) {
        $tw.utils.alert(name, "IPFS identifiers are matching....");
        return false;
      }

      this.getLogger().info("Publishing IPNS name: " + ipnsName);

      /*
       * Publishing is failing as the server is behind a nat
       * However the local server is getting the update ????
       **/
      try {
        await this.ipfsController.publishToIpns(ipnsKey, ipnsName, cid);
      } catch (error) {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }

      // Unpin
      if ($tw.utils.getIpfsUnpin() && resolved != null) {
        try {
          await this.ipfsController.unpinFromIpfs(resolved);
          this.ipfsController.discardRequestToUnpin(resolved);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    $tw.utils.alert("Successfully Published...");

    return true;
  };

  exports.IpfsAction = IpfsAction;
})();
