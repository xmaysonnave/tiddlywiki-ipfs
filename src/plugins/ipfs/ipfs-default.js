/*\
title: $:/plugins/ipfs/ipfs-default.js
type: application/javascript
tags: $:/ipfs/core
module-type: utils

IPFS Default

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*
   * Retrieve ipfs saver export protocol with default value if applicable
   */
  exports.getIpfsExport = function () {
    var output = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/export')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        output = text
      }
    }
    if (output == null) {
      output = $tw.utils.getIpfsDefaultExport()
    }
    return output
  }

  /*
   * Default Export
   */
  exports.getIpfsDefaultExport = function () {
    return 'json'
  }

  /*
   * Retrieve ipfs saver protocol with default value if applicable
   */
  exports.getIpfsProtocol = function () {
    var protocol = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/protocol')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        protocol = text
      }
    }
    if (protocol == null) {
      protocol = $tw.utils.getIpfsDefaultProtocol()
    }
    return protocol
  }

  /*
   * Default Protocol
   */
  exports.getIpfsDefaultProtocol = function () {
    return 'ipfs'
  }

  /*
   * Retrieve ipfs saver api url with default value if applicable
   */
  exports.getIpfsSaverApiUrl = function () {
    var api = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/api')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        api = text
      }
    }
    if (api !== null) {
      tiddler = $tw.wiki.getTiddler(api)
      if (tiddler !== undefined && tiddler !== null) {
        var text = tiddler.getFieldString('text')
        text =
          text === undefined || text == null || text.trim() === ''
            ? null
            : text.trim()
        if (text !== null) {
          api = text
        }
      }
    }
    if (api == null) {
      api = $tw.ipfs.getIpfsDefaultApi()
    }
    return api
  }

  /*
   * Retrieve ipfs saver gateway url with default value if applicable
   */
  exports.getIpfsSaverGatewayUrl = function () {
    var gateway = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/gateway')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        gateway = text
      }
    }
    if (gateway !== null) {
      tiddler = $tw.wiki.getTiddler(gateway)
      if (tiddler !== undefined && tiddler !== null) {
        var text = tiddler.getFieldString('text')
        text =
          text === undefined || text == null || text.trim() === ''
            ? null
            : text.trim()
        if (text !== null) {
          gateway = text
        }
      }
    }
    if (gateway == null) {
      gateway = $tw.ipfs.getIpfsDefaultGateway()
    }
    return gateway
  }

  /*
   * Retrieve ipfs saver ens domain with default value if applicable
   */
  exports.getIpfsEnsDomain = function () {
    var ensDomain = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ens/domain')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        ensDomain = text
      }
    }
    return ensDomain
  }

  /*
   * Retrieve ipfs saver ipns name with default value if applicable
   */
  exports.getIpfsIpnsName = function () {
    var ipnsName = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/name')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        ipnsName = text
      }
    }
    return ipnsName
  }

  /*
   * Retrieve ipfs saver ipns key with default value if applicable
   */
  exports.getIpfsIpnsKey = function () {
    var ipnsKey = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/ipns/key')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        ipnsKey = text
      }
    }
    return ipnsKey
  }

  /*
   * Retrieve ipfs saver verbose with default value if applicable
   */
  exports.getIpfsVerbose = function () {
    var verbose = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/verbose')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        verbose = text
      }
    }
    if (verbose == null) {
      verbose = true // default, see ipfs-saver.tid
    } else {
      verbose = verbose === 'yes'
    }
    return verbose
  }

  /*
   * Retrieve ipfs saver unpin with default value if applicable
   */
  exports.getIpfsUnpin = function () {
    var unpin = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/unpin')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        unpin = text
      }
    }
    if (unpin == null) {
      unpin = false // default, see ipfs-saver.tid
    } else {
      unpin = unpin === 'yes'
    }
    return unpin
  }

  /*
   * Retrieve ipfs saver url policy with default value if applicable
   */
  exports.getIpfsUrlPolicy = function () {
    var policy = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/policy')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        policy = text
      }
    }
    if (policy == null) {
      policy = $tw.utils.getIpfsDefaultPolicy()
    }
    return policy
  }

  /*
   * Default Policy
   */
  exports.getIpfsDefaultPolicy = function () {
    return 'gateway'
  }

  /*
   * Retrieve ipfs saver provider with default value if applicable
   */
  exports.getIpfsProvider = function () {
    var provider = null
    var tiddler = $tw.wiki.getTiddler('$:/ipfs/saver/provider')
    if (tiddler !== undefined && tiddler !== null) {
      var text = tiddler.getFieldString('text')
      text =
        text === undefined || text == null || text.trim() === ''
          ? null
          : text.trim()
      if (text !== null) {
        provider = text
      }
    }
    if (provider == null) {
      provider = $tw.utils.getIpfsDefaultProvider()
    }
    return provider
  }

  /*
   * Default Provider
   */
  exports.getIpfsDefaultProvider = function () {
    return 'http'
  }
})()
