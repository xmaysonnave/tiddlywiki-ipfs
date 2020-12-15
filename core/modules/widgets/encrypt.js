/*\
title: $:/core/modules/widgets/encrypt.js
type: application/javascript
module-type: widget

Encrypt widget

\*/
;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  var Widget = require('$:/core/modules/widgets/widget.js').widget

  var EncryptWidget = function (parseTreeNode, options) {
    this.initialise(parseTreeNode, options)
  }

  /**
   * Inherit from the base widget class
   */
  EncryptWidget.prototype = new Widget()

  /**
   * Render this widget into the DOM
   */
  EncryptWidget.prototype.render = function (parent, nextSibling) {
    this.parentDomNode = parent
    this.computeAttributes()
    this.execute()
    var textNode = this.document.createTextNode(this.encryptedText)
    if (typeof $tw.crypto.hasEncryptionPublicKey === 'function' && $tw.crypto.hasEncryptionPublicKey()) {
      var sign = $tw.wiki.getTiddler('$:/isSigned')
      sign = sign !== undefined ? sign.fields.text === 'yes' : false
      if (sign) {
        textNode.sign = true
      }
    }
    parent.insertBefore(textNode, nextSibling)
    this.domNodes.push(textNode)
  }

  /**
   * Compute the internal state of the widget
   */
  EncryptWidget.prototype.execute = function () {
    // Get parameters from our attributes
    this.filter = this.getAttribute('filter', '[!is[system]]')
    // Encrypt the filtered tiddlers
    var tiddlers = this.wiki.filterTiddlers(this.filter)
    var json = {}
    var self = this
    $tw.utils.each(tiddlers, function (title) {
      var tiddler = self.wiki.getTiddler(title)
      var jsonTiddler = {}
      for (var f in tiddler.fields) {
        jsonTiddler[f] = tiddler.getFieldString(f)
      }
      json[title] = jsonTiddler
    })
    var content = $tw.crypto.encrypt(JSON.stringify(json))
    if (typeof $tw.crypto.hasEncryptionPublicKey === 'function' && $tw.crypto.hasEncryptionPublicKey()) {
      content = JSON.stringify({
        encrypted: content,
        keccak256: $tw.crypto.keccak256(content),
      })
    }
    this.encryptedText = $tw.utils.htmlEncode(content)
  }

  /**
   * Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
   */
  EncryptWidget.prototype.refresh = function (changedTiddlers) {
    // We don't need to worry about refreshing because the encrypt widget isn't for interactive use
    return false
  }

  exports.encrypt = EncryptWidget
})()
