/*\
title: $:/core/modules/parsers/htmlparser.js
type: application/javascript
module-type: parser

The HTML parser displays text as raw HTML

\*/
(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  var HtmlParser = function() {
    this.init = false;
  };

  HtmlParser.prototype.initParser = function(type,text,options) {
    if (this.init) {
      return;
    }
    var src;
    if(options._canonical_uri) {
      src = options._canonical_uri;
    } else if(text) {
      src = "data:text/html;charset=utf-8," + encodeURIComponent(text);
    }
    this.tree = [{
      type: "element",
      tag: "iframe",
      attributes: {
        src: {type: "string", value: src},
        sandbox: {type: "string", value: ""}
      }
    }];
    this.init = true;
  };

  exports["text/html"] = HtmlParser;

  exports.HtmlParser = HtmlParser;

  })();
