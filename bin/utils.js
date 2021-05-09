#!/usr/bin/env node
'use strict'

const fetch = require('node-fetch')
const { pipeline } = require('stream')
const { promisify } = require('util')

async function loadFromIpfs (url, timeout, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  var options = null
  timeout = timeout !== undefined && timeout !== null ? timeout : 4 * 60 * 4000
  const optionsController = new AbortController()
  const optionsId = setTimeout(() => optionsController.abort(), timeout)
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
  var fetchHeaders = {
    'Accept-Encoding': 'identity;q=0", *;q=0',
  }
  try {
    var params = {
      method: 'options',
      signal: optionsController.signal,
    }
    options = await fetch(url, params)
    if (options === undefined || options == null || options.ok === false) {
      throw new Error(`Unexpected response ${options.statusText}`)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`*** Timeout exceeded: ${timeout} ms ***`)
    } else {
      console.error(`*** Options error: ${error.message} ***`)
    }
  }
  globalThis.clearTimeout(optionsId)
  try {
    const responseController = new AbortController()
    const responseId = setTimeout(() => responseController.abort(), timeout)
    // https://fetch.spec.whatwg.org/#cors-safelisted-method
    // https://fetch.spec.whatwg.org/#cors-safelisted-request-header
    var params = {
      headers: fetchHeaders,
      method: 'get',
      mode: 'cors',
      signal: responseController.signal,
    }
    var newUrl = null
    if (options && options.ok && options.url) {
      newUrl = new URL(options.url)
    }
    if (options && options.ok && newUrl == null && options.headers.get('Location') !== undefined) {
      newUrl = new URL(options.headers.get('Location'))
    }
    if (newUrl == null) {
      newUrl = url
    }
    var response = await fetch(newUrl, params)
    globalThis.clearTimeout(responseId)
    if (response === undefined || response == null || response.ok === false) {
      throw new Error(`Unexpected response ${response.statusText}`)
    }
    if (stream !== undefined && stream !== null) {
      const streamPipeline = promisify(pipeline)
      await streamPipeline(response.body, stream)
      return
    }
    return await response.buffer()
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`*** Timeout exceeded: ${timeout} ms ***`)
    } else {
      console.error(`*** Fetch error: ${error.message} ***`)
    }
  }
  return null
}

module.exports = {
  loadFromIpfs,
}
