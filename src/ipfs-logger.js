/*\
title: $:/core/modules/utils/logger.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

A basic logging implementation

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

  var ALERT_TAG = "$:/tags/Alert";

  /*
  Make a new logger
  */
  function Logger(componentName,options) {
    options = options || {};
    this.componentName = componentName || "";
    this.colour = options.colour || "white";
    this.enable = "enable" in options ? options.enable : true;
  }

  /*
  Log a message
  */
  Logger.prototype.log = function(value) {
    if(this.enable && console !== undefined && console.log !== undefined) {
      if($tw.browser == false) {
        return Function.apply.call(console.log, console, [$tw.utils.terminalColour(this.colour),this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)).concat($tw.utils.terminalColour()));
      } else {
        return Function.apply.call(console.log, console, [this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)));
      }
    }
  };

  Logger.prototype.info = function(value) {
    if(this.enable && console !== undefined && console.info !== undefined) {
      if($tw.browser == false) {
        return Function.apply.call(console.info, console, [$tw.utils.terminalColour(this.colour),this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)).concat($tw.utils.terminalColour()));
      } else {
        return Function.apply.call(console.info, console, [this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)));
      }
    }
  };

  Logger.prototype.warn = function(/* args */) {
    if(this.enable && console !== undefined && console.warn !== undefined) {
      if($tw.browser == false) {
        return Function.apply.call(console.warn, console, [$tw.utils.terminalColour(this.colour),this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)).concat($tw.utils.terminalColour()));
      } else {
        return Function.apply.call(console.warn, console, [this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)));
      }
    }
  };

  Logger.prototype.error = function(/* args */) {
    if(this.enable && console !== undefined && console.error !== undefined) {
      if($tw.browser == false) {
        return Function.apply.call(console.error, console, [$tw.utils.terminalColour(this.colour),this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)).concat($tw.utils.terminalColour()));
      } else {
        return Function.apply.call(console.error, console, [this.componentName + ":"].concat(Array.prototype.slice.call(arguments,0)));
      }
    }
  };

  /*
  Log a structure as a table
  */
  Logger.prototype.table = function(value) {
    (console.table || console.log)(value);
  };

  /*
  Alert a message
  */
  Logger.prototype.alert = function(/* args */) {
    if(this.enable) {
      // Prepare the text of the alert
      var text = Array.prototype.join.call(arguments," ");
      // Create alert tiddlers in the browser
      if($tw.browser) {
        // Check if there is an existing alert with the same text and the same component
        var existingAlerts = $tw.wiki.getTiddlersWithTag(ALERT_TAG),
          alertFields,
          existingCount,
          self = this;
        $tw.utils.each(existingAlerts,function(title) {
          var tiddler = $tw.wiki.getTiddler(title);
          if(tiddler.fields.text === text && tiddler.fields.component === self.componentName && tiddler.fields.modified && (!alertFields || tiddler.fields.modified < alertFields.modified)) {
              alertFields = $tw.utils.extend({},tiddler.fields);
          }
        });
        if(alertFields) {
          existingCount = alertFields.count || 1;
        } else {
          alertFields = {
            title: $tw.wiki.generateNewTitle("$:/temp/alerts/alert",{prefix: ""}),
            text: text,
            tags: [ALERT_TAG],
            component: this.componentName
          };
          existingCount = 0;
        }
        alertFields.modified = new Date();
        if(++existingCount > 1) {
          alertFields.count = existingCount;
        } else {
          alertFields.count = undefined;
        }
        $tw.wiki.addTiddler(new $tw.Tiddler(alertFields));
        // Log the alert as well
        this.error.apply(this,Array.prototype.slice.call(arguments,0));
      } else {
        // Print an orange message to the console if not in the browser
        console.error("\x1b[1;33m" + text + "\x1b[0m");
      }
    }
  };

  exports.Logger = Logger;

  })();
