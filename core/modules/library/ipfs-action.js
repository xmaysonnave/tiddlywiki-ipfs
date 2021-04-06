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
    var target = $tw.wiki.getTiddler(event.tiddlerTitle)
    if (target === undefined) {
      return false
    }
    const content = await this.exportTiddler(target, child)
    if (content === undefined || content == null) {
      return false
    }
    return await $tw.utils.exportToIpfs(target, content)
  }

  IpfsAction.prototype.handleExportAttachmentToIpfs = async function (event) {
    const title = event.tiddlerTitle
    var tiddler = $tw.wiki.getTiddler(title)
    if (tiddler === undefined) {
      return false
    }
    var added = null
    // Do not process if _canonical_uri is set and the text field is empty
    const canonicalUri = tiddler.fields._canonical_uri
    if (canonicalUri !== undefined && canonicalUri !== null && canonicalUri.trim() !== '') {
      $tw.utils.alert(name, 'Attachment is already exported...')
      return false
    }
    if (tiddler.fields.text === undefined || tiddler.fields.text == null || tiddler.fields.text.trim() === '') {
      $tw.utils.alert(name, 'Empty attachment...')
      return false
    }
    try {
      const { info } = $tw.utils.getContentType(tiddler)
      const content = await $tw.ipfs.processContent(tiddler, tiddler.fields.text, info.encoding)
      var filename = $tw.ipfs.filenamify(title)
      if (filename.endsWith(info.extension) === false) {
        filename = `${filename}${info.extension}`
      }
      $tw.ipfs.getLogger().info(`Uploading attachment: ${content.length} bytes`)
      var { cid: added, path } = await $tw.ipfs.addAttachmentToIpfs(content, `/${filename}`)
      if (added !== null) {
        await $tw.ipfs.requestToPin(`/ipfs/${added}`)
      }
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    const addTags = ['$:/isAttachment', '$:/isIpfs']
    const removeTags = ['$:/isEmbedded']
    // Update
    tiddler = $tw.utils.updateTiddler({
      tiddler: tiddler,
      addTags: addTags,
      removeTags: removeTags,
      fields: [
        { key: 'text', value: '' },
        { key: '_canonical_uri', value: `${path}` },
      ],
    })
    $tw.wiki.addTiddler(tiddler)
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
    var ipnsCid = null
    var ipnsKey = $tw.utils.getIpnsKey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var { ipnsCid, remainderPath } = await $tw.ipfs.getIpnsIdentifier(ipnsKey)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    // Async
    $tw.ipfs
      .requestToUnpin(`/ipns/${ipnsCid}${remainderPath}`)
      .then(unpin => {
        $tw.ipfs
          .removeIpnsKey(ipnsKey)
          .then(data => {
            $tw.utils.alert(name, `Succesfully removed IPNS key: '${ipnsKey}'...`)
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
    var ipnsKey = $tw.utils.getIpnskey()
    if (ipnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPNS key....')
      return false
    }
    try {
      var { ipnsCid, resolvedUrl } = await $tw.ipfs.resolveUrl(`${ipnsKeyword}://${ipnsKey}`, true, false, false)
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
    var cid = null
    var ipnsCid = null
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
      var { ipfsCid: cid, ipnsCid } = await $tw.ipfs.resolveUrl(`${ipnsKeyword}://${ipnsKey}`, true, false, false)
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
    $tw.utils.alert(name, 'Publishing IPNS key: ' + ipnsKey)
    $tw.ipfs
      .publishIpnsKey(wikiCid, ipnsCid, ipnsKey)
      .then(data => {
        $tw.utils.alert(name, 'Successfully Published IPNS key: ' + ipnsKey)
        $tw.ipfs.requestToUnpin(`/ipfs/${cid}`)
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    return true
  }

  IpfsAction.prototype.exportTiddler = async function (target, child) {
    // Check
    if (target === undefined || target == null) {
      const error = new Error('Unknown Tiddler...')
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return null
    }
    const title = target.fields.title
    // Filter
    var exportFilter = `[[${target.fields.title}]]`
    // Child filters
    if (child) {
      // Links
      const linked = $tw.wiki.getTiddlerLinks(title)
      $tw.ipfs.getLogger().info(`Found ${linked.length} Tiddler link(s)...`)
      // Transcluded
      const transcluded = this.transcludeContent(title)
      $tw.ipfs.getLogger().info(`Found ${transcluded.length} transcluded Tiddler reference(s)...`)
      const filtered = linked.concat(transcluded)
      // Process filtered content
      for (var i = 0; i < filtered.length; i++) {
        if (exportFilter.includes(`[[${filtered[i]}]]`) === false) {
          exportFilter = `${exportFilter} [[${filtered[i]}]]`
        }
      }
    }
    var content
    var contentType = 'text/plain'
    if (child || $tw.utils.getIpfsExport() === 'json') {
      content = await $tw.utils.exportTiddlersAsJson($tw.wiki.filterTiddlers(exportFilter), target.fields._export_uri)
      if (content !== null) {
        const navigator = $tw.utils.locateNavigatorWidget($tw.pageWidgetNode)
        if (navigator) {
          navigator.dispatchEvent({
            target: target.fields.title,
            type: 'tm-ipfs-export-tiddlers',
            param: content,
          })
          return null
        }
      }
    } else if ($tw.utils.getIpfsExport() === 'static') {
      const options = {
        downloadType: contentType,
        method: 'download',
        template: '$:/core/templates/exporters/StaticRiver',
        variables: {
          exportFilter: exportFilter,
        },
      }
      content = $tw.wiki.renderTiddler(contentType, '$:/core/templates/exporters/StaticRiver', options)
    } else {
      const options = {
        downloadType: contentType,
        method: 'download',
        template: '$:/core/templates/exporters/TidFile',
        variables: {
          exportFilter: exportFilter,
        },
      }
      content = $tw.wiki.renderTiddler(contentType, '$:/core/templates/exporters/TidFile', options)
    }
    if (content) {
      return await $tw.ipfs.processContent(target, content, 'utf8')
    }
    return null
  }

  IpfsAction.prototype.transcludeContent = function (title) {
    var tiddlers = []
    // Build a transclude widget
    var transclude = $tw.wiki.makeTranscludeWidget(title)
    // Build a fake document element
    const container = $tw.fakeDocument.createElement('div')
    // Transclude
    transclude.render(container, null)
    // Process children
    this.locateTiddlers(transclude, tiddlers)
    // Return
    return tiddlers
  }

  IpfsAction.prototype.locateTiddlers = function (transclude, tiddlers) {
    // Children lookup
    for (var i = 0; i < transclude.children.length; i++) {
      // Current child
      const child = transclude.children[i]
      if (child.variables !== undefined && child.variables !== null) {
        // Locate Tiddler
        const currentTiddler = 'currentTiddler'
        const current = child.variables[currentTiddler]
        if (current !== undefined && current !== null && current.value !== undefined && current.value !== null) {
          if (tiddlers.indexOf(current.value) === -1) {
            tiddlers.push(current.value)
          }
        }
      }
      // Process children
      this.locateTiddlers(child, tiddlers)
    }
  }

  exports.IpfsAction = IpfsAction
})()
