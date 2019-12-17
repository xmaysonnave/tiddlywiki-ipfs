/*\
title: $:/plugins/ipfs/ipfs-saver-handler.js
type: application/javascript
module-type: global

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

global

\*/

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
