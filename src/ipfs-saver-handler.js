/*\
title: $:/plugins/ipfs/ipfs-saver-handler.js
type: application/javascript
module-type: utils

The saver handler tracks changes to the store and handles saving the entire wiki via saver modules.

\*/
( function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Update a saver priority
*/
exports.updateSaver = function(name, priority) {
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
      $tw.utils.sortSavers();
    }
  }
};

/*
Sort the savers into priority order
*/
exports.sortSavers = function() {
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

})();
