#!/usr/bin/env node
'use strict'

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const IpfsUtils = require('bin/ipfs-utils.js')
const ipfsUtils = new IpfsUtils()
const ipfsBundle = ipfsUtils.ipfsBundle
const child = []

async function processContent (apiUrl, gateway, publicGateway, parentPath) {
  parentPath = parentPath !== undefined && parentPath !== null && parentPath.trim() !== '' ? parentPath.trim() : '.'
  const currentDirPathname = path.resolve(`./current/${parentPath}`)
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
  const api = ipfsUtils.getApiClient(ipfsUtils.longTimeout, apiUrl)
  // Process
  for (var i = 0; i < content.length; i++) {
    const contentPathname = parentPath.trim() !== '' ? `${parentPath}/${content[i]}` : `${content[i]}`
    const pathname = path.resolve(`./current/${contentPathname}`)
    if (fs.statSync(pathname).isDirectory()) {
      const childNode = await processContent(apiUrl, gateway, publicGateway, contentPathname)
      if (childNode !== undefined && childNode !== null) {
        const cidV1 = ipfsBundle.cidToCidV1(childNode.cid)
        links.push({
          Name: content[i],
          Tsize: childNode.size,
          Hash: cidV1,
        })
        const dagNode = await ipfsBundle.dagGet(api, cidV1, {
          localResolve: false,
          timeout: ipfsUtils.shortTimeout,
        })
        if (dagNode !== undefined && dagNode !== null && dagNode.value !== undefined && dagNode.value !== null) {
          if (dagNode.value.Links !== undefined && dagNode.value.Links !== null && dagNode.value.Links.length === 1) {
            const path = `/ipfs/${cidV1}/${dagNode.value.Links[0].Name}`
            child.push({
              name: `${parentPath}/${content[i]}`,
              path: path,
            })
            console.log(`*** ${content[i]}:
 ${gateway}${path} ***`)
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
          var stat = await ipfsBundle.objectStat(api, cid, ipfsUtils.shortTimeout)
          var cidV1 = ipfsBundle.cidToCidV1(cid)
          var name = currentFile.slice(0, currentFile.length - '.html'.length)
          links.push({
            Name: name,
            Tsize: stat.CumulativeSize,
            Hash: cidV1,
          })
        } else {
          // Source
          var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].sourceUri)
          var stat = await ipfsBundle.objectStat(api, cid, ipfsUtils.shortTimeout)
          var cidV1 = ipfsBundle.cidToCidV1(cid)
          var dagNode = await ipfsBundle.dagGet(api, cidV1, {
            localResolve: false,
            timeout: ipfsUtils.shortTimeout,
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
          // Latest
          if (current.content[j].latestUri) {
            var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].latestUri)
            var stat = await ipfsBundle.objectStat(api, cid, ipfsUtils.shortTimeout)
            var cidV1 = ipfsBundle.cidToCidV1(cid)
            var dagNode = await ipfsBundle.dagGet(api, cidV1, {
              localResolve: false,
              timeout: ipfsUtils.shortTimeout,
            })
            var name = current.content[j].latestUri.split('/').pop()
            links.push({
              Name: name,
              Tsize: stat.CumulativeSize,
              Hash: cidV1,
            })
          }
        }
        // Tid
        var { cid } = await ipfsBundle.resolveIpfs(api, current.content[j].tidUri)
        var stat = await ipfsBundle.objectStat(api, cid, ipfsUtils.shortTimeout)
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
    current.buildUri = `${publicGateway}/ipfs/${buildNodeCid}/${current.build}/`
    fs.writeFileSync(currentPathname, ipfsUtils.getJson(current), 'utf8')
  }
  return node
}

module.exports = async function main () {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  require('events').EventEmitter.defaultMaxListeners = Infinity
  child.length = 0
  var api = ipfsUtils.getApiClient()
  const { build } = await ipfsUtils.loadBuild(api)
  var api = ipfsUtils.getApiClient(ipfsUtils.longTimeout)
  console.log(`*** Uploader: ${ipfsUtils.apiUrl} ***`)
  const node = await processContent(ipfsUtils.apiUrl, ipfsUtils.gateway, ipfsUtils.publicGateway)
  build.buildChild = child
  build.sourceSize = node.size
  build.sourceUri = `${ipfsUtils.publicGateway}/ipfs/${node.cid}/`
  fs.writeFileSync(`./current/build.json`, ipfsUtils.getJson(build), 'utf8')
  console.log(`*** Uploader: ${ipfsUtils.gateway}/ipfs/${node.cid}/ ***`)
}
