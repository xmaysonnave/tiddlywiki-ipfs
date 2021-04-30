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

IpfsUrl.prototype.filenamify = function (filename, options) {
  filename = filename !== undefined && filename !== null && filename.trim() !== '' ? filename.trim() : null
  if (filename === null) {
    throw new Error('Undefined filename...')
  }
  if (options === undefined || options == null) {
    options = { replacement: '_' }
  }
  return filenamify(filename, options)
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

IpfsUrl.prototype.resolveProtocol = function (value, base) {
  value = value !== undefined && value !== null && value.toString().trim() !== '' ? value : null
  if (value instanceof URL === false) {
    return value
  }
  if (value.protocol !== 'ipfs:' && value.protocol !== 'ipns:') {
    return value
  }
  if (base === undefined || base == null) {
    base = this.getIpfsBaseUrl()
  }
  var credential = ''
  var pathname = '/'
  const protocol = value.protocol.slice(0, -1)
  if (value.hostname !== undefined && value.hostname !== null && value.hostname.trim() !== '') {
    if (value.pathname.startsWith('//')) {
      pathname = `/${protocol}/${value.hostname}/${value.pathname.slice(2)}`
    } else {
      pathname = `/${protocol}/${value.hostname}${value.pathname}`
    }
  } else if (value.pathname !== undefined && value.pathname !== null && value.pathname.trim() !== '') {
    if (value.pathname.startsWith('//')) {
      pathname = `/${protocol}/${value.pathname.slice(2)}`
    } else {
      pathname = `/${protocol}${value.pathname}`
    }
  }
  if (value.username && value.password) {
    credential = `${value.username}:${value.password}@`
  }
  return this.getUrl(`${base.protocol}//${credential}${base.host}${pathname}${value.search}${value.hash}`)
}

IpfsUrl.prototype.getBase = function (base) {
  base = base !== undefined && base !== null && base.toString().trim() !== '' ? base.toString().trim() : null
  if (base == null) {
    base = this.getIpfsBaseUrl()
  }
  try {
    base = this.getUrl(base)
  } catch (error) {
    base = this.getIpfsBaseUrl()
  }
  // Resolve
  base = this.resolveProtocol(base)
  // Parse
  var { ipfsCid, hostname, ipnsIdentifier } = this.ipfsBundle.decodeHostname(base.hostname)
  if (hostname === undefined || hostname == null || hostname.trim() === '') {
    return {
      base: base,
      ipfsCid: null,
      ipnsIdentifier: null,
    }
  }
  var credential = ''
  const host = base.port ? `${hostname}:${base.port}` : hostname
  if (base.username && base.password) {
    credential = `${base.username}:${base.password}@`
  }
  const path = `${base.pathname}${base.search}${base.hash}`
  if (ipfsCid !== null || ipnsIdentifier !== null) {
    if (ipfsCid !== null) {
      base = this.getUrl(`${base.protocol}//${credential}${host}/ipfs/${ipfsCid}${path}`)
    } else {
      base = this.getUrl(`${base.protocol}//${credential}${host}/ipns/${ipnsIdentifier}${path}`)
    }
  } else {
    base = this.getUrl(`${base.protocol}//${credential}${host}${path}`)
  }
  return {
    base: base,
    ipfsCid: ipfsCid,
    ipnsIdentifier: ipnsIdentifier,
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
    } else if (value.startsWith('./') || value.startsWith('../')) {
      const origin = this.normalizeUrl(this.getDocumentUrl())
      const parent = origin.pathname.substring(0, origin.pathname.lastIndexOf('/'))
      value = `${parent}/${encodeURI(value)}`
    }
  }
  if (url == null) {
    url = this.getUrl(value, base)
  } else if (url.protocol === 'ipfs:' || url.protocol === 'ipns:') {
    url = this.resolveProtocol(url, base)
  } else {
    var credential = ''
    var { base, ipfsCid, ipnsIdentifier } = this.getBase(url)
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    if (ipfsCid == null && ipnsIdentifier == null) {
      url = this.getUrl(`${base.protocol}//${credential}${base.host}${url.pathname}${url.search}${url.hash}`)
    } else if (ipfsCid !== null) {
      url = this.getUrl(`${base.protocol}//${credential}${base.host}/ipfs/${ipfsCid}${url.pathname}${url.search}${url.hash}`)
    } else {
      url = this.getUrl(`${base.protocol}//${credential}${base.host}/ipns/${ipnsIdentifier}${url.pathname}${url.search}${url.hash}`)
    }
  }
  if (url.hostname.endsWith('.eth')) {
    const hostname = `${url.hostname}.link`
    const host = url.port ? `${hostname}:${url.port}` : hostname
    var credential = ''
    if (url.username && url.password) {
      credential = `${url.username}:${url.password}@`
    }
    url = this.getUrl(`${url.protocol}//${credential}${host}${url.pathname}${url.search}${url.hash}`)
  }
  return url
}

exports.IpfsUrl = IpfsUrl
