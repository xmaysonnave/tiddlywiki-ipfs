/*\
title: $:/plugins/ipfs/ipfs-saver-handler.js
type: application/javascript
tags: $:/ipfs/core
module-type: global

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

global

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

function IpfsSaverHandler() {}

IpfsSaverHandler.prototype.initSavers = function(moduleType) {
  moduleType = moduleType || "saver";
  // Instantiate the available savers
  this.savers = [];
  var self = this;
  $tw.modules.forEachModuleOfType(moduleType,function(title,module) {
    if(module.canSave(self)) {
      self.savers.push(module.create(self.wiki));
    }
  });
  // Sort savers
  this.sortSavers();
};

/*
 * Update a saver priority
 */
IpfsSaverHandler.prototype.updateSaver = function(name, priority) {
  if (priority !== undefined && name !== undefined) {
    // Locate saver
    var saver = null;
    for (var i = 0; i < $tw.saverHandler.savers.length; i++) {
      var saver = $tw.saverHandler.savers[i];
      if (saver.info.name === name) {
        saver = $tw.saverHandler.savers[i];
        break;
      }
    }
    if (saver != null) {
      // Update saver priority info
      saver.info.priority = priority;
      // Sort savers
      this.sortSavers();
    }
  }
};

/*
 * Sort the savers into priority order
 */
IpfsSaverHandler.prototype.sortSavers = function() {
  $tw.saverHandler.savers.sort(function(a,b) {
    if(a.info.priority < b.info.priority) {
      return -1;
    } else {
      if(a.info.priority > b.info.priority) {
        return +1;
      } else {
        return 0;
      }
    }
  });
};

exports.IpfsSaverHandler = IpfsSaverHandler;

})();
