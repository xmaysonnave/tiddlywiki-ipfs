/*\
title: $:/plugins/ipfs/modules/parsers/wikiparser/wikiparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

wikiparser

\*/

/**
 * TiddlyWiki created by Jeremy Ruston, (jeremy [at] jermolene [dot] com)
 *
 * Copyright (c) 2004-2007, Jeremy Ruston
 * Copyright (c) 2007-2020, UnaMesa Association
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
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  const IpfsImport = require('$:/plugins/ipfs/ipfs-import.js').IpfsImport

  var name = 'ipfs-wikiparser'

  var WikiParser = function (type, text, options) {
    var self = this
    this.wiki = options.wiki
    // Check for an externally linked tiddler
    if (
      $tw.browser &&
      (text || '') === '' &&
      options.tiddler !== undefined &&
      options.tiddler !== null
    ) {
      var canonicalUri = options.tiddler.fields._canonical_uri
      canonicalUri =
        canonicalUri === undefined ||
        canonicalUri == null ||
        canonicalUri.trim() === ''
          ? null
          : canonicalUri.trim()
      var importUri = options.tiddler.fields._import_uri
      importUri =
        importUri === undefined || importUri == null || importUri.trim() === ''
          ? null
          : importUri.trim()
      if (canonicalUri !== null || importUri !== null) {
        var ipfsImport = new IpfsImport()
        ipfsImport
          .import(canonicalUri, importUri, options.tiddler)
          .catch(error => {
            self.getLogger().error(error)
            $tw.utils.alert(name, error.message)
          })
        text = $tw.language.getRawString('LazyLoadingWarning')
      }
    }
    // Initialise the classes if we don't have them already
    if (!this.pragmaRuleClasses) {
      WikiParser.prototype.pragmaRuleClasses = $tw.modules.createClassesFromModules(
        'wikirule',
        'pragma',
        $tw.WikiRuleBase
      )
      this.setupRules(
        WikiParser.prototype.pragmaRuleClasses,
        '$:/config/WikiParserRules/Pragmas/'
      )
    }
    if (!this.blockRuleClasses) {
      WikiParser.prototype.blockRuleClasses = $tw.modules.createClassesFromModules(
        'wikirule',
        'block',
        $tw.WikiRuleBase
      )
      this.setupRules(
        WikiParser.prototype.blockRuleClasses,
        '$:/config/WikiParserRules/Block/'
      )
    }
    if (!this.inlineRuleClasses) {
      WikiParser.prototype.inlineRuleClasses = $tw.modules.createClassesFromModules(
        'wikirule',
        'inline',
        $tw.WikiRuleBase
      )
      this.setupRules(
        WikiParser.prototype.inlineRuleClasses,
        '$:/config/WikiParserRules/Inline/'
      )
    }
    // Save the parse text
    this.type = type || 'text/vnd.tiddlywiki'
    this.source = text || ''
    this.sourceLength = this.source.length
    // Flag for ignoring whitespace
    this.configTrimWhiteSpace = false
    // Set current parse position
    this.pos = 0
    // Instantiate the pragma parse rules
    this.pragmaRules = this.instantiateRules(
      this.pragmaRuleClasses,
      'pragma',
      0
    )
    // Instantiate the parser block and inline rules
    this.blockRules = this.instantiateRules(this.blockRuleClasses, 'block', 0)
    this.inlineRules = this.instantiateRules(
      this.inlineRuleClasses,
      'inline',
      0
    )
    // Parse any pragmas
    this.tree = []
    var topBranch = this.parsePragmas()
    // Parse the text into inline runs or blocks
    if (options.parseAsInline) {
      topBranch.push.apply(topBranch, this.parseInlineRun())
    } else {
      topBranch.push.apply(topBranch, this.parseBlocks())
    }
    // Return the parsed tree
  }

  WikiParser.prototype.getLogger = function () {
    if (window.log) {
      return window.log.getLogger(name)
    }
    return console
  }

  /*
   */
  WikiParser.prototype.setupRules = function (proto, configPrefix) {
    var self = this
    if (!$tw.safemode) {
      $tw.utils.each(proto, function (object, name) {
        if (
          self.wiki.getTiddlerText(configPrefix + name, 'enable') !== 'enable'
        ) {
          delete proto[name]
        }
      })
    }
  }

  /*
Instantiate an array of parse rules
*/
  WikiParser.prototype.instantiateRules = function (classes, type, startPos) {
    var rulesInfo = []
    var self = this
    $tw.utils.each(classes, function (RuleClass) {
      // Instantiate the rule
      var rule = new RuleClass(self)
      rule.is = {}
      rule.is[type] = true
      rule.init(self)
      var matchIndex = rule.findNextMatch(startPos)
      if (matchIndex !== undefined) {
        rulesInfo.push({
          rule: rule,
          matchIndex: matchIndex
        })
      }
    })
    return rulesInfo
  }

  /*
Skip any whitespace at the current position. Options are:
  treatNewlinesAsNonWhitespace: true if newlines are NOT to be treated as whitespace
*/
  WikiParser.prototype.skipWhitespace = function (options) {
    options = options || {}
    var whitespaceRegExp = options.treatNewlinesAsNonWhitespace
      ? /([^\S\n]+)/gm
      : /(\s+)/gm
    whitespaceRegExp.lastIndex = this.pos
    var whitespaceMatch = whitespaceRegExp.exec(this.source)
    if (whitespaceMatch && whitespaceMatch.index === this.pos) {
      this.pos = whitespaceRegExp.lastIndex
    }
  }

  /*
Get the next match out of an array of parse rule instances
*/
  WikiParser.prototype.findNextMatch = function (rules, startPos) {
    // Find the best matching rule by finding the closest match position
    var matchingRule
    var matchingRulePos = this.sourceLength
    // Step through each rule
    for (var t = 0; t < rules.length; t++) {
      var ruleInfo = rules[t]
      // Ask the rule to get the next match if we've moved past the current one
      if (ruleInfo.matchIndex !== undefined && ruleInfo.matchIndex < startPos) {
        ruleInfo.matchIndex = ruleInfo.rule.findNextMatch(startPos)
      }
      // Adopt this match if it's closer than the current best match
      if (
        ruleInfo.matchIndex !== undefined &&
        ruleInfo.matchIndex <= matchingRulePos
      ) {
        matchingRule = ruleInfo
        matchingRulePos = ruleInfo.matchIndex
      }
    }
    return matchingRule
  }

  /*
Parse any pragmas at the beginning of a block of parse text
*/
  WikiParser.prototype.parsePragmas = function () {
    var currentTreeBranch = this.tree
    while (true) {
      // Skip whitespace
      this.skipWhitespace()
      // Check for the end of the text
      if (this.pos >= this.sourceLength) {
        break
      }
      // Check if we've arrived at a pragma rule match
      var nextMatch = this.findNextMatch(this.pragmaRules, this.pos)
      // If not, just exit
      if (!nextMatch || nextMatch.matchIndex !== this.pos) {
        break
      }
      // Process the pragma rule
      var subTree = nextMatch.rule.parse()
      if (subTree.length > 0) {
        // Quick hack; we only cope with a single parse tree node being returned, which is true at the moment
        currentTreeBranch.push.apply(currentTreeBranch, subTree)
        subTree[0].children = []
        currentTreeBranch = subTree[0].children
      }
    }
    return currentTreeBranch
  }

  /*
Parse a block from the current position
  terminatorRegExpString: optional regular expression string that identifies the end of plain paragraphs. Must not include capturing parenthesis
*/
  WikiParser.prototype.parseBlock = function (terminatorRegExpString) {
    var terminatorRegExp = terminatorRegExpString
      ? new RegExp('(' + terminatorRegExpString + '|\\r?\\n\\r?\\n)', 'gm')
      : /(\r?\n\r?\n)/gm
    this.skipWhitespace()
    if (this.pos >= this.sourceLength) {
      return []
    }
    // Look for a block rule that applies at the current position
    var nextMatch = this.findNextMatch(this.blockRules, this.pos)
    if (nextMatch && nextMatch.matchIndex === this.pos) {
      return nextMatch.rule.parse()
    }
    // Treat it as a paragraph if we didn't find a block rule
    return [
      {
        type: 'element',
        tag: 'p',
        children: this.parseInlineRun(terminatorRegExp)
      }
    ]
  }

  /*
Parse a series of blocks of text until a terminating regexp is encountered or the end of the text
  terminatorRegExpString: terminating regular expression
*/
  WikiParser.prototype.parseBlocks = function (terminatorRegExpString) {
    if (terminatorRegExpString) {
      return this.parseBlocksTerminated(terminatorRegExpString)
    } else {
      return this.parseBlocksUnterminated()
    }
  }

  /*
Parse a block from the current position to the end of the text
*/
  WikiParser.prototype.parseBlocksUnterminated = function () {
    var tree = []
    while (this.pos < this.sourceLength) {
      tree.push.apply(tree, this.parseBlock())
    }
    return tree
  }

  /*
Parse blocks of text until a terminating regexp is encountered
*/
  WikiParser.prototype.parseBlocksTerminated = function (
    terminatorRegExpString
  ) {
    var terminatorRegExp = new RegExp('(' + terminatorRegExpString + ')', 'gm')
    var tree = []
    // Skip any whitespace
    this.skipWhitespace()
    //  Check if we've got the end marker
    terminatorRegExp.lastIndex = this.pos
    var match = terminatorRegExp.exec(this.source)
    // Parse the text into blocks
    while (
      this.pos < this.sourceLength &&
      !(match && match.index === this.pos)
    ) {
      var blocks = this.parseBlock(terminatorRegExpString)
      tree.push.apply(tree, blocks)
      // Skip any whitespace
      this.skipWhitespace()
      //  Check if we've got the end marker
      terminatorRegExp.lastIndex = this.pos
      match = terminatorRegExp.exec(this.source)
    }
    if (match && match.index === this.pos) {
      this.pos = match.index + match[0].length
    }
    return tree
  }

  /*
Parse a run of text at the current position
  terminatorRegExp: a regexp at which to stop the run
  options: see below
Options available:
  eatTerminator: move the parse position past any encountered terminator (default false)
*/
  WikiParser.prototype.parseInlineRun = function (terminatorRegExp, options) {
    if (terminatorRegExp) {
      return this.parseInlineRunTerminated(terminatorRegExp, options)
    } else {
      return this.parseInlineRunUnterminated(options)
    }
  }

  WikiParser.prototype.parseInlineRunUnterminated = function (options) {
    var tree = []
    // Find the next occurrence of an inline rule
    var nextMatch = this.findNextMatch(this.inlineRules, this.pos)
    // Loop around the matches until we've reached the end of the text
    while (this.pos < this.sourceLength && nextMatch) {
      // Process the text preceding the run rule
      if (nextMatch.matchIndex > this.pos) {
        this.pushTextWidget(
          tree,
          this.source.substring(this.pos, nextMatch.matchIndex)
        )
        this.pos = nextMatch.matchIndex
      }
      // Process the run rule
      tree.push.apply(tree, nextMatch.rule.parse())
      // Look for the next run rule
      nextMatch = this.findNextMatch(this.inlineRules, this.pos)
    }
    // Process the remaining text
    if (this.pos < this.sourceLength) {
      this.pushTextWidget(tree, this.source.substr(this.pos))
    }
    this.pos = this.sourceLength
    return tree
  }

  WikiParser.prototype.parseInlineRunTerminated = function (
    terminatorRegExp,
    options
  ) {
    options = options || {}
    var tree = []
    // Find the next occurrence of the terminator
    terminatorRegExp.lastIndex = this.pos
    var terminatorMatch = terminatorRegExp.exec(this.source)
    // Find the next occurrence of a inlinerule
    var inlineRuleMatch = this.findNextMatch(this.inlineRules, this.pos)
    // Loop around until we've reached the end of the text
    while (
      this.pos < this.sourceLength &&
      (terminatorMatch || inlineRuleMatch)
    ) {
      // Return if we've found the terminator, and it precedes any inline rule match
      if (terminatorMatch) {
        if (
          !inlineRuleMatch ||
          inlineRuleMatch.matchIndex >= terminatorMatch.index
        ) {
          if (terminatorMatch.index > this.pos) {
            this.pushTextWidget(
              tree,
              this.source.substring(this.pos, terminatorMatch.index)
            )
          }
          this.pos = terminatorMatch.index
          if (options.eatTerminator) {
            this.pos += terminatorMatch[0].length
          }
          return tree
        }
      }
      // Process any inline rule, along with the text preceding it
      if (inlineRuleMatch) {
        // Preceding text
        if (inlineRuleMatch.matchIndex > this.pos) {
          this.pushTextWidget(
            tree,
            this.source.substring(this.pos, inlineRuleMatch.matchIndex)
          )
          this.pos = inlineRuleMatch.matchIndex
        }
        // Process the inline rule
        tree.push.apply(tree, inlineRuleMatch.rule.parse())
        // Look for the next inline rule
        inlineRuleMatch = this.findNextMatch(this.inlineRules, this.pos)
        // Look for the next terminator match
        terminatorRegExp.lastIndex = this.pos
        terminatorMatch = terminatorRegExp.exec(this.source)
      }
    }
    // Process the remaining text
    if (this.pos < this.sourceLength) {
      this.pushTextWidget(tree, this.source.substr(this.pos))
    }
    this.pos = this.sourceLength
    return tree
  }

  /*
Push a text widget onto an array, respecting the configTrimWhiteSpace setting
*/
  WikiParser.prototype.pushTextWidget = function (array, text) {
    if (this.configTrimWhiteSpace) {
      text = $tw.utils.trim(text)
    }
    if (text) {
      array.push({ type: 'text', text: text })
    }
  }

  /*
Parse zero or more class specifiers `.classname`
*/
  /*eslint no-useless-escape: "off"*/
  WikiParser.prototype.parseClasses = function () {
    var classRegExp = /\.([^\s\.]+)/gm
    var classNames = []
    classRegExp.lastIndex = this.pos
    var match = classRegExp.exec(this.source)
    while (match && match.index === this.pos) {
      this.pos = match.index + match[0].length
      classNames.push(match[1])
      match = classRegExp.exec(this.source)
    }
    return classNames
  }

  /*
Amend the rules used by this instance of the parser
  type: `only` keeps just the named rules, `except` keeps all but the named rules
  names: array of rule names
*/
  WikiParser.prototype.amendRules = function (type, names) {
    names = names || []
    // Define the filter function
    var keepFilter
    if (type === 'only') {
      keepFilter = function (name) {
        return names.indexOf(name) !== -1
      }
    } else if (type === 'except') {
      keepFilter = function (name) {
        return names.indexOf(name) === -1
      }
    } else {
      return
    }
    // Define a function to process each of our rule arrays
    var processRuleArray = function (ruleArray) {
      for (var t = ruleArray.length - 1; t >= 0; t--) {
        if (!keepFilter(ruleArray[t].rule.name)) {
          ruleArray.splice(t, 1)
        }
      }
    }
    // Process each rule array
    processRuleArray(this.pragmaRules)
    processRuleArray(this.blockRules)
    processRuleArray(this.inlineRules)
  }

  exports['text/vnd.tiddlywiki'] = WikiParser
})()
