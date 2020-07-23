import root from 'window-or-global'
import { URL } from 'universal-url'
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
          return this.getUrl(base.toString())
        }
      }
    } catch (error) {
      base = this.getIpfsGatewayUrl()
    }
    return this.getUrl(`${base.protocol}//${base.host}`)
  }

  IpfsUrl.prototype.normalizeUrl = function (value, base) {
    value =
      value === undefined || value == null || value.toString().trim() === ''
        ? null
        : value.toString().trim()
    if (value == null) {
      return null
    }
    // Parse
    var text = false
    var url = null
    // Text or ENS
    try {
      url = this.getUrl(value)
    } catch (error) {
      if (
        value.startsWith('/') === false &&
        value.startsWith('./') === false &&
        value.startsWith('../') === false
      ) {
        text = true
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
      }
    }
    if (text) {
      return null
    }
    // Invalid URL, try to parse with a Base URL
    if (url == null) {
      url = this.getUrl(
        value,
        base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
      )
    } else if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
      if (url.protocol === 'ipns:') {
        if (
          url.hostname !== undefined &&
          url.hostname !== null &&
          url.hostname.trim().length > 0
        ) {
          url = this.getUrl(
            `/ipns/${url.hostname}`,
            base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
          )
        } else if (
          url.pathname !== undefined &&
          url.pathname !== null &&
          url.pathname.trim().length > 1 &&
          url.pathname.startsWith('//')
        ) {
          url = this.getUrl(
            `/ipns/${url.pathname.slice(2)}`,
            base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
          )
        }
      } else if (url.protocol === 'ipfs:') {
        if (
          url.hostname !== undefined &&
          url.hostname !== null &&
          url.hostname.trim().length > 0
        ) {
          url = this.getUrl(
            `/ipfs/${url.hostname}`,
            base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
          )
        } else if (
          url.pathname !== undefined &&
          url.pathname !== null &&
          url.pathname.trim().length > 1 &&
          url.pathname.startsWith('//')
        ) {
          url = this.getUrl(
            `/ipfs/${url.pathname.slice(2)}`,
            base !== undefined && base !== null ? base : this.getIpfsBaseUrl()
          )
        }
      }
    }
    // Remove .link from .eth.link
    if (url.hostname.endsWith('.eth.link')) {
      url.hostname = url.hostname.substring(0, url.hostname.indexOf('.link'))
    }
    return url
  }

  module.exports = IpfsUrl
})()
