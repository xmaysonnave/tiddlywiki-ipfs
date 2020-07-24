import root from 'window-or-global'
import { URL } from 'whatwg-url'
;(function () {
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ipfs-url'

  var IpfsUrl = function () {}

  IpfsUrl.prototype.getLogger = function () {
    if (root.logger !== undefined && root.logger !== null) {
      return root.logger
    }
    return console
  }

  IpfsUrl.prototype.getIpfsDefaultApiUrl = function () {
    return new URL(this.getIpfsDefaultApi())
  }

  IpfsUrl.prototype.getIpfsDefaultGatewayUrl = function () {
    return new URL(this.getIpfsDefaultGateway())
  }

  IpfsUrl.prototype.getIpfsApiUrl = function () {
    try {
      return this.getUrl($tw.utils.getIpfsSaverApiUrl())
    } catch (error) {
      return this.getIpfsDefaultApiUrl()
    }
  }

  IpfsUrl.prototype.getIpfsGatewayUrl = function () {
    try {
      return this.getUrl($tw.utils.getIpfsSaverGatewayUrl())
    } catch (error) {
      return this.getIpfsDefaultGatewayUrl()
    }
  }

  IpfsUrl.prototype.getIpfsDefaultApi = function () {
    return 'https://ipfs.infura.io:5001'
  }

  IpfsUrl.prototype.getIpfsDefaultGateway = function () {
    return 'https://ipfs.infura.io'
  }

  /**
   * url.href;
   * url.origin
   * url.protocol;
   * url.username;
   * url.password;
   * url.host;
   * url.hostname;
   * url.port;
   * url.pathname;
   * url.search;
   * url.hash;
   * https://jsdom.github.io/whatwg-url/
   * https://github.com/stevenvachon/universal-url
   * https://github.com/stevenvachon/universal-url-lite
   * https://url.spec.whatwg.org/
   */
  IpfsUrl.prototype.getDocumentUrl = function () {
    try {
      return new URL(root.location.href)
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Invalid current HTML Document URL...')
  }

  IpfsUrl.prototype.getUrl = function (url, base) {
    try {
      if (url instanceof URL) {
        return new URL(url.href, base)
      }
      return new URL(url, base)
    } catch (error) {
      // Ignore
    }
    throw new Error('Invalid URL...')
  }

  IpfsUrl.prototype.getIpfsBaseUrl = function () {
    var base = this.getIpfsGatewayUrl()
    try {
      if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
        base = this.getDocumentUrl()
        if (base.protocol === 'file:') {
          return this.getUrl(base)
        }
      }
    } catch (error) {
      base = this.getIpfsGatewayUrl()
    }
    const port =
      base.port !== undefined && base.port !== null ? `:${base.port}` : ''
    return this.getUrl(`${base.protocol}//${base.host}${port}`)
  }

  IpfsUrl.prototype.normalizeUrl = function (value, base) {
    value =
      value === undefined || value == null || value.toString().trim() === ''
        ? null
        : value.toString().trim()
    if (value == null) {
      return null
    }
    base = this.getUrl(
      base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
    )
    // Parse
    var url = null
    // Text or URL
    try {
      url = this.getUrl(value)
    } catch (error) {
      if (
        value.startsWith('/') === false &&
        value.startsWith('./') === false &&
        value.startsWith('../') === false
      ) {
        var text = true
        try {
          url = this.getUrl(`https://${value}`)
          if (
            url.hostname.endsWith('.eth') === false &&
            url.hostname.endsWith('.eth.link') === false
          ) {
            url = null
          } else {
            text = false
          }
        } catch (error) {
          // ignore
        }
        if (text) {
          return null
        }
      }
    }
    // Invalid URL, try to parse with a Base URL
    if (url == null) {
      url = this.getUrl(value, base)
    } else if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
      if (url.protocol === 'ipns:') {
        if (
          url.hostname !== undefined &&
          url.hostname !== null &&
          url.hostname.trim().length > 0
        ) {
          base.pathname = `/ipns/${url.hostname}`
        }
      } else {
        if (
          url.hostname !== undefined &&
          url.hostname !== null &&
          url.hostname.trim().length > 0
        ) {
          base.pathname = `/ipfs/${url.hostname}`
        }
      }
      // Unable to set url protocol
      base.username = url.username
      base.password = url.password
      base.search = url.search
      base.hash = url.hash
      url = base
    }
    // Remove .link from .eth.link
    if (url.hostname.endsWith('.eth.link')) {
      url.hostname = url.hostname.substring(0, url.hostname.indexOf('.link'))
    }
    return url
  }

  module.exports = IpfsUrl
})()
