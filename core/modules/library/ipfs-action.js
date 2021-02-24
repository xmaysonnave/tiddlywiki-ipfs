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

  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ipfs-action'

  var IpfsAction = function () {
    this.once = false
    this.console = false
    this.ipnsName = $tw.utils.getIpfsIpnsName()
    this.ipnsKey = $tw.utils.getIpfsIpnsKey()
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
      return await self.handleFetchIpnsKey(event)
    })
    $tw.rootWidget.addEventListener('tm-ipns-generate', async function (event) {
      return await self.handleGenerateIpnsKey(event)
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
      return await self.handleRenameIpnsName(event)
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
    // Retrieve content
    const content = await this.exportTiddler(target, child)
    // Check
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
      $tw.utils.alert(name, 'Attachment content is already exported...')
      return false
    }
    try {
      const content = await this.getAttachmentContent(tiddler)
      if (content == null) {
        return false
      }
      $tw.ipfs.getLogger().info(`Uploading attachment content: ${content.length} bytes`)
      var { cid: added } = await $tw.ipfs.addToIpfs(content)
      await $tw.ipfs.requestToPin(`/ipfs/${added}`)
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
        { key: '_canonical_uri', value: `${ipfsKeyword}://${added}` },
      ],
    })
    $tw.wiki.addTiddler(tiddler)
    return true
  }

  IpfsAction.prototype.getAttachmentContent = async function (tiddler) {
    const { info } = $tw.utils.getContentType(tiddler.fields.title, tiddler.fields.type)
    var content = tiddler.fields.text
    if (content === undefined || content == null || content === '') {
      $tw.utils.alert(name, 'Empty attachment content...')
      return null
    }
    return await $tw.ipfs.processContent(tiddler, content, info.encoding)
  }

  IpfsAction.prototype.handleRenameIpnsName = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    if (this.ipnsName == null || this.ipnsName === ipnsName) {
      $tw.utils.alert(name, 'Nothing to rename....')
      return false
    }
    try {
      var { ipnsKey } = await $tw.ipfs.renameIpnsName(this.ipnsName, ipnsName)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsKey = ipnsKey
    this.ipnsName = ipnsName
    return true
  }

  IpfsAction.prototype.handleGenerateIpnsKey = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var ipnsKey = await $tw.ipfs.generateIpnsKey(ipnsName)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }],
      })
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsKey = ipnsKey
    this.ipnsName = ipnsName
    return true
  }

  IpfsAction.prototype.handleRemoveIpnsKey = async function (event) {
    var ipnsKey = null
    var normalizedUrl = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { ipnsKey, normalizedUrl } = await $tw.ipfs.getIpnsIdentifier(ipnsName)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    // Async
    $tw.ipfs
      .requestToUnpin(`/ipns/${ipnsKey}`, normalizedUrl)
      .then(data => {
        $tw.ipfs
          .removeIpnsKey(ipnsName)
          .then(data => {
            $tw.utils.alert(name, 'Succesfully removed Ipns key....')
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
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/name')
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }],
      })
      $tw.wiki.addTiddler(updatedTiddler)
    }
    tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined) {
      const updatedTiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: '' }],
      })
      $tw.wiki.addTiddler(updatedTiddler)
    }
    this.ipnsName = null
    this.ipnsKey = null
    return true
  }

  IpfsAction.prototype.handleFetchIpnsKey = async function (event) {
    var ipnsKey = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { ipnsKey } = await $tw.ipfs.getIpnsIdentifier(ipnsName)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }],
      })
      $tw.wiki.addTiddler(tiddler)
      this.ipnsKey = ipnsKey
    }
    this.ipnsName = ipnsName
    return true
  }

  IpfsAction.prototype.handleResolveIpnsKeyAndOpen = async function (event) {
    var ipnsKey = null
    var resolvedUrl = null
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { ipnsKey, resolvedUrl } = await $tw.ipfs.resolveUrl(true, false, `${ipnsKeyword}://${ipnsName}`)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && this.ipnsKey !== ipnsKey) {
      tiddler = $tw.utils.updateTiddler({
        tiddler: tiddler,
        fields: [{ key: 'text', value: ipnsKey }],
      })
      this.ipnsKey = ipnsKey
      $tw.wiki.addTiddler(tiddler)
    }
    this.ipnsName = ipnsName
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
      await $tw.ipfs.loadErudaLibrary()
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
    var ipnsKey = null
    var wikiCid = null
    var wikiIpnsKey = null
    const wiki = $tw.ipfs.getDocumentUrl()
    var ipnsName = $tw.utils.getIpfsIpnsName()
    if (ipnsName == null) {
      $tw.utils.alert(name, 'Undefined IPNS name....')
      return false
    }
    try {
      var { cid: wikiCid, ipnsKey: wikiIpnsKey } = await $tw.ipfs.resolveUrl(true, true, wiki)
      var { cid, ipnsKey } = await $tw.ipfs.resolveUrl(true, false, `${ipnsKeyword}://${ipnsName}`)
    } catch (error) {
      $tw.ipfs.getLogger().error(error)
      $tw.utils.alert(name, error.message)
      return false
    }
    if (wikiCid == null && wikiIpnsKey == null) {
      $tw.utils.alert(name, 'Undefined IPFS identifier...')
      return false
    }
    if (wikiIpnsKey !== null && wikiIpnsKey === ipnsKey) {
      $tw.utils.alert(name, 'Default IPNS key matches current IPNS key....')
      return false
    }
    $tw.utils.alert(name, 'Publishing IPNS name: ' + ipnsName)
    $tw.ipfs
      .publishIpnsName(wikiCid, ipnsKey, ipnsName)
      .then(data => {
        $tw.utils.alert(name, 'Successfully Published IPNS name: ' + ipnsName)
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
      if (content) {
        const navigator = $tw.utils.locateNavigatorWidget($tw.pageWidgetNode)
        if (navigator) {
          navigator.dispatchEvent({
            target: target.fields.title,
            type: 'tm-ipfs-export-tiddlers',
            param: content,
          })
          return
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
