#!/usr/bin/env node
'use strict'

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const beautify = require('json-beautify')
const CID = require('cids')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const path = require('path')
const { pipeline } = require('stream')
const { promisify } = require('util')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

const shortTimeout = 6000
const longTimeout = 2 * 60 * shortTimeout

async function loadFromIpfs (url, timeout, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  var options = {
    method: 'options',
    timeout: timeout !== undefined ? timeout : longTimeout,
  }
  var response = await fetch(url, options)
  if (response.ok === false) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  var options = {
    compress: false,
    method: 'get',
    size: 0,
    timeout: timeout !== undefined ? timeout : longTimeout,
  }
  const location = response.headers.get('Location')
  url = location !== undefined && location !== null ? new URL(location) : url
  var response = await fetch(url, options)
  if (response.ok === false) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  if (stream !== undefined && stream !== null) {
    const streamPipeline = promisify(pipeline)
    await streamPipeline(response.body, stream)
    return
  }
  return await response.buffer()
}

async function dagPut (api, links, timeout) {
  const dagNode = {
    Data: ipfsBundle.StringToUint8Array('\u0008\u0001'),
    Links: [],
  }
  if (links !== undefined && links !== null) {
    dagNode.Links = links
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : longTimeout
  const options = {
    format: 'dag-pb',
    hashAlg: 'sha2-256',
    pin: false,
    timeout: longTimeout,
  }
  return await ipfsBundle.dagPut(api, dagNode, options)
}

async function processContent (api, gateway, publicGateway, load, parentDir) {
  parentDir = parentDir !== undefined && parentDir !== null ? parentDir : ''
  const currentDirPathname = path.resolve(`./current/${parentDir}`)
  if (fs.existsSync(currentDirPathname) === false) {
    return null
  }
  if (fs.statSync(currentDirPathname).isDirectory() === false) {
    return null
  }
  var content = fs.readdirSync(currentDirPathname)
  var current = null
  var currentPathname = null
  const links = []
  // Process
  for (var i = 0; i < content.length; i++) {
    const contentPathname = parentDir !== undefined && parentDir !== null && parentDir.trim() !== '' ? `${parentDir}/${content[i]}` : `${content[i]}`
    const pathname = path.resolve(`./current/${contentPathname}`)
    if (fs.statSync(pathname).isDirectory()) {
      const childNode = await processContent(api, gateway, publicGateway, load, contentPathname)
      if (childNode !== undefined && childNode !== null) {
        const cidV1 = ipfsBundle.cidToCidV1(childNode.cid)
        links.push({
          Name: content[i],
          Tsize: childNode.size,
          Hash: cidV1,
        })
      }
    } else if (path.basename(pathname) === 'current.json') {
      current = JSON.parse(fs.readFileSync(pathname, 'utf8'))
      currentPathname = pathname
      if (current === undefined || current == null) {
        throw new Error(`Unknown current: ${pathname}`)
      }
      for (var j = 0; j < current.content.length; j++) {
        const currentFile = current.content[j].sourceUri.split('/').pop()
        if (currentFile.endsWith('.html')) {
          var cid = await ipfsBundle.resolveIpfsContainer(api, current.content[j].sourceUri)
          var stat = await ipfsBundle.objectStat(api, cid, shortTimeout)
          var cidV1 = ipfsBundle.cidToCidV1(cid)
          links.push({
            Name: currentFile.slice(0, currentFile.length - '.html'.length),
            Tsize: stat.CumutativeSize,
            Hash: new CID(cidV1),
          })
        } else {
          var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].sourceUri)
          var stat = await ipfsBundle.objectStat(api, cid, shortTimeout)
          var cidV1 = ipfsBundle.cidToCidV1(cid)
          const dagNode = await ipfsBundle.dagGet(api, cidV1, {
            localResolve: false,
            timeout: shortTimeout,
          })
          if (ipfsBundle.isDirectory(dagNode.value.Data)) {
            links.push({
              Name: current.content[j].title,
              Tsize: stat.CumutativeSize,
              Hash: new CID(cidV1),
            })
          } else {
            links.push({
              Name: current.content[j].sourceUri.split('/').pop(),
              Tsize: stat.CumutativeSize,
              Hash: new CID(cidV1),
            })
          }
        }
        var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].tidUri)
        var stat = await ipfsBundle.objectStat(api, cid, shortTimeout)
        var cidV1 = ipfsBundle.cidToCidV1(cid)
        links.push({
          Name: current.content[j].tidUri.split('/').pop(),
          Tsize: stat.CumutativeSize,
          Hash: new CID(cidV1),
        })
      }
    }
  }
  var node = await dagPut(api, links)
  var cidV1 = ipfsBundle.cidToCidV1(node.cid)
  if (load) {
    var uri = `${gateway}${cidV1}`
    console.log(`*** Fetch ***
 ${uri} ***`)
    await loadFromIpfs(uri)
  }
  if (current !== null) {
    node = await dagPut(api, [
      {
        Name: current.build,
        Tsize: node.size,
        Hash: new CID(cidV1),
      },
    ])
    var cidV1 = ipfsBundle.cidToCidV1(node.cid)
    current.buildUri = `${publicGateway}${cidV1}/${current.build}/`
    fs.writeFileSync(currentPathname, beautify(current, null, 2, 80), 'utf8')
    if (load) {
      var uri = `${gateway}${cidV1}`
      console.log(`*** Fetch ***
 ${uri} ***`)
      await loadFromIpfs(uri)
    }
  }
  return node
}

module.exports = async function main (load) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  ipfsBundle.init()
  // Raw build
  var build = {}
  const buildPath = `./current/build.json`
  if (fs.existsSync(buildPath)) {
    build = JSON.parse(fs.readFileSync(buildPath))
  }
  // Params
  load = load !== undefined && load !== null ? load : process.env.LOAD ? process.env.LOAD === 'true' || process.env.LOAD === true : true
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const api = IpfsHttpClient({
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: longTimeout,
  })
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}/ipfs/` : 'https://dweb.link/ipfs/'
  var publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? `${process.env.IPFS_PUBLIC_GATEWAY}/ipfs/` : null
  if (publicGateway == null) {
    publicGateway = gateway
  }
  console.log('***')
  console.log(`*** Upload build tree:
 api: ${apiUrl}
 gateway: ${new URL(gateway)}
 public gateway: ${new URL(publicGateway)} ***`)
  const node = await processContent(api, gateway, publicGateway, load)
  build.sourceSize = node.size
  build.sourceUri = `${publicGateway}${node.cid}/`
  fs.writeFileSync(`./current/build.json`, beautify(build, null, 2, 80), 'utf8')
  console.log(`*** Added build node:
 ipfs://${node.cid}/
 ${publicGateway}${node.cid}
 ${gateway}${node.cid}`)
}
