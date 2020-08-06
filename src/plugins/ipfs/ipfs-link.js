/*\
title: $:/plugins/ipfs/modules/widgets/ipfs-link.js
type: application/javascript
tags: $:/ipfs/core
module-type: widget

IPFS link widget

\*/

/**
 * TiddlyWiki created by Jeremy Ruston, (jeremy [at] jermolene [dot] com)
 *
 * Copyright (c) 2004-2007, Jeremy Ruston
 * Copyright (c) 2007-2018, UnaMesa Association
 * Copyright (c) 2019-2020, Blue Light
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  var Widget = require('$:/core/modules/widgets/widget.js').widget

  const name = 'ipfs-link'

  var IpfsLinkWidget = function (parseTreeNode, options) {
    this.initialise(parseTreeNode, options)
  }

  /*
   * Inherit from the base widget class
   */
  IpfsLinkWidget.prototype = new Widget()

  /*
   * Render this widget into the DOM
   */
  IpfsLinkWidget.prototype.render = function (parent, nextSibling) {
    var self = this
    // Save the parent dom node
    this.parentDomNode = parent
    // Compute our attributes
    this.computeAttributes()
    // Execute our logic
    this.execute()
    // Tiddler link
    var value = this.url !== undefined ? this.url : this.value
    var tiddler = $tw.wiki.getTiddler(value)
    if (tiddler !== undefined && tiddler !== null) {
      this.renderTiddlerLink(parent, nextSibling)
    } else {
      this.renderText(parent, nextSibling)
      $tw.ipfs
        .resolveUrl(false, false, value)
        .then(data => {
          var { normalizedUrl } = data
          if (normalizedUrl !== null) {
            const sibling = self.findNextSiblingDomNode()
            self.removeChildDomNodes()
            self.renderExternalLink(
              parent,
              nextSibling !== null ? nextSibling : sibling,
              normalizedUrl
            )
          }
        })
        .catch(error => {
          $tw.ipfs.getLogger().error(error)
        })
    }
  }

  /*
   * Render this widget into the DOM
   */
  IpfsLinkWidget.prototype.renderExternalLink = function (
    parent,
    nextSibling,
    url
  ) {
    // Sanitise the specified tag
    var tag = this.linkTag
    if ($tw.config.htmlUnsafeElements.indexOf(tag) !== -1) {
      tag = 'a'
    }
    // Create our element
    var namespace = this.getVariable('namespace', {
      defaultValue: 'http://www.w3.org/1999/xhtml'
    })
    var domNode = this.document.createElementNS(namespace, tag)
    domNode.setAttribute('href', url)
    // Add a click event handler
    $tw.utils.addEventListeners(domNode, [
      {
        name: 'click',
        handlerObject: this,
        handlerMethod: 'handleExternalClickEvent'
      }
    ])
    // Assign classes
    var classes = []
    if (this.classes) {
      classes.push(this.classes)
    }
    if (classes.length > 0) {
      domNode.setAttribute('class', classes.join(' '))
    }
    if (this['aria-label']) {
      domNode.setAttribute('aria-label', this['aria-label'])
    }
    parent.insertBefore(domNode, nextSibling)
    this.renderChildren(domNode, null)
    this.domNodes.push(domNode)
  }

  /*
   * Render this widget into the DOM
   */
  IpfsLinkWidget.prototype.renderTiddlerLink = function (parent, nextSibling) {
    // self
    var self = this
    // Sanitise the specified tag
    var tag = this.linkTag
    if ($tw.config.htmlUnsafeElements.indexOf(tag) !== -1) {
      tag = 'a'
    }
    var value = this.url !== undefined ? this.url : this.value
    var isMissing = !this.wiki.tiddlerExists(value)
    var isShadow = this.wiki.isShadowTiddler(value)
    // Create our element
    var namespace = this.getVariable('namespace', {
      defaultValue: 'http://www.w3.org/1999/xhtml'
    })
    var domNode = this.document.createElementNS(namespace, tag)
    // Assign classes
    var classes = []
    if (this.overrideClasses === undefined) {
      classes.push('tc-tiddlylink')
      if (isShadow) {
        classes.push('tc-tiddlylink-shadow')
      }
      if (isMissing && !isShadow) {
        classes.push('tc-tiddlylink-missing')
      } else {
        if (!isMissing) {
          classes.push('tc-tiddlylink-resolves')
        }
      }
      if (this.linkClasses) {
        classes.push(this.linkClasses)
      }
    } else if (this.overrideClasses !== '') {
      classes.push(this.overrideClasses)
    }
    if (classes.length > 0) {
      domNode.setAttribute('class', classes.join(' '))
    }
    // Set an href
    var wikilinkTransformFilter = this.getVariable('tv-filter-export-link')
    var wikiLinkText
    if (wikilinkTransformFilter) {
      // Use the filter to construct the href
      wikiLinkText = this.wiki.filterTiddlers(
        wikilinkTransformFilter,
        this,
        function (iterator) {
          iterator(self.wiki.getTiddler(value), value)
        }
      )[0]
    } else {
      // Expand the tv-wikilink-template variable to construct the href
      var wikiLinkTemplateMacro = this.getVariable('tv-wikilink-template')
      var wikiLinkTemplate = wikiLinkTemplateMacro
        ? wikiLinkTemplateMacro.trim()
        : '#$uri_encoded$'
      wikiLinkText = $tw.utils.replaceString(
        wikiLinkTemplate,
        '$uri_encoded$',
        encodeURIComponent(value)
      )
      wikiLinkText = $tw.utils.replaceString(
        wikiLinkText,
        '$uri_doubleencoded$',
        encodeURIComponent(encodeURIComponent(value))
      )
    }
    // Override with the value of tv-get-export-link if defined
    wikiLinkText = this.getVariable('tv-get-export-link', {
      params: [{ name: 'to', value: value }],
      defaultValue: wikiLinkText
    })
    if (tag === 'a') {
      var namespaceHref =
        namespace === 'http://www.w3.org/2000/svg'
          ? 'http://www.w3.org/1999/xlink'
          : undefined
      domNode.setAttributeNS(namespaceHref, 'href', wikiLinkText)
    }
    // Set the tabindex
    if (this.tabIndex) {
      domNode.setAttribute('tabindex', this.tabIndex)
    }
    // Set the tooltip
    // HACK: Performance issues with re-parsing the tooltip prevent us defaulting the tooltip to "<$transclude field='tooltip'><$transclude field='title'/></$transclude>"
    var tooltipWikiText =
      this.tooltip || this.getVariable('tv-wikilink-tooltip')
    if (tooltipWikiText) {
      var tooltipText = this.wiki.renderText(
        'text/plain',
        'text/vnd.tiddlywiki',
        tooltipWikiText,
        {
          parseAsInline: true,
          variables: {
            currentTiddler: value
          },
          parentWidget: this
        }
      )
      domNode.setAttribute('title', tooltipText)
    }
    if (this['aria-label']) {
      domNode.setAttribute('aria-label', this['aria-label'])
    }
    // Add a click event handler
    $tw.utils.addEventListeners(domNode, [
      {
        name: 'click',
        handlerObject: this,
        handlerMethod: 'handleTiddlerClickEvent'
      }
    ])
    // Make the link draggable if required
    if (this.draggable === 'yes') {
      $tw.utils.makeDraggable({
        domNode: domNode,
        dragTiddlerFn: function () {
          return value
        },
        widget: this
      })
    }
    parent.insertBefore(domNode, nextSibling)
    this.renderChildren(domNode, null)
    this.domNodes.push(domNode)
  }

  /*
   * Render this widget into the DOM
   */
  IpfsLinkWidget.prototype.renderText = function (parent, nextSibling) {
    const domNode = this.document.createElement('span')
    parent.insertBefore(domNode, nextSibling)
    this.renderChildren(domNode, null)
    this.domNodes.push(domNode)
  }

  IpfsLinkWidget.prototype.handleExternalClickEvent = function (event) {
    const value = this.url !== undefined ? this.url : this.value
    $tw.ipfs
      .resolveUrl(true, true, value)
      .then(data => {
        const { resolvedUrl } = data
        if (resolvedUrl !== null) {
          window.open(resolvedUrl.href, '_blank', 'noopener,noreferrer')
        }
      })
      .catch(error => {
        $tw.ipfs.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      })
    event.preventDefault()
    event.stopPropagation()
    return false
  }

  IpfsLinkWidget.prototype.handleTiddlerClickEvent = function (event) {
    // Send the click on its way as a navigate event
    const bounds = this.domNodes[0].getBoundingClientRect()
    const value = this.url !== undefined ? this.url : this.value
    this.dispatchEvent({
      type: 'tm-navigate',
      navigateTo: value,
      navigateFromTitle: this.getVariable('storyTiddler'),
      navigateFromNode: this,
      navigateFromClientRect: {
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        right: bounds.right,
        bottom: bounds.bottom,
        height: bounds.height
      },
      navigateSuppressNavigation:
        event.metaKey || event.ctrlKey || event.button === 1,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey
    })
    if (this.domNodes[0].hasAttribute('href')) {
      event.preventDefault()
    }
    event.stopPropagation()
    return false
  }

  /*
   * Compute the internal state of the widget
   */
  IpfsLinkWidget.prototype.execute = function () {
    // Pick up our attributes
    this.url = undefined
    this.tiddler =
      this.getAttribute('tiddler') !== undefined
        ? this.getAttribute('tiddler')
        : this.getVariable('currentTiddler')
    const tiddler = $tw.wiki.getTiddler(this.tiddler)
    this.field = this.getAttribute('field')
    this.value =
      this.getAttribute('value') !== undefined
        ? this.getAttribute('value')
        : tiddler.getFieldString(this.field) !== ''
        ? tiddler.getFieldString(this.field)
        : this.tiddler
    if (
      this.getAttribute('value') !== undefined &&
      tiddler.getFieldString(this.getAttribute('value')) !== ''
    ) {
      this.url = tiddler.getFieldString(this.getAttribute('value'))
    }
    this.tooltip = this.getAttribute('tooltip')
    this['aria-label'] = this.getAttribute('aria-label')
    this.linkClasses = this.getAttribute('class') || 'tc-ipfs-link-external'
    this.overrideClasses = this.getAttribute('overrideClass')
    this.tabIndex = this.getAttribute('tabindex')
    this.draggable = this.getAttribute('draggable', 'yes')
    this.linkTag = this.getAttribute('tag', 'a')
    var templateTree
    if (this.parseTreeNode.children && this.parseTreeNode.children.length > 0) {
      templateTree = this.parseTreeNode.children
    } else {
      templateTree = [{ type: 'text', text: this.value }]
    }
    this.makeChildWidgets(templateTree)
  }

  /*
   * Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
   */
  IpfsLinkWidget.prototype.refresh = function (changedTiddlers) {
    const changedAttributes = this.computeAttributes()
    const tiddler = $tw.wiki.getTiddler(this.tiddler)
    var value = null
    if (this.field !== undefined && this.field !== null) {
      value = tiddler.getFieldString(this.field)
    }
    if (
      changedAttributes.field ||
      changedTiddlers[this.field] ||
      changedAttributes.value ||
      changedTiddlers[this.value] ||
      changedAttributes.tooltip ||
      changedAttributes['aria-label'] ||
      changedTiddlers['$:/ipfs/saver/gateway'] ||
      changedTiddlers['$:/ipfs/saver/policy'] ||
      (value !== null && value !== this.value)
    ) {
      this.refreshSelf()
      return true
    }
    return this.refreshChildren(changedTiddlers)
  }

  exports.ipfslink = IpfsLinkWidget
})()
