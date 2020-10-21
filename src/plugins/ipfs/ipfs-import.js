/*\
title: $:/plugins/ipfs/ipfs-import.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Import

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const name = 'ipfs-import'

  const tiddlyWikiType = 'text/vnd.tiddlywiki'

  const local = '<a href="'
  const remote =
    '<a class="tc-tiddlylink-external" rel="noopener noreferrer" target="_blank" href="'

  const alertFailed = function (
    strings,
    msg,
    key,
    field,
    parentField,
    parentUrl,
    parentTitle
  ) {
    var space = strings[1]
    var endH1 = strings[2]
    var endL1 = strings[3]
    var from = strings[4]
    var endH2 = strings[5]
    var endL2 = strings[6]
    if (
      parentUrl.hostname === $tw.ipfs.getIpfsBaseUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getIpfsBaseUrl().pathname
    ) {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${parentField}${from}${local}${parentUrl}${endH2}${parentTitle}${endL2}`
    } else {
      return `${msg}${space}${remote}${key}${endH1}${field}${endL1}${parentField}${from}${remote}${parentUrl}${endH2}${parentTitle}${endL2}`
    }
  }

  const alertFieldFailed = function (strings, msg, field, url, title) {
    var failed = strings[1]
    var from = strings[2]
    var endH = strings[3]
    var endL = strings[4]
    if (
      url.hostname === $tw.ipfs.getIpfsBaseUrl().hostname &&
      url.pathname === $tw.ipfs.getIpfsBaseUrl().pathname
    ) {
      return `${msg}${failed}${field}${from}${local}${url}${endH}${title}${endL}`
    } else {
      return `${msg}${failed}${field}${from}${remote}${url}${endH}${title}${endL}`
    }
  }

  const alertConditionFailed = function (
    strings,
    msg,
    condition,
    key,
    title,
    parentUrl
  ) {
    var space = strings[1]
    var from = strings[2]
    var endH1 = strings[3]
    var endL1 = strings[4]
    var endH2 = strings[5]
    var endL2 = strings[6]
    if (
      parentUrl.hostname === $tw.ipfs.getIpfsBaseUrl().hostname &&
      parentUrl.pathname === $tw.ipfs.getIpfsBaseUrl().pathname
    ) {
      return `${msg}${space}${condition}${from}${remote}${key}${endH1}${title}${endL1}${local}${parentUrl}${endH2}${title}${endL2}`
    } else {
      return `${msg}${space}${condition}${from}${remote}${key}${endH1}${title}${endL1}${remote}${parentUrl}${endH2}${title}${endL2}`
    }
  }

  var IpfsImport = function () {}

  IpfsImport.prototype.removeTiddlers = function (keys, title) {
    var removed = 0
    for (var key of this.loaded.keys()) {
      if (keys.indexOf(key) !== -1) {
        continue
      }
      const { imported, resolvedKey } = this.loaded.get(key)
      if (imported.delete(title)) {
        const msg = 'Remove:'
        const field = ''
        $tw.ipfs.getLogger().info(
          `${msg} ${field}"${title}"
 ${resolvedKey}`
        )
        $tw.utils.alert(
          name,
          alertFieldFailed`${msg} ${field}${resolvedKey}">${title}</a>`
        )
        removed += 1
      }
    }
    return removed
  }

  IpfsImport.prototype.getKey = async function (value, base) {
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
      return {
        key: null,
        isIpfs: false,
        resolvedUrl: null
      }
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
      key = `ipfs://${cid}`
    } else if (ipnsKey !== null) {
      key = `ipns://${ipnsKey}`
    } else if (
      normalizedUrl.hostname.endsWith('.eth') ||
      normalizedUrl.hostname.endsWith('.eth.link')
    ) {
      key = normalizedUrl.hostname
    } else {
      key = normalizedUrl.toString()
    }
    return {
      key: key,
      resolvedUrl: resolvedUrl
    }
  }

  IpfsImport.prototype.isIpfs = async function (key) {
    key =
      key === undefined || key == null || key.trim() === '' ? null : key.trim()
    if (key == null) {
      return false
    }
    const { cid, ipnsIdentifier, protocol } = $tw.ipfs.decodeCid(key)
    if (
      key.endsWith('.eth') ||
      key.endsWith('.eth.link') ||
      (protocol !== null && (cid !== null || ipnsIdentifier !== null))
    ) {
      return true
    }
    return false
  }

  IpfsImport.prototype.import = async function (
    canonicalUri,
    importUri,
    tiddler
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
    var password = tiddler.fields._password
    password =
      password === undefined || password == null || password.trim() === ''
        ? null
        : password.trim()
    const { type } = $tw.utils.getContentType(
      tiddler.fields.title,
      tiddler.fields.type
    )
    this.loaded = new Map()
    this.notLoaded = []
    this.isEmpty = []
    this.resolved = new Map()
    this.notResolved = []
    this.merged = new Map()
    try {
      // Load and prepare imported tiddlers to be processed
      const host = $tw.ipfs.getUrl(
        `#${tiddler.fields.title}`,
        $tw.ipfs.getDocumentUrl()
      )
      if (canonicalUri !== null || importUri !== null) {
        if (importUri !== null) {
          var { key: importUri } = await this.getKey(importUri, host)
          await this.load(
            host,
            tiddler.fields.title,
            '_import_uri',
            importUri,
            password,
            true
          )
        }
        if (canonicalUri !== null) {
          var { key: canonicalUri } = await this.getKey(canonicalUri, host)
          await this.load(
            host,
            tiddler.fields.title,
            '_canonical_uri',
            canonicalUri,
            password,
            tiddlyWikiType === type
          )
        }
        // Process
        this.processImported()
        // Import
        var rootUri = importUri !== null ? importUri : canonicalUri
        this.importTiddlers(rootUri)
        // Deleted
        var deleted = null
        var deletedFilter = ''
        var titles = $tw.wiki.getTiddlers({ includeSystem: true })
        for (var i = 0; i < titles.length; i++) {
          const current = $tw.wiki.getTiddler(titles[i])
          var { key } = await this.getKey(
            current.getFieldString('_canonical_uri'),
            rootUri
          )
          if (
            key === rootUri &&
            this.merged.get(current.fields.title) === undefined &&
            deletedFilter.includes(`[[${current.fields.title}]]`) === false
          ) {
            deletedFilter = `${deletedFilter} [[${current.fields.title}]]`
          }
          var { key } = await this.getKey(
            current.getFieldString('_import_uri'),
            rootUri
          )
          if (
            key === rootUri &&
            this.merged.get(current).fields.title === undefined &&
            deletedFilter.includes(`[[${current.fields.title}]]`) === false
          ) {
            deletedFilter = `${deletedFilter} [[${current.fields.title}]]`
          }
        }
        if (deletedFilter.trim() !== '') {
          const contentType = 'text/raw'
          const options = {
            downloadType: contentType,
            method: 'download',
            template: '$:/core/templates/exporters/JsonFile',
            variables: {
              exportFilter: deletedFilter
            }
          }
          deleted = $tw.wiki.renderTiddler(
            contentType,
            '$:/core/templates/exporters/JsonFile',
            options
          )
          deleted = JSON.parse(deleted)
        }
        return {
          merged: this.merged,
          deleted: deleted,
          loaded: this.loaded,
          isEmpty: this.isEmpty,
          notLoaded: this.notLoaded,
          notResolved: this.notResolved
        }
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    this.loaded = null
    this.isEmpty = null
    this.notLoaded = null
    this.resolved = null
    this.notResolved = null
    this.merged = null
  }

  IpfsImport.prototype.load = async function (
    parentUrl,
    parentTitle,
    field,
    url,
    password,
    load
  ) {
    var loaded = 0
    var removed = 0
    var key = null
    var resolvedUrl = null
    if (
      url !== null &&
      this.notResolved.indexOf(url) === -1 &&
      this.resolved.get(url) === undefined
    ) {
      try {
        var { key, resolvedUrl } = await this.getKey(url, parentUrl)
        this.resolved.set(url, key)
      } catch (error) {
        const msg = 'Failed to Resolve:'
        this.notResolved.push(url)
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(
          name,
          alertFieldFailed`${msg} "${field}" from ${parentUrl}">${parentTitle}</a>`
        )
      }
    }
    if (
      load &&
      key !== null &&
      resolvedUrl !== null &&
      this.notLoaded.indexOf(key) === -1 &&
      this.loaded.get(key) === undefined
    ) {
      const {
        loaded: loadedAdded,
        removed: loadedRemoved
      } = await this.loadResource(
        parentUrl,
        parentTitle,
        field,
        url,
        key,
        resolvedUrl,
        password
      )
      loaded = loadedAdded
      removed = loadedRemoved
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.performImport = function (
    toBeAdded,
    toBeUpdated,
    toBeDeleted
  ) {
    // New and Updated
    for (var [title, merged] of this.merged.entries()) {
      if (toBeAdded.indexOf(title) || toBeUpdated.indexOf(title) !== -1) {
        $tw.wiki.addTiddler(merged)
      }
    }
    // Deleted
    for (var i = 0; i < toBeDeleted.length; i++) {
      $tw.wiki.deleteTiddler(toBeDeleted[i])
    }
  }

  IpfsImport.prototype.loadResource = async function (
    parentUrl,
    parentTitle,
    parentField,
    url,
    key,
    resolvedKey,
    password
  ) {
    var loaded = 0
    var removed = 0
    var content = null
    var imported = new Map()
    var tiddlers = null
    try {
      // Load
      content = await $tw.ipfs.loadToUtf8(resolvedKey, password)
      if ($tw.ipfs.isJson(content)) {
        tiddlers = $tw.wiki.deserializeTiddlers(
          '.json',
          content,
          $tw.wiki.getCreationFields()
        )
      } else {
        tiddlers = $tw.wiki.deserializeTiddlers(
          '.tid',
          content,
          $tw.wiki.getCreationFields()
        )
      }
      // Loaded
      if (tiddlers !== undefined && tiddlers !== null) {
        this.loaded.set(key, {
          imported: imported,
          resolvedKey: resolvedKey,
          url: url
        })
        for (var i in tiddlers) {
          const tiddler = tiddlers[i]
          var title = tiddler.title
          if (title === undefined || title == null || title.trim() === '') {
            const msg = 'Ignore Unknown:'
            const field = 'Title'
            $tw.ipfs.getLogger().info(
              `${msg} "${field}"
 ${resolvedKey}
 from "${parentField}", "${parentTitle}"
 ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertFailed`${msg} ${resolvedKey}">${field}</a>, from "${parentField}", ${parentUrl}">${parentTitle}</a>`
            )
            removed += 1
            continue
          }
          if (imported.get(title) !== undefined) {
            const msg = 'Ignore Duplicate:'
            $tw.ipfs.getLogger().info(
              `${msg} "${title}"
 ${resolvedKey}
 from "${parentField}", "${parentTitle}"
 ${parentUrl}`
            )
            $tw.utils.alert(
              name,
              alertFailed`${msg} ${resolvedKey}">${title}</a>, from "${parentField}", ${parentUrl}">${parentTitle}</a>`
            )
            removed += 1
            continue
          }
          var type = tiddler.type
          if (type === undefined || type == null) {
            type = tiddlyWikiType
          }
          var info = $tw.config.contentTypeInfo[type]
          if (info === undefined || info == null) {
            const msg = 'Unknown:'
            const field = 'Content-Type'
            $tw.ipfs.getLogger().info(
              `${msg} "${field}": "${title}"
 ${resolvedKey}`
            )
            $tw.utils.alert(
              name,
              alertFieldFailed`${msg} "${field}": ${resolvedKey}">${title}</a>`
            )
            // Default
            type = tiddlyWikiType
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
          tiddler._canonical_uri = canonicalUri
          var importUri = tiddler._import_uri
          importUri =
            importUri === undefined ||
            importUri == null ||
            importUri.trim() === ''
              ? null
              : importUri.trim()
          tiddler._import_uri = importUri
          if (canonicalUri !== null || importUri !== null) {
            password = tiddler._password
            password =
              password === undefined ||
              password == null ||
              password.trim() === ''
                ? null
                : password.trim()
            if (importUri !== null) {
              const {
                loaded: loadedAdded,
                removed: loadedRemoved
              } = await this.load(
                resolvedKey,
                title,
                '_import_uri',
                importUri,
                password,
                true
              )
              loaded += loadedAdded
              removed += loadedRemoved
            }
            if (canonicalUri !== null) {
              const {
                loaded: loadedAdded,
                removed: loadedRemoved
              } = await this.load(
                resolvedKey,
                title,
                'canonical_uri',
                canonicalUri,
                password,
                tiddlyWikiType === tiddler.type
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
        const msg = 'Empty:'
        const field = 'Resource'
        $tw.ipfs.getLogger().info(
          `${msg} "${field}"
 ${resolvedKey}
 from "${parentField}", "${parentTitle}"
 ${parentUrl}`
        )
        $tw.utils.alert(
          name,
          alertFailed`${msg} ${resolvedKey}">${field}</a> from "${parentField}", ${parentUrl}">${parentTitle}</a>`
        )
      }
    } catch (error) {
      this.notLoaded.push(key)
      const msg = 'Failed to Load:'
      const field = 'Resource'
      $tw.ipfs.getLogger().info(
        `${msg} "${field}"
 ${resolvedKey}
 from "${parentField}", "${parentTitle}"
 ${parentUrl}`
      )
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(
        name,
        alertFailed`${msg} ${resolvedKey}">${field}</a> from "${parentField}", ${parentUrl}">${parentTitle}</a>`
      )
    }
    return {
      loaded: loaded,
      removed: removed
    }
  }

  IpfsImport.prototype.processImported = function () {
    var processed = 0
    var removed = 0
    var processedTitles = []
    for (var key of this.loaded.keys()) {
      const { imported, resolvedKey } = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (processedTitles.indexOf(title) !== -1) {
          continue
        }
        const keys = []
        const tiddler = imported.get(title)
        var type = tiddler.type
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
        if (canonicalUri == null && importUri == null) {
          keys.push(key)
        } else if (canonicalUri == null && importUri !== null) {
          const msg = 'Missing:'
          const field = '_canonical_uri'
          $tw.ipfs.getLogger().info(
            `${msg} "${field}" from ${title}"
 ${resolvedKey}`
          )
          $tw.utils.alert(
            name,
            alertFieldFailed`${msg} "${field}" from ${resolvedKey}">${title}</a>`
          )
        } else {
          var canonicalKey = null
          if (
            canonicalUri !== null &&
            this.notResolved.indexOf(canonicalUri) === -1
          ) {
            canonicalKey = this.resolved.get(canonicalUri)
          }
          if (canonicalKey !== undefined && canonicalKey !== null) {
            if (key === canonicalKey) {
              const msg = 'Cycle:'
              const field = '_canonical_uri'
              $tw.ipfs.getLogger().info(
                `${msg} "${field}" from ${title}"
 ${resolvedKey}`
              )
              $tw.utils.alert(
                name,
                alertFieldFailed`${msg} "${field}" from ${resolvedKey}">${title}</a>`
              )
            } else if (
              this.processCanonicalKey(
                keys,
                resolvedKey,
                title,
                canonicalKey,
                type
              )
            ) {
              var importKey = null
              if (
                importUri !== null &&
                this.notResolved.indexOf(importUri) === -1
              ) {
                importKey = this.resolved.get(importUri)
              }
              if (importKey === undefined || importKey == null) {
                keys.push(key)
              } else {
                if (canonicalKey === importKey) {
                  const msg = 'Matching:'
                  const field = '"_canonical_uri" and "_import_uri"'
                  $tw.ipfs.getLogger().info(
                    `${msg} ${field} from "${title}"
 ${resolvedKey}`
                  )
                  $tw.utils.alert(
                    name,
                    alertFieldFailed`${msg} ${field} from ${resolvedKey}">${title}</a>`
                  )
                } else if (key === importKey) {
                  const msg = 'Cycle:'
                  const field = '_import_uri'
                  $tw.ipfs.getLogger().info(
                    `${msg} "${field}" from "${title}"
 ${resolvedKey}`
                  )
                  $tw.utils.alert(
                    name,
                    alertFieldFailed`${msg} "${field}" from ${resolvedKey}">${title}</a>`
                  )
                } else {
                  keys.push(key)
                  this.processImportKey(
                    keys,
                    resolvedKey,
                    title,
                    canonicalKey,
                    importKey
                  )
                }
              }
            }
          }
        }
        processed += keys.length
        removed += this.removeTiddlers(keys, title)
        processedTitles.push(title)
      }
    }
    return {
      processed: processed,
      removed: removed
    }
  }

  IpfsImport.prototype.processCanonicalKey = function (
    keys,
    parentResolvedKey,
    title,
    canonicalKey,
    type
  ) {
    if (tiddlyWikiType !== type) {
      keys.push(canonicalKey)
      return true
    }
    if (this.notLoaded.indexOf(canonicalKey) !== -1) {
      return false
    }
    if (this.loaded.get(canonicalKey) === undefined) {
      return false
    }
    const { imported, resolvedKey } = this.loaded.get(canonicalKey)
    if (imported === undefined) {
      return false
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return false
    }
    var canonicalUri = tiddler._canonical_uri
    canonicalUri =
      canonicalUri == null ||
      canonicalUri === undefined ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    if (canonicalUri !== null) {
      const msg = 'Inconsistency:'
      const field = '_canonical_uri'
      $tw.ipfs.getLogger().info(
        `${msg} "${field}" from "${title}"
 ${resolvedKey}
 and ${parentResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertConditionFailed`${msg} "${field}" from ${resolvedKey}">${title}</a> and ${parentResolvedKey}">${title}</a>`
      )
      return false
    }
    var importUri = tiddler._import_uri
    importUri =
      importUri == null || importUri === undefined || importUri.trim() === ''
        ? null
        : importUri.trim()
    if (importUri !== null) {
      const msg = 'Inconsistency:'
      const field = '_import_uri'
      $tw.ipfs.getLogger().info(
        `${msg} "${field}" from "${title}"
 ${resolvedKey}
 and ${parentResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertConditionFailed`${msg} "${field}" from ${resolvedKey}">${title}</a> and ${parentResolvedKey}">${title}</a>`
      )
      return false
    }
    keys.push(canonicalKey)
    return true
  }

  IpfsImport.prototype.processImportKey = function (
    keys,
    parentResolvedKey,
    title,
    canonicalKey,
    importKey
  ) {
    if (this.notLoaded.indexOf(importKey) !== -1) {
      return
    }
    if (this.loaded.get(importKey) === undefined) {
      return
    }
    const { imported, resolvedKey: importResolvedKey } = this.loaded.get(
      importKey
    )
    if (imported === undefined) {
      return
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return
    }
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
    if (
      targetCanonicalKey !== undefined &&
      targetCanonicalKey !== null &&
      canonicalKey !== targetCanonicalKey
    ) {
      const msg = 'Inconsistency:'
      const field = '_canonical_uri'
      $tw.ipfs.getLogger().info(
        `${msg} "${field}" from "${title}"
 ${importResolvedKey}
 and ${parentResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertConditionFailed`${msg} "${field}" from ${importResolvedKey}">${title}</a> and ${parentResolvedKey}">${title}</a>`
      )
      return
    }
    var nextImportUri = tiddler._import_uri
    nextImportUri =
      nextImportUri == null ||
      nextImportUri === undefined ||
      nextImportUri.trim() === ''
        ? null
        : nextImportUri.trim()
    if (targetCanonicalUri == null && nextImportUri !== null) {
      const msg = 'Missing:'
      const field = '_canonical_uri'
      $tw.ipfs.getLogger().info(
        `${msg} "${field}" from "${title}"
 ${importResolvedKey}`
      )
      $tw.utils.alert(
        name,
        alertFieldFailed`${msg} "${field}" from ${importResolvedKey}">${title}</a>`
      )
      return
    }
    if (nextImportUri == null) {
      keys.push(importKey)
    } else {
      var nextImportKey = null
      if (
        nextImportUri !== null &&
        this.notResolved.indexOf(nextImportUri) === -1
      ) {
        nextImportKey = this.resolved.get(nextImportUri)
      }
      if (nextImportKey !== undefined && nextImportKey !== null) {
        if (canonicalKey === nextImportKey) {
          const msg = 'Matching:'
          const field = '"_canonical_uri" and "_import_uri"'
          $tw.ipfs.getLogger().info(
            `${msg} ${field} from "${title}"
 ${importResolvedKey}`
          )
          $tw.utils.alert(
            name,
            alertFieldFailed`${msg} ${field} from ${importResolvedKey}">${title}</a>`
          )
        } else if (keys.indexOf(nextImportKey) !== -1) {
          const msg = 'Cycle:'
          const field = '_import_uri'
          $tw.ipfs.getLogger().info(
            `${msg} "${field}" from "${title}"
 ${importResolvedKey}`
          )
          $tw.utils.alert(
            name,
            alertFieldFailed`${msg} "${field}" from ${importResolvedKey}">${title}</a>`
          )
        } else {
          keys.push(importKey)
          this.processImportKey(
            keys,
            importResolvedKey,
            title,
            canonicalKey,
            nextImportKey
          )
        }
      }
    }
  }

  IpfsImport.prototype.importTiddlers = function (rootUri) {
    var processedTitles = []
    for (var key of this.loaded.keys()) {
      const { imported, url } = this.loaded.get(key)
      for (var title of imported.keys()) {
        if (processedTitles.indexOf(title) !== -1) {
          continue
        }
        const tiddler = imported.get(title)
        var type = tiddler.type
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
        var processed
        if (importUri !== null) {
          processed = this.importTiddler(title, importUri)
        }
        if (!processed && canonicalUri !== null && tiddlyWikiType === type) {
          this.importTiddler(title, canonicalUri)
        }
        if (this.mergeTiddler(title, url)) {
          const merged = this.merged.get(title)
          var type = merged.type
          if (tiddlyWikiType !== type) {
            merged._import_uri = rootUri
          } else {
            var canonicalUri = merged._canonical_uri
            if (canonicalUri === undefined || canonicalUri == null) {
              if (url !== rootUri) {
                merged._canonical_uri = this.resolved.get(url)
                merged._import_uri = rootUri
              } else {
                merged._canonical_uri = rootUri
              }
            } else {
              merged._canonical_uri = this.resolved.get(canonicalUri)
              if (canonicalUri !== rootUri) {
                merged._import_uri = rootUri
              }
            }
          }
        }
        processedTitles.push(title)
      }
    }
  }

  IpfsImport.prototype.importTiddler = function (title, uri) {
    const key = this.resolved.get(uri)
    if (key === undefined) {
      return false
    }
    if (this.loaded.get(key) === undefined) {
      return false
    }
    const { imported } = this.loaded.get(key)
    if (imported === undefined) {
      return false
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return false
    }
    var type = tiddler.type
    var importUri = tiddler._import_uri
    importUri =
      importUri == null || importUri === undefined || importUri.trim() === ''
        ? null
        : importUri.trim()
    var canonicalUri = tiddler._canonical_uri
    canonicalUri =
      canonicalUri == null ||
      canonicalUri === undefined ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    var processed
    if (importUri !== null) {
      processed = this.importTiddler(title, importUri)
    }
    if (!processed && canonicalUri !== null && tiddlyWikiType === type) {
      this.importTiddler(title, canonicalUri)
    }
    return this.mergeTiddler(title, uri)
  }

  IpfsImport.prototype.mergeTiddler = function (title, uri) {
    const key = this.resolved.get(uri)
    if (key === undefined) {
      return false
    }
    if (this.loaded.get(key) === undefined) {
      return false
    }
    const { imported } = this.loaded.get(key)
    if (imported === undefined) {
      return false
    }
    const tiddler = imported.get(title)
    if (tiddler === undefined) {
      return false
    }
    // Retrieve target host Tiddler
    var currentTiddler = $tw.wiki.getTiddler(title)
    // Retrieve or prepare merged content
    var merged = this.merged.get(title)
    if (merged === undefined) {
      merged = {}
      this.merged.set(title, merged)
    }
    // Tags
    var tags = tiddler.tags !== undefined ? tiddler.tags : ''
    // Fields
    var hasModified = false
    for (var field in tiddler) {
      // Discard
      if (field === 'tags') {
        continue
      }
      if (field === 'modified') {
        hasModified = true
      }
      // Unknown from leaf to top, we keep the top modified field
      if (
        merged[field] === undefined ||
        merged[field] == null ||
        field === '_canonical_uri' ||
        field === '_import_uri' ||
        field === 'modified'
      ) {
        merged[field] = tiddler[field]
      }
    }
    if (hasModified === false) {
      merged.modified = new Date()
    }
    // Merge current Tiddler Tags
    if (currentTiddler !== undefined && currentTiddler !== null) {
      const currentTags = (currentTiddler.fields.tags || []).slice(0)
      for (var i = 0; i < currentTags.length; i++) {
        const currentTag = currentTags[i]
        if (tags.includes(currentTag) === false) {
          tags = `${tags} [[${currentTag}]]`
        }
      }
    }
    // Merge Tags
    if (merged.tags !== undefined && merged.tags !== null) {
      const mergedTags = $tw.utils.parseStringArray(merged.tags, false)
      for (var i = 0; i < mergedTags.length; i++) {
        const mergedTag = mergedTags[i]
        if (tags.includes(mergedTag) === false) {
          tags = `${tags} [[${mergedTag}]]`
        }
      }
    }
    // IPFS tag
    if (this.isIpfs(key) && tags.includes('$:/isIpfs') === false) {
      tags = `${tags} $:/isIpfs`
    }
    // Imported tag
    if (tags.includes('$:/isImported') === false) {
      tags = `${tags} $:/isImported`
    }
    // Processed tags
    merged.tags = tags
    // Processed
    return true
  }

  exports.IpfsImport = IpfsImport
})()
