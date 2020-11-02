/*\
title: $:/plugins/ipfs/ipfs-tiddler.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Tiddler

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const IpfsImport = require('$:/plugins/ipfs/ipfs-import.js').IpfsImport

  const name = 'ipfs-tiddler'

  /*
   * https://tiddlywiki.com/#TiddlerFields
   * $:/core/modules/server/routes/get-tiddler.js
   * TODO: expose it as Tiddler ??
   */
  const reservedFields = [
    'bag',
    'caption',
    'class',
    'color',
    'description',
    'created',
    'creator',
    'fields',
    'footer',
    'hide-body',
    'icon',
    '_is_skinny',
    'library',
    'list',
    'list-after',
    'list-before',
    'modified',
    'modifier',
    'name',
    'plugin-priority',
    'plugin-type',
    'permissions',
    'recipe',
    'revision',
    // "source",
    'subtitle',
    'tags',
    'text',
    // "url",
    'throttle.refresh',
    'toc-link',
    'title',
    'type'
  ]

  var IpfsTiddler = function () {
    this.once = false
  }

  IpfsTiddler.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    // Wiki
    $tw.wiki.addEventListener('change', function (changes) {
      return self.handleChangeEvent(changes)
    })
    // Hook
    $tw.hooks.addHook('th-deleting-tiddler', async function (tiddler) {
      return await self.handleDeleteTiddler(tiddler)
    })
    $tw.hooks.addHook('th-importing-tiddler', async function (tiddler) {
      return await self.handleFileImport(tiddler)
    })
    $tw.hooks.addHook('th-saving-tiddler', async function (tiddler) {
      return await self.handleSaveTiddler(tiddler)
    })
    // Widget
    $tw.rootWidget.addEventListener('tm-ipfs-pin', function (event) {
      return self.handleIpfsPin(event)
    })
    $tw.rootWidget.addEventListener('tm-refresh-tiddler', function (event) {
      return self.handleRefreshTiddler(event)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-unpin', function (event) {
      return self.handleIpfsUnpin(event)
    })
    // Init once
    this.once = true
  }

  IpfsTiddler.prototype.handleChangeEvent = function (changes) {
    // Gateway preference
    const api = changes['$:/ipfs/saver/api']
    if (api !== undefined && api.modified) {
      $tw.ipfs.getLogger().info(`IPFS API: ${$tw.ipfs.getIpfsApiUrl()}`)
    }
    // Gateway preference
    const gateway = changes['$:/ipfs/saver/gateway']
    if (gateway !== undefined && gateway.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl()
      if ($tw.utils.getIpfsUrlPolicy() === 'gateway') {
        $tw.ipfs.getLogger().info(`Gateway Policy: ${base}`)
      }
    }
    // Policy preference
    const policy = changes['$:/ipfs/saver/policy']
    if (policy !== undefined && policy.modified) {
      const base = $tw.ipfs.getIpfsBaseUrl()
      if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
        $tw.ipfs.getLogger().info(`Origin Policy: ${base}`)
      } else {
        $tw.ipfs.getLogger().info(`Gateway Policy: ${base}`)
      }
    }
    // Unpin preference
    const unpin = changes['$:/ipfs/saver/unpin']
    if (unpin !== undefined && unpin.modified) {
      if ($tw.utils.getIpfsUnpin()) {
        $tw.ipfs.getLogger().info('Unpin previous IPFS content...')
      } else {
        $tw.ipfs.getLogger().info('Do not unpin previous IPFS content...')
      }
    }
    // Verbose preference
    const verbose = changes['$:/ipfs/saver/verbose']
    if (verbose !== undefined && verbose.modified) {
      if (window.log !== undefined && window.log !== null) {
        if ($tw.utils.getIpfsVerbose()) {
          window.log.setLevel('info', false)
        } else {
          window.log.setLevel('warn', false)
        }
      }
    }
  }

  IpfsTiddler.prototype.handleIpfsPin = function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined) {
      return false
    }
    if (event.param !== undefined && event.param !== null) {
      // Tiddler
      for (var field in tiddler.fields) {
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        var value = tiddler.getFieldString(field)
        value =
          value === undefined || value == null || value.trim() === ''
            ? null
            : value.trim()
        if (value !== null) {
          this.ipfsPin(value, field)
        }
      }
      return true
    }
    // Wiki
    this.ipfsPin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsPin = function (value, field) {
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then(data => {
        const { cid, resolvedUrl } = data
        if (resolvedUrl !== null && cid !== null) {
          $tw.ipfs.getLogger().info(
            `Pinning: "${field}"
 ${resolvedUrl}`
          )
          $tw.ipfs
            .pinToIpfs(cid)
            .then(data => {
              if (data) {
                $tw.ipfs.removeFromPinUnpin(cid, resolvedUrl)
                $tw.utils.alert(
                  name,
                  `Successfully Pinned : <a class="tc-tiddlylink-external" rel="noopener noreferrer" target="_blank" href="${resolvedUrl}">${field}</a>`
                )
              }
            })
            .catch(error => {
              $tw.ipfs.getLogger().error(error)
              $tw.utils.alert(name, error.message)
            })
        }
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
  }

  IpfsTiddler.prototype.handleIpfsUnpin = async function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined) {
      return false
    }
    const { type, info } = $tw.utils.getContentType(title, tiddler.fields.type)
    if (event.param !== undefined && event.param !== null) {
      // Tiddler
      for (var field in tiddler.fields) {
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        var value = tiddler.getFieldString(field)
        value =
          value === undefined || value == null || value.trim() === ''
            ? null
            : value.trim()
        if (value !== null) {
          if (info.encoding !== 'base64' && type !== 'image/svg+xml') {
            if (field === '_canonical_uri' || field === '_import_uri') {
              continue
            }
          }
          this.ipfsUnpin(value, field)
        }
      }
      return true
    }
    // Wiki
    this.ipfsUnpin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsUnpin = function (value, field) {
    value =
      value === undefined || value == null || value.trim() === ''
        ? null
        : value.trim()
    if (value == null) {
      return
    }
    field =
      field === undefined || field == null || field.trim() === ''
        ? null
        : field.trim()
    if (field == null) {
      return
    }
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then(data => {
        const { cid, resolvedUrl } = data
        if (resolvedUrl !== null && cid !== null) {
          $tw.ipfs.getLogger().info(
            `Unpinning: "${field}
 ${resolvedUrl}`
          )
          if ($tw.utils.getIpfsUnpin()) {
            $tw.ipfs
              .unpinFromIpfs(cid)
              .then(data => {
                if (data !== undefined && data !== null) {
                  $tw.ipfs.removeFromPinUnpin(cid, resolvedUrl)
                  $tw.utils.alert(
                    name,
                    `Successfully Unpinned : <a rel="noopener noreferrer" target="_blank" href="${resolvedUrl}">${field}</a>`
                  )
                }
              })
              .catch(error => {
                $tw.ipfs.getLogger().error(error)
                $tw.utils.alert(name, error.message)
              })
          }
        }
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
  }

  IpfsTiddler.prototype.handleDeleteTiddler = async function (tiddler) {
    try {
      const { type, info } = $tw.utils.getContentType(
        tiddler.fields.title,
        tiddler.fields.type
      )
      // Process
      var field = null
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        field = '_canonical_uri'
      } else {
        field = '_export_uri'
      }
      // Value
      var url = null
      const value = tiddler.getFieldString(field)
      if (value !== undefined && value !== null && value !== '') {
        // URL or not
        try {
          url = $tw.ipfs.normalizeUrl(value)
        } catch (error) {
          // Ignore
        }
        // Process
        if (url !== undefined && url !== null) {
          const { cid } = $tw.ipfs.decodeCid(url)
          // Request to unpin
          if ($tw.utils.getIpfsUnpin() && cid !== null) {
            $tw.ipfs.requestToUnpin(cid)
          }
        }
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    return tiddler
  }

  IpfsTiddler.prototype.handleFileImport = async function (tiddler) {
    const updatedTiddler = await this.updateIpfsTags(tiddler)
    $tw.wiki.addTiddler(updatedTiddler)
    return updatedTiddler
  }

  IpfsTiddler.prototype.handleRefreshTiddler = function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined) {
      return false
    }
    var canonicalUri = tiddler.fields._canonical_uri
    canonicalUri =
      canonicalUri === undefined ||
      canonicalUri == null ||
      canonicalUri.trim() === ''
        ? null
        : canonicalUri.trim()
    var importUri = tiddler.fields._import_uri
    importUri =
      importUri === undefined || importUri == null || importUri.trim() === ''
        ? null
        : importUri.trim()
    // Reload
    if (canonicalUri !== null && importUri == null) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }]
      })
      $tw.wiki.addTiddler(updatedTiddler)
      return true
    }
    // Import
    if (canonicalUri !== null || importUri !== null) {
      var ipfsImport = new IpfsImport()
      ipfsImport
        .import(canonicalUri, importUri, tiddler)
        .then(data => {
          if (data) {
            const navigator = $tw.utils.locateNavigatorWidget(
              $tw.pageWidgetNode
            )
            if (navigator) {
              navigator.dispatchEvent({
                type: 'tm-ipfs-import-tiddlers',
                param: data
              })
            }
          }
        })
        .catch(error => {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(name, error.message)
        })
      return true
    }
    // Refresh
    $tw.wiki.clearCache(title)
    const changedTiddler = $tw.utils.getChangedTiddler(title)
    $tw.rootWidget.refresh(changedTiddler)
    return true
  }

  IpfsTiddler.prototype.handleSaveTiddler = async function (tiddler) {
    const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title)
    const { info } = $tw.utils.getContentType(
      tiddler.fields.title,
      tiddler.fields.type
    )
    var password = tiddler.fields._password
    password =
      password === undefined || password == null || password.trim() === ''
        ? null
        : password.trim()
    // Prepare
    var updatedTiddler = new $tw.Tiddler(tiddler)
    // Process deleted fields
    if (oldTiddler !== undefined && oldTiddler !== null) {
      for (var field in oldTiddler.fields) {
        // Not a reserved keyword
        if (reservedFields.indexOf(field) !== -1) {
          continue
        }
        // Updated
        const discard = tiddler.fields[field]
        if (
          discard !== undefined &&
          discard !== null &&
          tiddler.getFieldString(field) !== undefined
        ) {
          continue
        }
        // Process
        var oldCid = null
        var oldIpnsKey = null
        var oldNormalizedUrl = null
        var oldResolvedUrl = null
        var oldValue = oldTiddler.getFieldString(field)
        try {
          var {
            cid: oldCid,
            ipnsKey: oldIpnsKey,
            normalizedUrl: oldNormalizedUrl,
            resolvedUrl: oldResolvedUrl
          } = await $tw.ipfs.resolveUrl(false, true, oldValue)
        } catch (error) {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(name, error.message)
          return tiddler
        }
        oldResolvedUrl =
          oldResolvedUrl === undefined ||
          oldResolvedUrl == null ||
          oldResolvedUrl.toString().trim() === ''
            ? null
            : oldResolvedUrl.toString().trim()
        if (oldResolvedUrl !== null && field === '_canonical_uri') {
          var data = tiddler.fields.text
          try {
            if (info.encoding === 'base64') {
              data = await $tw.ipfs.loadToBase64(oldResolvedUrl, password)
            } else {
              data = await $tw.ipfs.loadToUtf8(oldResolvedUrl, password)
            }
            updatedTiddler = $tw.utils.updateTiddler({
              tiddler: updatedTiddler,
              addTags: ['$:/isAttachment', '$:/isEmbedded'],
              fields: [{ key: 'text', value: data }]
            })
            $tw.ipfs.getLogger().info(
              `Embed attachment: ${data.length}
 ${oldResolvedUrl}`
            )
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
            return tiddler
          }
        }
        $tw.ipfs.requestToUnpin(oldCid, oldIpnsKey, oldNormalizedUrl)
      }
    }
    // Process new and updated fields
    updatedTiddler = await this.updateIpfsTags(
      tiddler,
      oldTiddler,
      updatedTiddler
    )
    // Update
    $tw.wiki.addTiddler(updatedTiddler)
    return updatedTiddler
  }

  IpfsTiddler.prototype.updateIpfsTags = async function (
    tiddler,
    oldTiddler,
    updatedTiddler
  ) {
    var canonicalUri = null
    var exportUri = null
    var importUri = null
    var canonicalCid = null
    var exportCid = null
    var importCid = null
    var updatedTiddler =
      updatedTiddler === undefined || updatedTiddler == null
        ? new $tw.Tiddler(tiddler)
        : updatedTiddler
    const { type, info } = $tw.utils.getContentType(
      tiddler.fields.title,
      tiddler.fields.type
    )
    // Process
    for (var field in tiddler.fields) {
      // Not a reserved keyword
      if (reservedFields.indexOf(field) !== -1) {
        continue
      }
      // Process
      var cid = null
      var ipnsKey = null
      var normalizedUrl = null
      var resolvedUrl = null
      var value = tiddler.getFieldString(field)
      try {
        var {
          cid,
          ipnsKey,
          normalizedUrl,
          resolvedUrl
        } = await $tw.ipfs.resolveUrl(false, true, value)
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
        return tiddler
      }
      // Store
      resolvedUrl =
        resolvedUrl === undefined ||
        resolvedUrl == null ||
        resolvedUrl.toString().trim() === ''
          ? null
          : resolvedUrl.toString().trim()
      if (field === '_canonical_uri') {
        canonicalUri = resolvedUrl
        canonicalCid = cid
      }
      if (field === '_import_uri') {
        importUri = resolvedUrl
        importCid = cid
      }
      if (field === '_export_uri') {
        exportUri = resolvedUrl
        exportCid = cid
      }
      // Previous values if any
      var oldValue = null
      if (oldTiddler !== undefined && oldTiddler !== null) {
        oldValue = oldTiddler.getFieldString(field)
      }
      // Process new or updated
      if (value === oldValue) {
        continue
      }
      var oldCid = null
      var oldIpnsKey = null
      var oldNormalizedUrl = null
      try {
        var {
          cid: oldCid,
          ipnsKey: oldIpnsKey,
          normalizedUrl: oldNormalizedUrl
        } = await $tw.ipfs.resolveUrl(false, true, oldValue)
      } catch (error) {
        // We cannot resolve the previous value
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
      $tw.ipfs.requestToPin(cid, ipnsKey, normalizedUrl)
      $tw.ipfs.requestToUnpin(oldCid, oldIpnsKey, oldNormalizedUrl)
    }
    // Tag management
    var addTags = []
    var removeTags = []
    if (canonicalUri == null && exportUri == null && importUri == null) {
      removeTags.push('$:/isExported', '$:/isImported', '$:/isIpfs')
    }
    if (canonicalCid == null && exportCid == null && importCid == null) {
      if (removeTags.indexOf('$:/isIpfs') === -1) {
        removeTags.push('$:/isIpfs')
      }
    } else {
      addTags.push('$:/isIpfs')
    }
    if (canonicalUri !== null) {
      // Attachment
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        if (addTags.indexOf('$:/isAttachment') === -1) {
          addTags.push('$:/isAttachment')
        }
        if (removeTags.indexOf('$:/isEmbedded') === -1) {
          removeTags.push('$:/isEmbedded')
        }
        if (importUri !== null) {
          if (addTags.indexOf('$:/isImported') === -1) {
            addTags.push('$:/isImported')
          }
        } else {
          if (removeTags.indexOf('$:/isImported') === -1) {
            removeTags.push('$:/isImported')
          }
        }
        // Others
      } else {
        if (removeTags.indexOf('$:/isAttachment') === -1) {
          removeTags.push('$:/isAttachment')
        }
        if (removeTags.indexOf('$:/isEmbedded') === -1) {
          removeTags.push('$:/isEmbedded')
        }
        if (addTags.indexOf('$:/isImported') === -1) {
          addTags.push('$:/isImported')
        }
      }
    } else {
      // Attachment
      if (info.encoding === 'base64' || type === 'image/svg+xml') {
        if (addTags.indexOf('$:/isAttachment') === -1) {
          addTags.push('$:/isAttachment')
        }
        if (addTags.indexOf('$:/isEmbedded') === -1) {
          addTags.push('$:/isEmbedded')
        }
        // Others
      } else {
        if (removeTags.indexOf('$:/isAttachment') === -1) {
          removeTags.push('$:/isAttachment')
        }
        if (removeTags.indexOf('$:/isEmbedded') === -1) {
          removeTags.push('$:/isEmbedded')
        }
      }
      if (importUri !== null) {
        if (addTags.indexOf('$:/isImported') === -1) {
          addTags.push('$:/isImported')
        }
      } else {
        if (removeTags.indexOf('$:/isImported') === -1) {
          removeTags.push('$:/isImported')
        }
      }
    }
    if (exportUri !== null) {
      if (addTags.indexOf('$:/isExported') === -1) {
        addTags.push('$:/isExported')
      }
    } else {
      if (removeTags.indexOf('$:/isExported') === -1) {
        removeTags.push('$:/isExported')
      }
    }
    if (addTags.length > 0 || removeTags.length > 0) {
      updatedTiddler = $tw.utils.updateTiddler({
        tiddler: updatedTiddler,
        addTags: addTags,
        removeTags: removeTags
      })
    }
    return updatedTiddler
  }

  exports.IpfsTiddler = IpfsTiddler
})()
