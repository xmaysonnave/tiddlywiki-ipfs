/*\
title: $:/plugins/ipfs/ipfs-action.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Action

\*/
;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const ipnsKeyword = 'ipns'

  const name = 'ipfs-action'

  var IpfsAction = function () {
    this.once = false
    this.ipnsKey = $tw.utils.getIpnsKey()
    this.ipnsCid = $tw.utils.getIpnsCid()
  }

  IpfsAction.prototype.init = function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    // Widget
    $tw.rootWidget.addEventListener('tm-ipfs-export', async function (event) {
      return await self.handleExportToIpfs(event, false)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-export-content', async function (event) {
      return await self.handleExportToIpfs(event, true)
    })
    $tw.rootWidget.addEventListener('tm-ipns-fetch', async function (event) {
      return await self.handleFetchIpnsCid(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-generate', async function (event) {
      return await self.handleGenerateIpnsCid(event)
    })
    $tw.rootWidget.addEventListener('tm-console-mobile', async function (event) {
      return await self.handleMobileConsole(event)
    })
    $tw.rootWidget.addEventListener('tm-ipfs-export-attachment', async function (event) {
      return await self.handleExportAttachmentToIpfs(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-publish', async function (event) {
      return await self.handlePublishToIpns(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-remove', async function (event) {
      return await self.handleRemoveIpnsKey(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-rename', async function (event) {
      return await self.handleRenameIpnsKey(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-resolve-and-open', async function (event) {
      return await self.handleResolveIpnsKeyAndOpen(event)
    })
    // Init once
    this.once = true
  }

  IpfsAction.prototype.handleExportToIpfs = async function (event, child) {
    var tiddler = $tw.wiki.getTiddler(event.tiddlerTitle)
    if (tiddler === undefined) {
      return false
    }
    // Do not process if _export_uri is set
    const exportUri =
      tiddler.fields._export_uri !== undefined && tiddler.fields._export_uri !== null && tiddler.fields._export_uri.trim() !== '' ? tiddler.fields._export_uri.trim() : null
    const { content, extension } = await $tw.utils.exportTiddler(tiddler, child)
    if (content === undefined || content == null) {
      return false
    }
    var filename = '/'
    var incomingName = ''
    if ($tw.utils.getWrappedDirectory()) {
      try {
        var path = null
        if (exportUri !== null) {
          const { ipnsCid, normalizedUrl } = await $tw.ipfs.resolveUrl(exportUri, false, false, true)
          if (ipnsCid !== null) {
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
          }
        }
        if (filename === '/') {
          const url = $tw.ipfs.getUrl(event.tiddlerTitle, $tw.ipfs.getIpfsBaseUrl())
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
        incomingName = $tw.ipfs.filenamify(event.tiddlerTitle)
        filename = `${filename}${incomingName}`
      } else {
        incomingName = $tw.ipfs.filenamify(filename.substring(filename.lastIndexOf('/') + 1))
        filename = `/${incomingName}`
      }
      if (filename.endsWith(extension) === false) {
        incomingName = `${incomingName}${extension}`
        filename = `${filename}${extension}`
      }
    }
    if (child) {
      $tw.ipfs.getLogger().info(`Export transcluded content: ${content.length} bytes`)
    } else {
      $tw.ipfs.getLogger().info(`Export content: ${content.length} bytes`)
    }
    // Beware async...
    $tw.utils.exportToIpfs(tiddler, content, [], '_export_uri', filename, incomingName)
  }

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function (event) {
    const title = event.tiddlerTitle
    var tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined) {
      return false
    }
    // Do not process if _canonical_uri is set and the text field is empty
    const canonicalUri = tiddler.fields._canonical_uri
    if (canonicalUri !== undefined && canonicalUri !== null && canonicalUri.trim() !== '') {
      $tw.utils.alert(name, 'Attachment is already exported...')
      return false
    }
    if (tiddler.fields.text === undefined || tiddler.fields.text == null || tiddler.fields.text === '') {
      $tw.utils.alert(name, 'Empty attachment...')
      return false
    }
    const { type, info } = $tw.utils.getContentType(tiddler)
    try {
      const content = await $tw.ipfs.processContent(tiddler, tiddler.fields.text, info.encoding, type)
      var filename = '/'
      var incomingName = ''
      if ($tw.utils.getWrappedDirectory()) {
        try {
          const url = $tw.ipfs.getUrl(title, $tw.ipfs.getIpfsBaseUrl())
          const path = url.pathname.substring(0, url.pathname.lastIndexOf('/'))
          if (path !== undefined && path !== null && path.trim() !== '') {
            const incoming = url.pathname.split('/').pop()
            if (incoming !== undefined && incoming !== null && incoming.trim() !== '') {
              incomingName = decodeURI(incoming)
              filename = `${path}/${incomingName}`
            }
          }
        } catch (error) {
          // Ignore
        }
        if (filename === '/') {
          incomingName = $tw.ipfs.filenamify(tiddler.fields.title)
          filename = `${filename}${incomingName}`
        } else {
          incomingName = $tw.ipfs.filenamify(filename.substring(filename.lastIndexOf('/') + 1))
          filename = `/${incomingName}`
        }
        if (filename.endsWith(info.extension) === false) {
          incomingName = `${incomingName}${info.extension}`
          filename = `${filename}${info.extension}`
        }
      }
      const fields = [{ key: 'text', value: '' }]
      // Beware async...
      $tw.utils.exportToIpfs(tiddler, content, fields, '_canonical_uri', filename, incomingName)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    return true
  }

  IpfsAction.prototype.handleRenameIpnsKey = async function (event) {
    var ipnsCid = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    if (this.ipnsKey == null || this.ipnsKey === ipnsKey) {
      $tw.utils.alert(name, 'Nothing to rename....')
      return false
    }
    try {
      var { ipnsCid, ipnsKey } = await $tw.ipfs.renameIpnsKey(this.ipnsKey, ipnsKey)
      $tw.utils.alert(name, `Renamed IPNS key: '${ipnsKey}'...`)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/cid')
    if (tiddler !== undefined && this.ipnsCid !== ipnsCid) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsCid }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsCid = ipnsCid
    this.ipnsKey = ipnsKey
    return true
  }

  IpfsAction.prototype.handleGenerateIpnsCid = async function (event) {
    var ipnsCid = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var ipnsCid = await $tw.ipfs.generateIpnsCid(ipnsKey)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/cid')
    if (tiddler !== undefined && this.ipnsCid !== ipnsCid) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsCid }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsCid = ipnsCid
    this.ipnsKey = ipnsKey
    return true
  }

  IpfsAction.prototype.handleRemoveIpnsKey = async function (event) {
    var resolvedUrl = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var { resolvedUrl } = await $tw.ipfs.resolveUrl(`/ipns/${ipnsKey}`, $tw.utils.getIpnsResolve(), false, true)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    // Async
    $tw.ipfs
      .addToUnpin({
        ipfsPath: resolvedUrl !== null ? resolvedUrl.pathname : null,
        recursive: false,
      })
      .then(unpin => {
        $tw.ipfs
          .removeIpnsKey(ipnsKey)
          .then(data => {
            $tw.utils.alert(name, `Removed IPNS key: '${ipnsKey}'...`)
          })
          .catch(error => {
            $tw.ipfs.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          })
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }],
      })
      $tw.wiki.addTiddler(updatedTiddler)
    }
    tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/cid')
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }],
      })
      $tw.wiki.addTiddler(updatedTiddler)
    }
    this.ipnsCid = null
    this.ipnsKey = null
    return true
  }

  IpfsAction.prototype.handleFetchIpnsCid = async function (event) {
    var ipnsCid = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var { ipnsCid } = await $tw.ipfs.getIpnsIdentifier(ipnsKey)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/cid')
    if (tiddler !== undefined && this.ipnsCid !== ipnsCid) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsCid }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsCid = ipnsCid
    this.ipnsKey = ipnsKey
    return true
  }

  IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function (event) {
    var ipnsCid = null
    var resolvedUrl = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var { ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(`${ipnsKeyword}://${ipnsKey}`, $tw.utils.getIpnsResolve(), false, false)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/cid')
    if (tiddler !== undefined && ipnsCid !== null && this.ipnsCid !== ipnsCid) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsCid }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    if (ipnsCid !== null) {
      this.ipnsCid = ipnsCid
    }
    if (resolvedUrl !== null) {
      window.open(resolvedUrl.href, '_blank', 'noopener,noreferrer')
    }
    return true
  }

  IpfsAction.prototype.handleMobileConsole = async function (event) {
    var eruda = await $tw.ipfs.getEruda()
    if (eruda === undefined || eruda == null) {
      return false
    }
    // Show or Hide
    if (this.console !== undefined && this.console !== null) {
      if (this.console === false) {
        eruda.show()
        eruda.show('console')
        this.console = true
      } else {
        eruda.hide()
        this.console = false
      }
      $tw.rootWidget.refresh($tw.utils.getChangedTiddler('$:/core/ui/Buttons/ipfs/console/mobile'))
      return true
    }
    const erudaContainer = globalThis.document.createElement('div')
    globalThis.document.body.appendChild(erudaContainer)
    eruda.init({
      container: erudaContainer,
      tool: ['console'],
      useShadowDom: true,
      autoScale: true,
    })
    // Inherit font
    erudaContainer.style.fontFamily = 'inherit'
    // Preserve user preference if any, default is 80
    if (eruda.get().config.get('displaySize') === 80) {
      eruda.get().config.set('displaySize', 40)
    }
    // Preserve user preference if any, default is 0.95
    if (eruda.get().config.get('transparency') === 0.95) {
      eruda.get().config.set('transparency', 1)
    }
    // Hide Eruda button
    if (eruda._shadowRoot !== undefined) {
      const btn = eruda._shadowRoot.querySelector('.eruda-entry-btn')
      if (btn !== undefined) {
        btn.style.display = 'none'
      }
    }
    // Init Logger
    const log = globalThis.log.getLogger('eruda')
    if ($tw.utils.getIpfsVerbose()) {
      log.setLevel('info', false)
    } else {
      log.setLevel('warn', false)
    }
    // Log
    log.info('Mobile console has been loaded...')
    // Show
    eruda.show()
    eruda.show('console')
    this.console = true
    $tw.rootWidget.refresh($tw.utils.getChangedTiddler('$:/core/ui/Buttons/ipfs/console/mobile'))
    return true
  }

  IpfsAction.prototype.handlePublishToIpns = async function (event) {
    var ipnsCid = null
    var resolvedUrl = null
    var wikiCid = null
    var wikiIpnsCid = null
    const wiki = $tw.ipfs.getDocumentUrl()
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var { ipfsCid: wikiCid, ipnsCid: wikiIpnsCid } = await $tw.ipfs.resolveUrl(wiki, true, false, true)
      var { ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(`${ipnsKeyword}://${ipnsKey}`, $tw.utils.getIpnsResolve(), false, false)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    if (wikiCid == null && wikiIpnsCid == null) {
      $tw.utils.alert(name, 'Undefined IPFS identifier...')
      return false
    }
    if (wikiIpnsCid !== null && wikiIpnsCid === ipnsCid) {
      $tw.utils.alert(name, 'Default IPNS cid matches current IPNS cid....')
      return false
    }
    $tw.ipfs
      .publishIpnsKey(wikiCid, ipnsCid, ipnsKey)
      .then(data => {
        $tw.utils.alert(name, 'Published IPNS key: ' + ipnsKey)
        $tw.ipfs.addToUnpin({
          ipfsPath: resolvedUrl !== null ? resolvedUrl.pathname : null,
          recursive: false,
        })
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    return true
  }

  exports.IpfsAction = IpfsAction
})()
