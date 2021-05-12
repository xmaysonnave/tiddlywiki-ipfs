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

  /*eslint no-unused-vars: "off"*/
  const name = 'ipfs-tiddler'

  var IpfsTiddler = function () {
    this.once = false
  }

  IpfsTiddler.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    // Events
    $tw.wiki.addEventListener('change', function (changes) {
      return self.handleChangeEvent(changes)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-pin', function (event) {
      return self.handleIpfsPin(event)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-unpin', function (event) {
      return self.handleIpfsUnpin(event)
    })
    $tw.rootWidget.addEventListener('tm-refresh-tiddler', function (event) {
      return self.handleRefreshTiddler(event)
    })
    // Hooks
    $tw.hooks.addHook('th-deleting-tiddler', async function (tiddler) {
      return await self.handleDeleteTiddler(tiddler)
    })
    $tw.hooks.addHook('th-saving-tiddler', async function (tiddler) {
      return await self.handleSaveTiddler(tiddler)
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
    // Pin preference
    const pin = changes['$:/ipfs/saver/pin']
    if (pin !== undefined && pin.modified) {
      if ($tw.utils.getIpfsPin()) {
        $tw.ipfs.getLogger().info('Pin current IPFS content...')
      } else {
        $tw.ipfs.getLogger().info('Do not pin current IPFS content...')
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
    // Tiddler
    if (tiddler !== undefined && title !== '$:/plugins/tiddlywiki/menubar/items/pagecontrols') {
      if (event.param) {
        // Tiddler
        for (var field in tiddler.fields) {
          if ($tw.utils.isTiddlyWikiReservedWord(field)) {
            continue
          }
          var value = tiddler.getFieldString(field)
          value = value !== undefined && value !== null && value.trim() !== '' ? value.trim() : null
          if (value !== null) {
            this.ipfsPin(value, field)
          }
        }
        return true
      }
      return false
    }
    // Wiki
    this.ipfsPin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsPin = function (value, field) {
    $tw.ipfs
      .resolveUrl(value, $tw.utils.getIpnsResolve(), false, true)
      .then(data => {
        const { ipfsCid, ipnsCid, resolvedUrl } = data
        if (ipfsCid != null || ipnsCid !== null) {
          $tw.ipfs
            .pinToIpfs(decodeURI(resolvedUrl.pathname))
            .then(pin => {
              if (pin !== undefined && pin !== null) {
                $tw.ipfs.removeFromPinUnpin(resolvedUrl.pathname)
                if (field !== undefined && field !== null) {
                  $tw.ipfs.getLogger().info(
                    `Pinned: "${field}"
 ${decodeURI(resolvedUrl.pathname)}`
                  )
                  $tw.utils.alert(name, `Pinned: '${field}'`)
                }
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
    if (tiddler !== undefined && title !== '$:/plugins/tiddlywiki/menubar/items/pagecontrols') {
      const { type, info } = $tw.utils.getContentType(tiddler)
      if (event.param) {
        // Tiddler
        for (var field in tiddler.fields) {
          if ($tw.utils.isTiddlyWikiReservedWord(field)) {
            continue
          }
          var value = tiddler.getFieldString(field)
          value = value !== undefined && value !== null && value.trim() !== '' ? value.trim() : null
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
      return false
    }
    // Wiki
    this.ipfsUnpin($tw.ipfs.getDocumentUrl().toString(), 'Wiki')
    return true
  }

  IpfsTiddler.prototype.ipfsUnpin = function (value, field) {
    field = field !== undefined && field !== null && field.trim() !== '' ? field.trim() : null
    $tw.ipfs
      .resolveUrl(value, $tw.utils.getIpnsResolve(), false, true)
      .then(data => {
        const { ipfsCid, ipnsCid, resolvedUrl } = data
        if (ipfsCid != null || ipnsCid !== null) {
          $tw.ipfs
            .unpinFromIpfs(decodeURI(resolvedUrl.pathname))
            .then(unpin => {
              if (unpin !== undefined && unpin !== null) {
                $tw.ipfs.removeFromPinUnpin(resolvedUrl.pathname)
                if (field !== undefined && field !== null) {
                  $tw.ipfs.getLogger().info(
                    `Unpinned: "${field}
 ${decodeURI(resolvedUrl.pathname)}`
                  )
                  $tw.utils.alert(name, `Unpinned: '${field}'`)
                }
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

  IpfsTiddler.prototype.handleDeleteTiddler = async function (tiddler) {
    try {
      for (var field in tiddler.fields) {
        var ipfsCid = null
        var ipnsCid = null
        var resolvedUrl = null
        const value = tiddler.getFieldString(field)
        var { ipfsCid, ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(value, false, false, true)
        if (ipfsCid == null && ipnsCid == null) {
          continue
        }
        $tw.ipfs.addToUnpin(resolvedUrl !== null ? resolvedUrl.pathname : null)
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
    return tiddler
  }

  IpfsTiddler.prototype.handleRefreshTiddler = function (event) {
    const title = event.tiddlerTitle
    const tiddler = $tw.wiki.getTiddler(title)
    // Ignore
    if (tiddler === undefined || title === '$:/plugins/tiddlywiki/menubar/items/pagecontrols') {
      return false
    }
    if (tiddler.fields.type === 'application/json' && tiddler.hasField('plugin-type')) {
      return false
    }
    // Process
    var canonicalUri = tiddler.fields._canonical_uri
    canonicalUri = canonicalUri !== undefined && canonicalUri !== null && canonicalUri.trim() !== '' ? canonicalUri.trim() : null
    var importUri = tiddler.fields._import_uri
    importUri = importUri !== undefined && importUri !== null && importUri.trim() !== '' ? importUri.trim() : null
    // Reload
    if (canonicalUri !== null && importUri == null) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }],
      })
      $tw.wiki.addTiddler(updatedTiddler)
      return true
    }
    // Import
    if (canonicalUri !== null || importUri !== null) {
      const ipfsImport = new IpfsImport()
      ipfsImport
        .import(canonicalUri, importUri, tiddler)
        .then(data => {
          if (data !== undefined && data !== null) {
            if (data.merged.size > 0 || data.deleted.size > 0) {
              const navigator = $tw.utils.locateNavigatorWidget($tw.pageWidgetNode)
              if (navigator !== undefined && navigator !== null) {
                navigator.dispatchEvent({
                  type: 'tm-ipfs-import-tiddlers',
                  param: data,
                })
              }
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

  IpfsTiddler.prototype.handleImportFile = async function (info) {
    const dummy = new $tw.Tiddler({
      title: $tw.wiki.generateNewTitle('Untitled'),
      type: info.type,
    })
    var type = null
    if (info !== undefined && info !== null && info.type !== undefined && info.type !== null) {
      type = info.type
    }
    if (type == null) {
      return false
    }
    if (type !== 'text/html' && type !== 'application/json' && type !== 'application/x-tiddler') {
      return false
    }
    try {
      const ipfsImport = new IpfsImport()
      const url = URL.createObjectURL(info.file)
      try {
        const data = await ipfsImport.import(null, url, dummy)
        if (data === undefined || data == null) {
          return false
        }
        if (data.merged.size > 0 || data.deleted.size > 0) {
          info.callback(data)
          return true
        }
      } catch (error) {
        $tw.ipfs.getLogger().error(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
    }
    return false
  }

  IpfsTiddler.prototype.handleSaveTiddler = async function (tiddler) {
    const oldTiddler = $tw.wiki.getTiddler(tiddler.fields.title)
    const { type, info } = $tw.utils.getContentType(tiddler)
    var password = tiddler.fields._password
    password = password !== undefined && password !== null && password.trim() !== '' ? password.trim() : null
    // Prepare
    var updatedTiddler = new $tw.Tiddler(tiddler)
    if (oldTiddler !== undefined && oldTiddler !== null) {
      // Title update
      if ($tw.utils.getWrappedDirectory() && tiddler.fields.title !== oldTiddler.fields.title) {
        // Process
        if (tiddler.fields._canonical_uri) {
        }
      }
      // Process deleted fields
      for (var field in oldTiddler.fields) {
        // Not a reserved keyword
        if ($tw.utils.isTiddlyWikiReservedWord(field)) {
          continue
        }
        // Updated
        const discard = tiddler.fields[field]
        if (discard && tiddler.getFieldString(field)) {
          continue
        }
        // Old value
        var oldResolvedUrl = null
        var oldValue = oldTiddler.getFieldString(field)
        try {
          var { resolvedUrl: oldResolvedUrl } = await $tw.ipfs.resolveUrl(oldValue, $tw.utils.getIpnsResolve(), false, true)
        } catch (error) {
          $tw.ipfs.getLogger().error(error)
          $tw.utils.alert(name, error.message)
          $tw.wiki.addTiddler(updatedTiddler)
          return updatedTiddler
        }
        // Deleted
        oldResolvedUrl = oldResolvedUrl !== undefined && oldResolvedUrl !== null && oldResolvedUrl.toString().trim() !== '' ? oldResolvedUrl.toString().trim() : null
        if (oldResolvedUrl !== null && field === '_canonical_uri') {
          var addTags = []
          var msg = 'Embed'
          var data = tiddler.fields.text
          try {
            if (info.encoding === 'base64') {
              addTags = ['$:/isAttachment', '$:/isEmbedded']
              msg = `${msg} attachment '${type}':`
              data = await $tw.ipfs.loadToBase64(oldResolvedUrl, password)
            } else if (type === 'image/svg+xml') {
              addTags = ['$:/isAttachment', '$:/isEmbedded']
              msg = `${msg} attachment '${type}':`
              data = await $tw.ipfs.loadToUtf8(oldResolvedUrl, password)
            } else if (oldTiddler.fields.text && oldTiddler.fields.text !== '') {
              msg = `${msg} '${type}':`
              data = oldTiddler.fields.text
            } else {
              msg = `${msg} '${type}':`
              data = await $tw.ipfs.loadToUtf8(oldResolvedUrl, password)
            }
            if (tiddler.fields.type === 'application/json' && tiddler.hasField('plugin-type')) {
              const innerData = JSON.parse(data)
              if (innerData.text !== undefined && innerData.text !== null && innerData.text !== '') {
                updatedTiddler = $tw.utils.updateTiddler({
                  tiddler: updatedTiddler,
                  addTags: addTags,
                  fields: [{ key: 'text', value: innerData.text }],
                })
                $tw.wiki.setPluginInfo(tiddler.fields.title, JSON.parse(innerData.text))
              }
            } else {
              updatedTiddler = $tw.utils.updateTiddler({
                tiddler: updatedTiddler,
                addTags: addTags,
                fields: [{ key: 'text', value: data }],
              })
            }
            $tw.ipfs.getLogger().info(
              `${msg} ${data.length}
 ${oldResolvedUrl}`
            )
          } catch (error) {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
            $tw.wiki.addTiddler(updatedTiddler)
            return updatedTiddler
          }
        }
        $tw.ipfs.addToUnpin(oldResolvedUrl !== null ? oldResolvedUrl.pathname : null)
      }
    }
    // Process exports
    var oldCanonicalUri = oldTiddler !== undefined && oldTiddler !== null ? oldTiddler.fields._canonical_uri : null
    oldCanonicalUri = oldCanonicalUri !== undefined && oldCanonicalUri !== null && oldCanonicalUri.trim() !== '' ? oldCanonicalUri.trim() : null
    var canonicalUri = tiddler.fields._canonical_uri
    canonicalUri = canonicalUri !== undefined && canonicalUri !== null && canonicalUri.trim() !== '' ? canonicalUri.trim() : null
    const { ipnsCid, normalizedUrl } = await $tw.ipfs.resolveUrl(canonicalUri, false, false, true)
    // Process new canonical_uri
    if (oldCanonicalUri == null && ipnsCid !== null && canonicalUri !== null && tiddler.fields.text !== '') {
      const { info } = $tw.utils.getContentType(tiddler)
      const content = await $tw.ipfs.processContent(tiddler, tiddler.fields.text, info.encoding, type)
      var filename = '/'
      var incomingName = null
      if ($tw.utils.getWrappedDirectory()) {
        try {
          var path = null
          const pathname = normalizedUrl.pathname.slice(`/ipns/${ipnsCid}`.length)
          if (pathname !== undefined && pathname !== null && pathname.trim() !== '') {
            path = pathname.substring(0, pathname.lastIndexOf('/'))
            if (path !== undefined && path !== null && path.trim() !== '') {
              const incoming = pathname.split('/').pop()
              if (incoming !== undefined && incoming !== null && incoming.trim() !== '') {
                incomingName = decodeURI(incoming)
                filename = `${path}/${incomingName}`
              }
            }
          }
          if (filename === '/') {
            const url = $tw.ipfs.getUrl(tiddler.fields.title, $tw.ipfs.getIpfsBaseUrl())
            if (path === undefined || path == null || path.trim() === '') {
              path = url.pathname.substring(0, url.pathname.lastIndexOf('/'))
            }
            if (path !== undefined && path !== null && path.trim() !== '') {
              const incoming = url.pathname.split('/').pop()
              if (incoming !== undefined && incoming !== null && incoming.trim() !== '') {
                incomingName = decodeURI(incoming)
                filename = `${path}/${incomingName}`
              }
            }
          }
        } catch (error) {
          // Ignore
        }
        if (filename === '/') {
          incomingName = $tw.ipfs.filenamify(tiddler.fields.title)
          filename = `${filename}${incomingName}`
        }
        if (filename.endsWith(info.extension) === false) {
          incomingName = `${incomingName}${info.extension}`
          filename = `${filename}${info.extension}`
        }
      }
      // Beware, async...
      const fields = [{ key: 'text', value: '' }]
      $tw.utils.exportToIpfs(tiddler, content, fields, '_canonical_uri', filename, incomingName)
    } else {
      updatedTiddler = await $tw.utils.processUpdatedTiddler(tiddler, oldTiddler, updatedTiddler)
    }
    $tw.wiki.addTiddler(updatedTiddler)
    return updatedTiddler
  }

  exports.IpfsTiddler = IpfsTiddler
})()
