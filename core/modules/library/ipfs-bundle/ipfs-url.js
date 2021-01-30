'use strict'

const filenamify = require('filenamify')

var IpfsUrl = function (ipfsBundle) {
  this.ipfsBundle = ipfsBundle
  /*eslint no-unused-vars:"off"*/
  this.name = 'ipfs-url'
}

IpfsUrl.prototype.getLogger = function () {
  return this.ipfsBundle.getLogger()
}

IpfsUrl.prototype.filenamify = function (name, options) {
  if (name === undefined || name == null || name.trim() === '') {
    throw new Error('Undefined name...')
  }
  return filenamify.replace(name, options)
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
  return 'https://dweb.link'
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
    return new URL(globalThis.location.href)
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
  if (url) {
    throw new Error('Invalid URL...')
  }
  throw new Error('Undefined URL...')
}

IpfsUrl.prototype.getIpfsBaseUrl = function () {
  var base = this.getIpfsGatewayUrl()
  try {
    if ($tw.utils.getIpfsUrlPolicy() === 'origin') {
      base = this.getDocumentUrl()
    }
  } catch (error) {
    base = this.getIpfsGatewayUrl()
  }
  return this.getUrl(base)
}

IpfsUrl.prototype.getBase = function (base) {
  base = base === undefined || base == null || base.toString().trim() === '' ? null : base.toString().trim()
  var url
  if (base == null) {
    return this.getIpfsBaseUrl()
  }
  try {
    url = this.getUrl(base)
  } catch (error) {
    return this.getIpfsBaseUrl()
  }
  // Parse
  var { cid, hostname, ipnsIdentifier, protocol } = this.ipfsBundle.decodeCid(base)
  if (hostname === undefined || hostname == null || hostname.trim() === '') {
    return url
  }
  if (!protocol || (!cid && !ipnsIdentifier)) {
    return url
  }
  if (protocol !== 'ipfs' && protocol !== 'ipfs:' && protocol !== 'ipns' && protocol !== 'ipns:') {
    return url
  }
  const host = url.port ? `${hostname}:${url.port}` : hostname
  return this.getUrl(`${url.protocol}//${host}`)
}

IpfsUrl.prototype.normalizeUrl = function (value, base) {
  value = value === undefined || value == null || value.toString().trim() === '' ? null : value.toString().trim()
  if (value == null) {
    return null
  }
  base = this.getBase(base)
  // Parse
  var url = null
  // Text or URL
  try {
    url = this.getUrl(value)
  } catch (error) {
    if (value.startsWith('/') === false && value.startsWith('./') === false && value.startsWith('../') === false) {
      var text = true
      try {
        url = this.getUrl(`https://${value}`)
        if (url.hostname.endsWith('.eth') === false && url.hostname.endsWith('.eth.link') === false) {
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
  var credential = ''
  var search = ''
  var hash = ''
  if (url == null) {
    // URL
    url = this.getUrl(value, base)
    // Credential
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    // Hash
    hash = url.hash
    // Search
    search = url.search
  } else if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
    // Protocol
    const protocol = url.protocol.slice(0, -1)
    // Pathname
    var pathname = null
    if (url.hostname !== undefined && url.hostname !== null && url.hostname.trim() !== '') {
      pathname = `/${protocol}/${url.hostname}`
    } else if (url.pathname !== undefined && url.pathname !== null && url.pathname.trim() !== '') {
      if (url.pathname.startsWith('//')) {
        pathname = `/${protocol}/${url.pathname.slice(2)}`
      } else {
        pathname = `/${protocol}/${url.pathname}`
      }
    }
    // Credential
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    // Hash
    hash = url.hash
    // Search
    search = url.search
    // URL
    url = this.getUrl(`${base.protocol}//${credential}${base.host}${pathname}${search}${hash}`)
  }
  // Remove .link from .eth.link
  if (url.hostname.endsWith('.eth.link')) {
    const hostname = url.hostname.substring(0, url.hostname.indexOf('.link'))
    var host = null
    if (url.port && url.port.trim() !== '') {
      host = `${hostname}:${url.port}`
    } else {
      host = hostname
    }
    // URL
    url = this.getUrl(`${base.protocol}//${credential}${host}${url.pathname}${search}${hash}`)
  }
  return url
}

exports.IpfsUrl = IpfsUrl
