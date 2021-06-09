#!/usr/bin/env node
'use strict'

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fs = require('fs')
const { create: IpfsHttpClient } = require('ipfs-http-client')
const path = require('path')
const IpfsUtils = require('bin/ipfs-utils.js')
const ipfsUtils = new IpfsUtils()
const ipfsBundle = ipfsUtils.ipfsBundle
var child = []

const shortTimeout = 6000
const longTimeout = 4 * 60 * shortTimeout

async function processContent (apiParameters, publicGateway, parentDir) {
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
  // Client
  const api = IpfsHttpClient(apiParameters)
  // Process
  for (var i = 0; i < content.length; i++) {
    const contentPathname = parentDir !== undefined && parentDir !== null && parentDir.trim() !== '' ? `${parentDir}/${content[i]}` : `${content[i]}`
    const pathname = path.resolve(`./current/${contentPathname}`)
    if (fs.statSync(pathname).isDirectory()) {
      const childNode = await processContent(apiParameters, publicGateway, contentPathname)
      if (childNode !== undefined && childNode !== null) {
        const cidV1 = ipfsBundle.cidToCidV1(childNode.cid)
        links.push({
          Name: content[i],
          Tsize: childNode.size,
          Hash: cidV1,
        })
        const dagNode = await ipfsBundle.dagGet(api, cidV1, {
          localResolve: false,
          timeout: shortTimeout,
        })
        if (dagNode !== undefined && dagNode !== null && dagNode.value !== undefined && dagNode.value !== null) {
          if (dagNode.value.Links !== undefined && dagNode.value.Links !== null && dagNode.value.Links.length === 1) {
            child.push(`/ipfs/${cidV1}/${dagNode.value.Links[0].Name}`)
          }
        }
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
          var name = currentFile.slice(0, currentFile.length - '.html'.length)
          links.push({
            Name: name,
            Tsize: stat.CumulativeSize,
            Hash: cidV1,
          })
        } else {
          var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].sourceUri)
          var stat = await ipfsBundle.objectStat(api, cid, shortTimeout)
          var cidV1 = ipfsBundle.cidToCidV1(cid)
          const dagNode = await ipfsBundle.dagGet(api, cidV1, {
            localResolve: false,
            timeout: shortTimeout,
          })
          var name = null
          if (ipfsBundle.isDirectory(dagNode.value.Data)) {
            name = current.content[j].title
          } else {
            name = current.content[j].sourceUri.split('/').pop()
          }
          links.push({
            Name: name,
            Tsize: stat.CumulativeSize,
            Hash: cidV1,
          })
        }
        var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].tidUri)
        var stat = await ipfsBundle.objectStat(api, cid, shortTimeout)
        var cidV1 = ipfsBundle.cidToCidV1(cid)
        var name = current.content[j].tidUri.split('/').pop()
        links.push({
          Name: name,
          Tsize: stat.CumulativeSize,
          Hash: cidV1,
        })
      }
    }
  }
  var node = await ipfsUtils.dagPut(api, links)
  var linksNodeCid = ipfsBundle.cidToCidV1(node.cid)
  if (current !== null) {
    node = await ipfsUtils.dagPut(api, [
      {
        Name: current.build,
        Tsize: node.size,
        Hash: linksNodeCid,
      },
    ])
    var buildNodeCid = ipfsBundle.cidToCidV1(node.cid)
    current.buildUri = `${publicGateway}${buildNodeCid}/${current.build}/`
    fs.writeFileSync(currentPathname, beautify(current, null, 2, 80), 'utf8')
  }
  return node
}

module.exports = async function main (load) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  child.length = 0
  // build
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
  const apiParameters = {
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: longTimeout,
  }
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}/ipfs/` : 'https://ipfs.infura.io/ipfs/'
  var publicGateway = process.env.IPFS_PUBLIC_GATEWAY ? `${process.env.IPFS_PUBLIC_GATEWAY}/ipfs/` : null
  if (publicGateway == null) {
    publicGateway = 'https://dweb.link/ipfs/'
  }
  console.log('***')
  console.log(`*** Upload build:
 api: ${apiUrl} ***`)
  const node = await processContent(apiParameters, publicGateway)
  build.child = child
  build.sourceSize = node.size
  build.sourceUri = `${publicGateway}${node.cid}/`
  fs.writeFileSync(`./current/build.json`, beautify(build, null, 2, 80), 'utf8')
  console.log(`*** Uploaded build:
 ${gateway}${node.cid} ***`)
}
