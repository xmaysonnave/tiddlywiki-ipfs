/*\
title: $:/plugins/ipfs/ipfs-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsAction

\*/

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  const EnsWrapper = require("$:/plugins/ipfs/ens-wrapper.js").EnsWrapper;
  const IpfsWrapper = require("$:/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

  const fileProtocol = "file:";
  const ipfsKeyword = "ipfs";
  const ipnsKeyword = "ipns";

  const name = "ipfs-action";

  var IpfsAction = function() {
    this.once = false;
    this.console = false;
    this.ensWrapper = new EnsWrapper();
    this.ipfsWrapper = new IpfsWrapper();
    this.ipnsName = $tw.utils.getIpfsIpnsName();
    this.ipnsKey = $tw.utils.getIpfsIpnsKey();
  };

  IpfsAction.prototype.getLogger = function() {
    return window.log.getLogger(name);
  };

  IpfsAction.prototype.init = function() {
    // Init once
    if (this.once) {
      return;
    }
    const self = this;
    // Widget
    $tw.rootWidget.addEventListener("tm-ipfs-export", async function(event) {
      return await self.handleExportToIpfs(event, false);
    });
    $tw.rootWidget.addEventListener("tm-ipfs-export-content", async function(event) {
      return await self.handleExportToIpfs(event, true);
    });
    $tw.rootWidget.addEventListener("tm-ipns-fetch", async function(event) {
      return await self.handleFetchIpnsKey(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-generate", async function(event) {
      return await self.handleGenerateIpnsKey(event);
    });
    $tw.rootWidget.addEventListener("tm-console-mobile", async function(event) {
      return await self.handleMobileConsole(event);
    });
    $tw.rootWidget.addEventListener("tm-ipfs-export-attachment", async function(event) {
      return await self.handleExportAttachmentToIpfs(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-publish", async function(event) {
      return await self.handlePublishToIpns(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-remove", async function(event) {
      return await self.handleRemoveIpnsKey(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-rename", async function(event) {
      return await self.handleRenameIpnsName(event);
    });
    $tw.rootWidget.addEventListener("tm-ipns-resolve-and-open", async function(event) {
      return await self.handleResolveIpnsKeyAndOpen(event);
    });
    // Init once
    this.once = true;
  };

  IpfsAction.prototype.handleExportToIpfs = async function(event, child) {
    try {
      var fields = [];
      var export_uri = null;
      var ipnsKey = null;
      var ipnsName = null;
      var ipnsContent = null;
      var ipfs = null;
      var ensContent = null;
      var protocol = null;
      var cid = null;

      const title = event.tiddlerTitle;

      // Load tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler == undefined || tiddler == null) {
        $tw.utils.alert(name, "Unknown Tiddler...");
        return false;
      }

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
        $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
        return false;
      }

      // Check
      export_uri = tiddler.getFieldString("_export_uri");
      if (export_uri == undefined || export_uri == null || export_uri.trim() === "") {
        export_uri = null;
      } else {
        export_uri = export_uri.trim();
      }

      try {
        export_uri = $tw.ipfs.getUrl(export_uri);
      } catch (error) {
        // Log an continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
        export_uri = null;
      }

      // IPFS client
      var { ipfs } = await $tw.ipfs.getIpfsClient();

      // URL Analysis
      if (export_uri !== null && export_uri.protocol !== fileProtocol) {
        // Decode pathname
        var { protocol, cid } = this.ipfsWrapper.decodeCid(export_uri.pathname);
        // Check
        if (protocol != null && cid != null) {
          if ($tw.utils.getIpfsUnpin() && protocol === ipfsKeyword) {
            $tw.ipfs.requestToUnpin(cid);
          }
        }
      }

      // Analyse IPNS
      if (protocol == ipnsKeyword) {
        var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        try {
          ipnsContent = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
          ipnsContent = null;
        }
        // Request to unpin
        if ($tw.utils.getIpfsUnpin() && ipnsContent !== null) {
          $tw.ipfs.requestToUnpin(ipnsContent);
        }
      }

      // Analyse URI
      if (export_uri.hostname.endsWith(".eth")) {
        // Retrieve a Web3 provider
        const { web3 } = await $tw.ipfs.getWeb3Provider();
        // Fetch ENS domain content
        var { content: ensContent } = await this.ensWrapper.getContenthash(export_uri.hostname, web3);
        // Request to unpin
        if ($tw.utils.getIpfsUnpin() && ensContent !== null) {
          $tw.ipfs.requestToUnpin(ensContent);
        }
      }

      // Getting content
      const content = this.ipfsWrapper.exportTiddler(tiddler, child);

      // Check
      if (content == null) {
        return false;
      }

      this.getLogger().info("Uploading Tiddler: " + content.length + " bytes");

      // Add
      const { added } = await this.ipfsWrapper.addToIpfs(ipfs, content);
      // Default
      fields.push({ key: "_export_uri", value: "/" + ipfsKeyword + "/" + added });

      try {
        await this.ipfsWrapper.pinToIpfs(ipfs, added);
      } catch (error) {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }

      // Publish to IPNS
      if (protocol == ipnsKeyword) {
        this.getLogger().info("Publishing IPNS Tiddler: " + ipnsName);
        try {
          await this.ipfsWrapper.publishToIpns(ipfs, ipnsKey, ipnsName, added);
          fields.push({ key: "_export_uri", value: "/" + ipnsKeyword + "/" + ipnsKey });
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
          // Discard unpin request
          $tw.ipfs.discardRequestToUnpin(ipnsContent);
        }
      }

      // Publish to ENS
      if (export_uri.hostname.endsWith(".eth")) {
        this.getLogger().info("Publishing ENS domain content: " + export_uri.hostname);
        try {
          // Retrieve an enabled Web3 provider
          const { web3, account } = await $tw.ipfs.getEnabledWeb3Provider();
          // Set ENS domain content
          await this.ensWrapper.setContenthash(export_uri.hostname, added, web3, account);
          fields.push({ key: "_export_uri", value: "https://" + export_uri.hostname });
        } catch (error) {
          // Log and continue
          this.getLogger().error(error);
          $tw.utils.alert(name, error.message);
          // Discard unpin request
          $tw.ipfs.discardRequestToUnpin(ensContent);
        }
      }

      var updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: fields
      });
      $tw.wiki.addTiddler(updatedTiddler);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function(event) {
    try {
      const title = event.tiddlerTitle;

      // Load tiddler
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler == undefined || tiddler == null) {
        $tw.utils.alert(name, "Unknown Tiddler...");
        return false;
      }

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
        $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
        return false;
      }

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
      const content = this.ipfsWrapper.getTiddlerContent(tiddler);
      // Check
      if (content == null) {
        return false;
      }

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      this.getLogger().info("Uploading attachment: " + content.length + " bytes");

      // Add
      const { added } = await this.ipfsWrapper.addToIpfs(ipfs, content);

      try {
        await this.ipfsWrapper.pinToIpfs(ipfs, added);
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
          { key: "_canonical_uri", value: "/" + ipfsKeyword + "/" + added }
        ]
      });
      $tw.wiki.addTiddler(updatedTiddler);
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleRenameIpnsName = async function(event) {
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

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Rename IPNS name
      const { key } = await this.ipfsWrapper.renameIpnsName(ipfs, this.ipnsName, ipnsName);

      // Update Tiddler
      const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: key }]
        });
        $tw.wiki.addTiddler(updatedTiddler);
      }

      // Successfully renamed
      this.ipnsName = ipnsName;
      this.ipnsKey = key;
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleGenerateIpnsKey = async function(event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Generate IPNS key
      const key = await this.ipfsWrapper.generateIpnsKey(ipfs, ipnsName);

      // Update Tiddler
      const tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: key }]
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

  IpfsAction.prototype.handleRemoveIpnsKey = async function(event) {
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

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve CID,
      var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
      try {
        cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
      } catch (error) {
        // Log and continue
        this.getLogger().warn(error);
        $tw.utils.alert(name, error.message);
      }

      // Unpin previous
      if ($tw.utils.getIpfsUnpin() && cid != null) {
        try {
          await this.ipfsWrapper.unpinFromIpfs(ipfs, cid);
          $tw.ipfs.discardRequestToUnpin(cid);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }

      // Remove IPNS key
      await this.ipfsWrapper.removeIpnsKey(ipfs, ipnsKey, ipnsName);

      // Update Tiddlers
      var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/name");
      if (tiddler !== undefined) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: "" }]
        });
        $tw.wiki.addTiddler(updatedTiddler);
      }
      tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined && $tw.utils.getIpfsIpnsKey() !== null) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: "" }]
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

  IpfsAction.prototype.handleFetchIpnsKey = async function(event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();
      var ipnsKey = $tw.utils.getIpfsIpnsKey();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Fetch
      const { ipnsKey: resolvedIpnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);

      // Update Tiddler
      var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined && this.ipnsKey !== resolvedIpnsKey) {
        const updatedTiddler = $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: resolvedIpnsKey }]
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

  IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function(event) {
    try {
      // Retrieve default IPNS name
      var ipnsName = $tw.utils.getIpfsIpnsName();
      var ipnsKey = $tw.utils.getIpfsIpnsKey();

      // Check
      if (ipnsName == null) {
        $tw.utils.alert(name, "Undefined IPNS name....");
        return false;
      }

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

      // Resolve CID
      var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
      const resolved = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);

      // Update Tiddler
      var tiddler = $tw.wiki.getTiddler("$:/ipfs/saver/ipns/key");
      if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
        $tw.utils.updateTiddler({
          tiddler: tiddler,
          fields: [{ key: "text", value: ipnsKey }]
        });
        this.ipnsKey = ipnsKey;
      }
      this.ipnsName = ipnsName;

      if (resolved !== null) {
        // Build URL
        const parsed = await $tw.ipfs.normalizeIpfsUrl("/" + ipfsKeyword + "/" + resolved);
        window.open(parsed.toString(), "_blank", "noopener");
      }
    } catch (error) {
      this.getLogger().error(error);
      $tw.utils.alert(name, error.message);
      return false;
    }

    return true;
  };

  IpfsAction.prototype.handleMobileConsole = async function(tiddler) {
    // Load mobile console if applicable
    if (typeof window.eruda === "undefined") {
      try {
        // Load eruda
        await $tw.ipfs.getLoader().loadErudaLibrary();
      } catch (error) {
        this.getLogger().error(error);
      }
      let eruda = window.document.createElement("div");
      window.document.body.appendChild(eruda);
      window.eruda.init({
        container: eruda,
        tool: ["console"],
        useShadowDom: false
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

  IpfsAction.prototype.handlePublishToIpns = async function(event) {
    try {
      // Process document URL
      const wiki = $tw.ipfs.getDocumentUrl();

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
      var { protocol, cid } = this.ipfsWrapper.decodeCid(wiki.pathname);

      // Check
      if (protocol == null) {
        $tw.utils.alert(name, "Unknown IPFS protocol...");
        return false;
      }
      if (cid == null) {
        $tw.utils.alert(name, "Unknown IPFS identifier...");
        return false;
      }

      // IPFS client
      const { ipfs } = await $tw.ipfs.getIpfsClient();

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
        const { ipnsKey: currentIpnsKey } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, cid);
        try {
          cid = await this.ipfsWrapper.resolveIpnsKey(ipfs, currentIpnsKey);
        } catch (error) {
          // Log and continue
          this.getLogger().warn(error);
          $tw.utils.alert(name, error.message);
        }
      }

      // Resolve default IPNS key and IPNS name
      this.getLogger().info("Processing default IPNS...");
      var { ipnsKey, ipnsName } = await this.ipfsWrapper.getIpnsIdentifiers(ipfs, ipnsKey, ipnsName);
      try {
        resolved = await this.ipfsWrapper.resolveIpnsKey(ipfs, ipnsKey);
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

      await this.ipfsWrapper.publishToIpns(ipfs, ipnsKey, ipnsName, cid);

      // Unpin previous
      if ($tw.utils.getIpfsUnpin() && resolved != null) {
        try {
          await this.ipfsWrapper.unpinFromIpfs(ipfs, resolved);
          $tw.ipfs.discardRequestToUnpin(resolved);
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

    return true;
  };

  exports.IpfsAction = IpfsAction;
})();
