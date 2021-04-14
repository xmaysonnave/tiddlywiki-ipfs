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
    this.console = false
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
    const { content, extension } = await $tw.utils.exportTiddler(tiddler, child)
    if (content === undefined || content == null) {
      return false
    }
    var filename = '/'
    if ($tw.utils.getWrappedDirectory()) {
      filename = `${filename}${$tw.ipfs.filenamify(event.tiddlerTitle)}`
      if (filename.endsWith(extension) === false) {
        filename = `${filename}${extension}`
      }
    }
    await $tw.utils.exportToIpfs(tiddler, content, ['$:/isExported', '$:/isIpfs'], [], [], '_export_uri', filename)
    if (child) {
      $tw.ipfs.getLogger().info(`Exported transcluded content: ${content.length} bytes`)
    } else {
      $tw.ipfs.getLogger().info(`Exported content: ${content.length} bytes`)
    }
  }

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function (event) {
    const title = event.tiddlerTitle
    var tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined) {
      return false
    }
    const { info } = $tw.utils.getContentType(tiddler)
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
    try {
      const content = await $tw.ipfs.processContent(tiddler, tiddler.fields.text, info.encoding)
      var filename = '/'
      if ($tw.utils.getWrappedDirectory()) {
        filename = `${filename}${$tw.ipfs.filenamify(title)}`
        if (filename.endsWith(info.extension) === false) {
          filename = `${filename}${info.extension}`
        }
      }
      const fields = [{ key: 'text', value: '' }]
      await $tw.utils.exportToIpfs(tiddler, content, ['$:/isAttachment', '$:/isIpfs'], ['$:/isEmbedded'], fields, '_canonical_uri', filename)
      $tw.ipfs.getLogger().info(`Uploaded attachment: ${content.length} bytes`)
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
      .addToUnpin(resolvedUrl !== null ? resolvedUrl.pathname : null)
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
    // Show or Hide
    if (typeof window.eruda !== 'undefined') {
      if (this.console === false) {
        window.eruda.show()
        window.eruda.show('console')
        this.console = true
      } else {
        window.eruda.hide()
        this.console = false
      }
      $tw.rootWidget.refresh($tw.utils.getChangedTiddler('$:/core/ui/Buttons/ipfs/console/mobile'))
      return true
    }
    // Load library
    try {
      if (typeof globalThis.eruda === 'undefined') {
        await $tw.ipfs.loadErudaLibrary()
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    const erudaContainer = window.document.createElement('div')
    window.document.body.appendChild(erudaContainer)
    window.eruda.init({
      container: erudaContainer,
      tool: ['console'],
      useShadowDom: true,
      autoScale: true,
    })
    // Inherit font
    erudaContainer.style.fontFamily = 'inherit'
    // Preserve user preference if any, default is 80
    if (window.eruda.get().config.get('displaySize') === 80) {
      window.eruda.get().config.set('displaySize', 40)
    }
    // Preserve user preference if any, default is 0.95
    if (window.eruda.get().config.get('transparency') === 0.95) {
      window.eruda.get().config.set('transparency', 1)
    }
    // Hide Eruda button
    if (window.eruda._shadowRoot !== undefined) {
      const btn = window.eruda._shadowRoot.querySelector('.eruda-entry-btn')
      if (btn !== undefined) {
        btn.style.display = 'none'
      }
    }
    // Init Logger
    const log = window.log.getLogger('eruda')
    if ($tw.utils.getIpfsVerbose()) {
      log.setLevel('info', false)
    } else {
      log.setLevel('warn', false)
    }
    // Log
    log.info('Mobile console has been loaded...')
    // Show
    window.eruda.show()
    window.eruda.show('console')
    this.console = true
    $tw.rootWidget.refresh($tw.utils.getChangedTiddler('$:/core/ui/Buttons/ipfs/console/mobile'))
    return true
  }

  IpfsAction.prototype.handlePublishToIpns = async function (event) {
    var ipnsCid = null
    var resolvedurl = null
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
        $tw.ipfs.addToUnpin(resolvedurl !== null ? resolvedUrl.pathname : null)
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    return true
  }

  exports.IpfsAction = IpfsAction
})()
