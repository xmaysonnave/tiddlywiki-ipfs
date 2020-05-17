/*\
title: $:/plugins/ipfs/ipfs-import.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Import

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  const name = 'ipfs-import'

  const local = '<a href="'
  const remote = '<a rel="noopener noreferrer" target="_blank" href="'

  const alertKeyFailed = function (strings, field, url, title) {
    var failed = strings[0]
    var from = strings[1]
    var endH = strings[2]
    var endL = strings[3]
    if (
      url.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      url.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${failed}${field}${from}${local}${url}${endH}${title}${endL}`
    } else {
      return `${failed}${field}${from}${remote}${url}${endH}${title}${endL}`
    }
  }

  const alertFailed = function (
    strings,
    msg,
    key,
    field,
    parentUrl,
    parentTitle,
    parentField
  ) {
    var space = strings[1]
    var endH1 = strings[2]
    var endL1 = strings[3]
    var endH2 = strings[4]
    var endL2 = strings[5]
    if (
      parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${local}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    } else {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${remote}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    }
  }

  const alertTypeFailed = function (
    strings,
    msg,
    type,
    key,
    field,
    parentUrl,
    parentTitle,
    parentField
  ) {
    var space = strings[1]
    var from = strings[2]
    var endH1 = strings[3]
    var endL1 = strings[4]
    var endH2 = strings[5]
    var endL2 = strings[6]
    if (
      parentUrl.hostname === $tw.ipfs.getDocumentUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getDocumentUrl().pathname
    ) {
      return `${msg}${space}${type}${from}${remote}${key}${endH1}${field}${endL1}${local}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    } else {
      return `${msg}${space}${type}${from}${remote}${key}${endH1}${field}${endL1}${remote}${parentUrl}${endH2}${parentTitle}${endL2}${parentField}`
    }
  }

  var IpfsImport = function () {}

  IpfsImport.prototype.getLogger = function () {
    return window.log.getLogger(name)
  }

  IpfsImport.prototype.hasTitle = function (key, title) {
    var imported = this.loaded.get(key)
    if (imported !== undefined) {
      var importedTitle = imported.get(title)
      if (importedTitle !== undefined) {
        return true
      }
    }
    return false
  }

  IpfsImport.prototype.removeTitles = function (keys, title) {
    var removed = 0
    for (var key of this.loaded.keys()) {
      if (keys.indexOf(key) !== -1) {
        continue
      }
      const imported = this.loaded.get(key)
      if (imported.delete(title)) {
        removed += 1
      }
    }
    return removed
  }

  IpfsImport.prototype.getKey = async function (base, value) {
    var cid = null
    var ipnsKey = null
    var key = null
    var normalizedUrl = null
    var resolvedUrl = null
    value =
      value === undefined || value == null || value.trim() === ''
        ? null
        : value.trim()
    if (value == null) {
      return null
    }
    var {
      cid,
      ipnsKey,
      normalizedUrl,
      resolvedUrl
    } = await $tw.ipfs.resolveUrl(false, true, value, base)
    if (normalizedUrl == null && resolvedUrl == null) {
      throw new Error(`Failed to resolve value: "${value}"`)
    }
    if (cid !== null) {
      key = '/ipfs/' + cid
    } else if (ipnsKey !== null) {
      key = '/ipns/' + ipnsKey
    } else if (normalizedUrl.hostname.endsWith('.eth')) {
      key = normalizedUrl.hostname
    } else {
      key = normalizedUrl.toString()
    }
    return {
      key: key,
      resolvedUrl: resolvedUrl
    }
  }

  IpfsImport.prototype.import = async function (
    canonicalUri,
    importUri,
    title
  ) {
    canonicalUri =
      canonicalUri === undefined ||
      canonicalUri == null ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    importUri =
      importUri === undefined || importUri == null || importUri.trim() === ''
        ? null
        : importUri.trim()
    this.host =
      title !== undefined && title !== null && title.trim() !== ''
        ? $tw.wiki.getTiddler(title.trim())
        : null
    if (this.host === undefined) {
      this.host = null
    }
    this.loaded = new Map()
    this.notLoaded = []
    this.isEmpty = []
    this.resolved = new Map()
    this.notResolved = []
    this.processedImported = new Map()
    this.processedTitles = new Map()
    this.root = null
    try {
      // Load and prepare imported tiddlers to be processed
      // var added = 0
      // var updated = 0
      const url = $tw.ipfs.getDocumentUrl()
      url.hash = title
      if (canonicalUri !== null || importUri !== null) {
        this.getLogger().info('*** Begin Import ***')
        const { loaded, removed: loadedRemoved } = await this.loadResources(
          url,
          title,
          canonicalUri,
          importUri
        )
        const { processed, removed: processedRemoved } = this.processTiddlers()
        this.getLogger().info(`*** Loaded: ${this.loaded.size} Resource(s) ***`)
        this.getLogger().info(
          `*** Loaded: ${this.isEmpty.length} Empty Resource(s) ***`
        )
        this.getLogger().info(
          `*** Failed to load: ${this.notLoaded.length} Resource(s) ***`
        )
        this.getLogger().info(
          `*** Failed to resolve: ${this.notResolved.length} URL(s) ***`
        )
        this.getLogger().info(
          `*** Loaded: ${loaded} and Removed: ${loadedRemoved} Tiddler(s) ***`
        )
        this.getLogger().info(
          `*** Processed: ${processed} and Removed: ${processedRemoved} Tiddler(s) ***`
        )
      }
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
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    this.getLogger().info('*** End Import ***')
    this.host = null
    this.loaded = null
    this.isEmpty = null
    this.notLoaded = null
    this.resolved = null
    this.notResolved = null
    this.processedImported = null
    this.processedTitles = null
    this.root = null
  }

  IpfsImport.prototype.loadResources = async function (
    parentUrl,
    parentTitle,
    canonicalUri,
    importUri
  ) {
    var loaded = 0
    var removed = 0
    var canonicalKey = null
    var resolvedCanonicalKey = null
    if (
      canonicalUri !== null &&
      this.notResolved.indexOf(canonicalUri) === -1 &&
      this.resolved.get(canonicalUri) === undefined
    ) {
      try {
        var {
          key: canonicalKey,
          resolvedUrl: resolvedCanonicalKey
        } = await this.getKey(parentUrl, canonicalUri)
        this.resolved.set(canonicalUri, canonicalKey)
      } catch (error) {
        var field = '_canonical_uri'
        this.notResolved.push(canonicalUri)
        this.getLogger().error(error)
        $tw.utils.alert(
          name,
          alertKeyFailed`Failed to Resolve field: "${field}" from: ${parentUrl}">${parentTitle}</a>`
        )
      }
    }
    var importKey = null
    var resolvedImportKey = null
    if (
      importUri !== null &&
      this.notResolved.indexOf(importUri) === -1 &&
      this.resolved.get(importUri) === undefined
    ) {
      try {
        var {
          key: importKey,
          resolvedUrl: resolvedImportKey
        } = await this.getKey(parentUrl, importUri)
        this.resolved.set(importUri, importKey)
      } catch (error) {
        var field = '_import_uri'
        this.notResolved.push(canonicalUri)
        this.getLogger().error(error)
        $tw.utils.alert(
          name,
          alertKeyFailed`Failed to Resolve field: "${field}" from: ${parentUrl}">${parentTitle}</a>`
        )
      }
    }
    if (
      canonicalKey !== null &&
      this.notLoaded.indexOf(canonicalKey) === -1 &&
      this.loaded.get(canonicalKey) === undefined
    ) {
      const {
        loaded: loadedAdded,
        removed: loadedRemoved
      } = await this.loadResource(
        parentUrl,
        parentTitle,
        '_canonical_uri',
        canonicalKey,
        resolvedCanonicalKey
      )
      loaded = loadedAdded
      removed = loadedRemoved
    }
    if (
      importKey !== null &&
      this.notLoaded.indexOf(importKey) === -1 &&
      this.loaded.get(importKey) === undefined
    ) {
      const {
        loaded: loadedAdded,
        removed: loadedRemoved
      } = await this.loadResource(
        parentUrl,
        parentTitle,
        '_import_uri',
        importKey,
        resolvedImportKey
      )
      loaded += loadedAdded
      removed += loadedRemoved
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.loadResource = async function (
    parentUrl,
    parentTitle,
    parentField,
    key,
    resolvedKey
  ) {
    var loaded = 0
    var removed = 0
    var content = null
    var imported = new Map()
    var tiddlers = null
    try {
      // Load
      content = await $tw.ipfs.loadToUtf8(resolvedKey.toString())
      if ($tw.ipfs.isJson(content.data)) {
        tiddlers = $tw.wiki.deserializeTiddlers(
          '.json',
          content.data,
          $tw.wiki.getCreationFields()
        )
      } else {
        tiddlers = $tw.wiki.deserializeTiddlers(
          '.tid',
          content.data,
          $tw.wiki.getCreationFields()
        )
      }
      // Loaded
      if (tiddlers !== undefined && tiddlers !== null) {
        this.loaded.set(key, imported)
        for (var i in tiddlers) {
          var tiddler = tiddlers[i]
          var title = tiddler.title
          if (title === undefined || title == null || title.trim() === '') {
            var msg = 'Ignored Unknown'
            var field = 'Title'
            this.getLogger().info(
              `${msg} "${field}":\n ${resolvedKey} \n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertFailed`${msg}: ${resolvedKey}">${field}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
            )
            removed += 1
            continue
          }
          if (imported.get(title) !== undefined) {
            var msg = 'Ignored Duplicate'
            this.getLogger().info(
              `${msg} "${title}"\n ${resolvedKey} \n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertFailed`${msg}: ${resolvedKey}">${title}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
            )
            removed += 1
            continue
          }
          var type = tiddler.type
          if (type === undefined || type == null) {
            type = 'text/vnd.tiddlywiki'
          }
          var info = $tw.config.contentTypeInfo[type]
          if (info === undefined || info == null) {
            var msg = 'Unknown Content-Type'
            this.getLogger().info(
              `${msg} "${type}" from: "${title}"\n ${resolvedKey} \n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertTypeFailed`${msg}: "${type}" from ${resolvedKey}">${title}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
            )
            // Default
            type = 'text/vnd.tiddlywiki'
            info = $tw.config.contentTypeInfo[type]
          }
          tiddler.type = type
          // Next
          var canonicalUri = tiddler._canonical_uri
          canonicalUri =
            canonicalUri === undefined ||
            canonicalUri == null ||
            canonicalUri.trim() === ''
              ? null
              : canonicalUri.trim()
          var importUri = tiddler._import_uri
          importUri =
            importUri === undefined ||
            importUri == null ||
            importUri.trim() === ''
              ? null
              : importUri.trim()
          if (info.encoding !== 'base64' && tiddler.type !== 'image/svg+xml') {
            if (canonicalUri !== null || importUri !== null) {
              const {
                loaded: loadedAdded,
                removed: loadedRemoved
              } = await this.loadResources(
                resolvedKey,
                title,
                canonicalUri,
                importUri
              )
              loaded += loadedAdded
              removed += loadedRemoved
            }
          }
          imported.set(title, tiddler)
          loaded += 1
        }
      }
      if (imported.size === 0) {
        this.isEmpty.push(key)
        var msg = 'Empty'
        var field = 'Content'
        this.getLogger().info(
          `${msg} ${field}:\n ${resolvedKey} \n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
        )
        $tw.utils.alert(
          name,
          alertFailed`${msg}: ${resolvedKey}">${field}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
        )
      }
    } catch (error) {
      this.notLoaded.push(key)
      var msg = 'Failed to Load'
      var field = 'Resource'
      this.getLogger().info(
        `${msg} ${field}:\n ${resolvedKey} \n loaded from: "${parentTitle}", field: "${parentField}"\n ${parentUrl}`
      )
      this.getLogger().error(error)
      $tw.utils.alert(
        name,
        alertFailed`${msg}: ${resolvedKey}">${field}</a>, loaded from: ${parentUrl}">${parentTitle}</a>, field: "${parentField}"`
      )
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.processTiddlers = function (parentKey, parentTitle) {
    var processed = 0
    var removed = 0
    var processedTitles = []
    for (var key of this.loaded.keys()) {
      const imported = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (processedTitles.indexOf(title) !== -1) {
          continue
        }
        const keys = []
        const tiddler = imported.get(title)
        var canonicalUri = tiddler._canonical_uri
        canonicalUri =
          canonicalUri === undefined ||
          canonicalUri == null ||
          canonicalUri.trim() === ''
            ? null
            : canonicalUri.trim()
        var importUri = tiddler._import_uri
        importUri =
          importUri === undefined ||
          importUri == null ||
          importUri.trim() === ''
            ? null
            : importUri.trim()
        if (this.hasTitle(key, title)) {
          keys.push(key)
        }
        if (canonicalUri !== null || importUri !== null) {
          if (canonicalUri == null && importUri !== null) {
            // Inconsistency
          }
          var canonicalKey = null
          if (
            canonicalUri !== null &&
            this.notResolved.indexOf(canonicalUri) === -1
          ) {
            canonicalKey = this.resolved.get(canonicalUri)
          }
          if (
            canonicalKey !== null &&
            this.notLoaded.indexOf(canonicalKey) === -1 &&
            this.hasTitle(canonicalKey, title)
          ) {
            if (key === canonicalKey) {
              // Cycle
            }
            keys.push(canonicalKey)
          }
          var importKey = null
          if (
            importUri !== null &&
            this.notResolved.indexOf(importUri) === -1
          ) {
            importKey = this.resolved.get(importUri)
          }
          if (
            canonicalKey !== null &&
            importKey !== null &&
            canonicalKey === importKey
          ) {
            // Inconsistency
          } else {
            if (
              importKey !== null &&
              this.notLoaded.indexOf(importKey) === -1 &&
              this.hasTitle(importKey, title)
            ) {
              if (key === importKey) {
                // Cycle
              } else {
                this.processTiddler(keys, key, title, canonicalKey, importKey)
              }
            }
          }
        }
        processed += keys.length
        removed += this.removeTitles(keys, title)
        processedTitles.push(title)
      }
    }
    return {
      processed: processed,
      removed: removed
    }
  }

  IpfsImport.prototype.processTiddler = function (
    keys,
    parentKey,
    title,
    canonicalKey,
    importKey
  ) {
    keys.push(importKey)
    const imported = this.loaded.get(importKey)
    const tiddler = imported.get(title)
    var targetCanonicalUri = tiddler._canonical_uri
    targetCanonicalUri =
      targetCanonicalUri == null ||
      targetCanonicalUri === undefined ||
      targetCanonicalUri.trim() === ''
        ? null
        : targetCanonicalUri.trim()
    var targetCanonicalKey = null
    if (
      targetCanonicalUri !== null &&
      this.notResolved.indexOf(targetCanonicalUri) === -1
    ) {
      targetCanonicalKey = this.resolved.get(targetCanonicalUri)
    }
    var nextImportUri = tiddler._import_uri
    nextImportUri =
      nextImportUri == null ||
      nextImportUri === undefined ||
      nextImportUri.trim() === ''
        ? null
        : nextImportUri.trim()
    if (
      canonicalKey !== null &&
      targetCanonicalKey !== null &&
      canonicalKey !== targetCanonicalKey
    ) {
      // Inconsistency
    }
    if (targetCanonicalUri == null && nextImportUri !== null) {
      // Inconsistency
    }
    var nextImportKey = null
    if (
      nextImportUri !== null &&
      this.notResolved.indexOf(nextImportUri) === -1
    ) {
      nextImportKey = this.resolved.get(nextImportUri)
    }
    if (
      targetCanonicalKey !== null &&
      nextImportKey !== null &&
      targetCanonicalKey === nextImportKey
    ) {
      // Inconsistency
    } else {
      if (
        nextImportKey !== null &&
        this.notLoaded.indexOf(nextImportKey) === -1 &&
        this.hasTitle(nextImportKey, title)
      ) {
        if (keys.indexOf(nextImportKey) !== -1) {
          // Cycle
        } else {
          this.processTiddler(
            keys,
            importKey,
            title,
            targetCanonicalKey,
            nextImportKey
          )
        }
      }
    }
  }

  IpfsImport.prototype.loadRemoteImportedTiddlers = async function (
    importUri,
    canonicalUri,
    title
  ) {
    var added = 0
    var key = null
    var importedTiddlers = null
    var normalizedUrl = null
    var updated = 0
    var url = null
    // Load Imported
    if (importUri !== undefined && importUri !== null) {
      url = importUri
      var {
        importedTiddlers,
        key,
        normalizedUrl
      } = await this.getImportedTiddlers('_import_uri', title, url)
      // Fallback
      if (importedTiddlers == null) {
        url = canonicalUri
        if (url !== undefined && url !== null) {
          var {
            importedTiddlers,
            key,
            normalizedUrl
          } = await this.getImportedTiddlers('_canonical_uri', title, url)
        }
      }
    } else if (canonicalUri !== undefined && canonicalUri !== null) {
      url = canonicalUri
      var {
        importedTiddlers,
        key,
        normalizedUrl
      } = await this.getImportedTiddlers('_canonical_uri', title, url)
    }
    // Process Imported
    if (importedTiddlers !== null) {
      var { added, updated } = await this.processLoadedImportedTiddlers(
        importedTiddlers,
        key,
        url,
        normalizedUrl
      )
    }
    return {
      added: added,
      updated: updated
    }
  }

  IpfsImport.prototype.processImportedTiddlers = async function (
    importedTiddlers,
    key,
    importedUrl,
    importedNormalizedUrl
  ) {
    var importedAdded = 0
    var importedUpdated = 0
    // Process new and existing
    for (var [
      importedTitle,
      importedTiddler
    ] of this.importedTiddlers.entries()) {
      var merged = null
      var currentTiddler = null
      var importedTags =
        importedTiddler.tags !== undefined ? importedTiddler.tags : ''
      // Type
      var type = importedTiddler.type
      // Default
      if (type === undefined || type == null) {
        type = 'text/vnd.tiddlywiki'
      }
      // Content-Type
      var info = $tw.config.contentTypeInfo[type]
      // Check
      if (info === undefined || info == null) {
        $tw.utils.alert(
          name,
          "Unknown Content-Type: '" +
            type +
            "', default to: 'text/vnd.tiddlywiki', <a rel='noopener noreferrer' target='_blank' href='" +
            importedNormalizedUrl +
            "'>" +
            importedTitle +
            '</a>'
        )
        // Default
        type = 'text/vnd.tiddlywiki'
        info = $tw.config.contentTypeInfo[type]
      }
      // Load until we reach the leaf
      if (info.encoding !== 'base64' && type !== 'image/svg+xml') {
        var uri = importedTiddler._import_uri
        if (uri === undefined || uri == null) {
          uri = importedTiddler._canonical_uri
        }
        if (uri !== undefined && uri !== null) {
          try {
            var { added, updated } = await this.loadRemoteImportedTiddlers(
              importedTiddler._import_uri,
              importedTiddler._canonical_uri,
              importedTitle
            )
            importedAdded += added
            importedUpdated += updated
          } catch (error) {
            if (error.name !== undefined && error.name === 'CircularImport') {
              $tw.utils.alert(name, error.message)
              break
            }
            throw error
          }
        }
      }
      // Imported root
      if (this.host !== null && this.root == null) {
        this.root = importedTitle
      }
      // Retrieve target host Tiddler
      if (this.host !== null && this.host.fields.title === importedTitle) {
        currentTiddler = this.host
      } else {
        currentTiddler = $tw.wiki.getTiddler(importedTitle)
      }
      // Retrieve or prepare merged content
      merged = this.processedImported.get(importedTitle)
      if (merged === undefined) {
        merged = {}
        this.processedImported.set(importedTitle, merged)
      }
      // Fields
      for (var field in importedTiddler) {
        // Discard
        if (field === 'tags') {
          continue
        }
        // Unknown from leaf to top, we keep the top modified field
        if (
          merged[field] === undefined ||
          merged[field] == null ||
          field === 'modified'
        ) {
          merged[field] = importedTiddler[field]
        }
        if (field === 'type') {
          merged[field] = type
        }
      }
      // Tags,
      // We use the target tiddler to manage complex tags like [[IPFS Documentation]]
      if (currentTiddler !== undefined && currentTiddler !== null) {
        var tags = (currentTiddler.fields.tags || []).slice(0)
        for (var i = 0; i < tags.length; i++) {
          var tag = tags[i]
          if (importedTags.includes(tag) === false) {
            importedTags = importedTags + ' ' + tag
          }
        }
      }
      // IPFS tag
      if ($tw.ipfs.isCid(key) && importedTags.includes('$:/isIpfs') === false) {
        importedTags = importedTags + ' $:/isIpfs'
      }
      // Imported tag
      if (importedTags.includes('$:/isImported') === false) {
        importedTags = importedTags + ' $:/isImported'
      }
      // Processed tags
      merged.tags = importedTags
      // URI
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        merged._import_uri = importedUrl
      } else {
        var canonicalUri = merged._canonical_uri
        if (canonicalUri === undefined || canonicalUri == null) {
          merged._canonical_uri = importedUrl
          // import_uri
        } else if (canonicalUri !== importedUrl) {
          merged._import_uri = importedUrl
        }
      }
      // Count
      if (currentTiddler !== undefined && currentTiddler !== null) {
        importedUpdated += 1
      } else {
        importedAdded += 1
      }
      // Processed Titles
      var titles = this.processedTitles.get(importedTitle)
      if (titles === undefined) {
        titles = []
        this.processedTitles.set(importedTitle, titles)
      }
      if (key !== null) {
        if (titles.indexOf(key) === -1) {
          titles.push(key)
        }
      } else {
        if (titles.indexOf(importedNormalizedUrl) === -1) {
          titles.push(importedNormalizedUrl)
        }
      }
    }
    return {
      added: importedAdded,
      updated: importedUpdated
    }
  }
  exports.IpfsImport = IpfsImport
})()
