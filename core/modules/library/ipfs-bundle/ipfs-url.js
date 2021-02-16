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
  base = base !== undefined && base !== null && base.toString().trim() !== '' ? base.toString().trim() : null
  var url = null
  if (base == null) {
    return {
      cid: null,
      ipnsIdentifier: null,
      base: this.getIpfsBaseUrl(),
    }
  }
  try {
    url = this.getUrl(base)
  } catch (error) {
    return {
      cid: null,
      ipnsIdentifier: null,
      base: this.getIpfsBaseUrl(),
    }
  }
  // Parse
  var { cid, hostname, ipnsIdentifier } = this.ipfsBundle.getIpfsIdentifier(base)
  if (hostname === undefined || hostname == null || hostname.trim() === '') {
    return {
      cid: null,
      ipnsIdentifier: null,
      base: url,
    }
  }
  const host = url.port ? `${hostname}:${url.port}` : hostname
  return {
    cid: cid,
    ipnsIdentifier: ipnsIdentifier,
    base: this.getUrl(`${url.protocol}//${host}`),
  }
}

IpfsUrl.prototype.normalizeUrl = function (value, base) {
  value = value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : null
  if (value == null) {
    return null
  }
  var url = null
  var { base } = this.getBase(base)
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
  var credential = ''
  var hash = ''
  var search = ''
  if (url == null) {
    url = this.getUrl(value, base)
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    hash = url.hash
    search = url.search
  } else if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
    var pathname = null
    const protocol = url.protocol.slice(0, -1)
    if (url.hostname !== undefined && url.hostname !== null && url.hostname.trim() !== '') {
      if (url.pathname.startsWith('//')) {
        pathname = `/${protocol}/${url.hostname}/${url.pathname.slice(2)}`
      } else {
        pathname = `/${protocol}/${url.hostname}${url.pathname}`
      }
    } else if (url.pathname !== undefined && url.pathname !== null && url.pathname.trim() !== '') {
      if (url.pathname.startsWith('//')) {
        pathname = `/${protocol}/${url.pathname.slice(2)}`
      } else {
        pathname = `/${protocol}${url.pathname}`
      }
    }
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    hash = url.hash
    search = url.search
    url = this.getUrl(`${base.protocol}//${credential}${base.host}${pathname}${search}${hash}`)
  } else {
    var { cid, ipnsIdentifier, base } = this.getBase(url)
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    hash = url.hash
    search = url.search
    if (cid == null && ipnsIdentifier == null) {
      url = this.getUrl(`${base.protocol}//${credential}${base.host}${url.pathname}${search}${hash}`)
    } else if (cid !== null) {
      url = this.getUrl(`${base.protocol}//${credential}${base.host}/ipfs/${cid}${url.pathname}${search}${hash}`)
    } else {
      url = this.getUrl(`${base.protocol}//${credential}${base.host}/ipns/${ipnsIdentifier}${url.pathname}${search}${hash}`)
    }
  }
  if (url.hostname.endsWith('.eth.link')) {
    const hostname = url.hostname.substring(0, url.hostname.indexOf('.link'))
    const host = url.port ? `${hostname}:${url.port}` : hostname
    url = this.getUrl(`${url.protocol}//${credential}${host}${url.pathname}${search}${hash}`)
  }
  return url
}

exports.IpfsUrl = IpfsUrl
