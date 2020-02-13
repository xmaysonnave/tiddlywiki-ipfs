/*\
title: $:/plugins/ipfs/modules/widgets/ipfslink.js
type: application/javascript
module-type: widget

Link widget

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

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var IpfsLinkWidget = function(parseTreeNode,options) {
  this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
IpfsLinkWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
IpfsLinkWidget.prototype.render = function(parent,nextSibling) {
  // Save the parent dom node
  this.parentDomNode = parent;
  // Compute our attributes
  this.computeAttributes();
  // Execute our logic
  this.execute();
  // Render the link
  this.renderLink(parent, nextSibling);
};

/*
Render this widget into the DOM
*/
IpfsLinkWidget.prototype.renderLink = function(parent,nextSibling) {
  var domNode = null;
  // Only fields suffixed with '_uri' are redndered as links...
  if (this.uri) {
    domNode = this.document.createElement("a");
		domNode.setAttribute("href", this.value);
    // Add a click event handler
    $tw.utils.addEventListeners(domNode,[
      {name: "click", handlerObject: this, handlerMethod: "handleClickEvent"}
    ]);
    // Assign classes
    const classes = [];
    if (this.classes) {
      classes.push(this.classes);
    }
    if (classes.length > 0) {
      domNode.setAttribute("class",classes.join(" "));
    }
    if (this["aria-label"]) {
      domNode.setAttribute("aria-label",this["aria-label"]);
    }
    parent.insertBefore(domNode,nextSibling);
    this.renderChildren(domNode,null);
    this.domNodes.push(domNode);
  } else {
    var text = this.field;
    text = text.replace(/\r/mg,"");
    domNode = this.document.createTextNode(text);
    parent.insertBefore(domNode,nextSibling);
    this.domNodes.push(domNode);
  }
};

IpfsLinkWidget.prototype.handleClickEvent = function(event) {
  const self = this;
  $tw.ipfs.normalizeIpfsUrl(this.value)
  .then( (normalized_uri) => {
    window.open(normalized_uri, self.target, self.rel);
  })
  .catch( (error) => {
    this.getLogger().error(error);
    $tw.utils.alert(name, error.message);
  });
  event.preventDefault();
  event.stopPropagation();
  return false;
};

/*
Compute the internal state of the widget
*/
IpfsLinkWidget.prototype.execute = function() {
  // Pick up our attributes
  this.value = this.getAttribute("value");
  this.tiddler = this.getAttribute("tiddler");
  this.field = this.getAttribute("field");
  if (this.field.endsWith("_uri")) {
    this.uri = true;
  }
  const tiddler = $tw.wiki.getTiddler(this.tiddler);
  if (this.value == undefined) {
    this.value = tiddler.getFieldString(this.field);
  } else {
    this.field = this.value;
  }
  this.target = this.getAttribute("target") || "_blank";
  this.rel = this.getAttribute("rel") || "noopener";
  this["aria-label"] = this.getAttribute("aria-label");
  this.classes = this.getAttribute("class") || "tc-ipfs-link-external";
  this.makeChildWidgets([{type: "text", text: this.field}]);
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
IpfsLinkWidget.prototype.refresh = function(changedTiddlers) {
  var changedAttributes = this.computeAttributes();
  if (changedAttributes.value || changedTiddlers[this.value] || changedAttributes["aria-label"]) {
    this.refreshSelf();
    return true;
  }
  return this.refreshChildren(changedTiddlers);
};

exports.ipfslink = IpfsLinkWidget;

})();
