/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const fs = require('fs')
const fse = require('fs-extra')
const IPFS = require('ipfs')
const Repo = require('ipfs-repo')
const chai = require('chai')
const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const { expect } = chai

async function start () {
  fs.rmSync('.ipfs', { recursive: true, force: true })
  fse.copySync('tests/repo', '.ipfs')
  api = await IPFS.create({
    repo: new Repo('.ipfs'),
  })
}

async function stop () {
  await api.stop()
}

const ipfsBundle = new IpfsBundle()

var api = null

before(() => {
  ipfsBundle.init()
})

describe('bluelightav', () => {
  before(async () => {
    await start()
  })
  it('bluelightav directory', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmRtR1pXm1L7wQSeAPmKrLBDJEZAizEHYiLorjtT8nzEQ9')
    expect(content.size).to.equal(3)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmVFTC717mvmnyEMjdrdb62zjkBmdkZ1BqFSmaUa3mbGtF') {
        expect(value.name).to.equal('favicon.png')
        expect(value.path).to.equal('QmRtR1pXm1L7wQSeAPmKrLBDJEZAizEHYiLorjtT8nzEQ9/favicon.png')
        expect(value.size).to.equal(4286)
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'Qmf8BuFQmoN9ssC5mA34RbjGiuMXkedxHgybB3usCxqUKC') {
        expect(value.name).to.equal('index.html')
        expect(value.path).to.equal('QmRtR1pXm1L7wQSeAPmKrLBDJEZAizEHYiLorjtT8nzEQ9/index.html')
        expect(value.size).to.equal(2667491)
        expect(value.type).to.equal('file')
      }
      if (cidV0.toString() === 'QmT8LimRir6VV23U3ZbUFSMi3UkK26ah7uEDFfcV7LbRVg') {
        expect(value.name).to.equal('index.html_build.tid')
        expect(value.path).to.equal('QmRtR1pXm1L7wQSeAPmKrLBDJEZAizEHYiLorjtT8nzEQ9/index.html_build.tid')
        expect(value.size).to.equal(598)
        expect(value.type).to.equal('file')
      }
    }
  })
  it('production directory', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmWUmVd5ye2T4pFwhhq1qBX5B1RbmRey8w5qvD4whivp9V/production/editions/bluelightav')
    expect(content.size).to.equal(3)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmVFTC717mvmnyEMjdrdb62zjkBmdkZ1BqFSmaUa3mbGtF') {
        expect(value.name).to.equal('favicon.png')
        expect(value.path).to.equal('QmWUmVd5ye2T4pFwhhq1qBX5B1RbmRey8w5qvD4whivp9V/production/editions/bluelightav/favicon.png')
        expect(value.size).to.equal(4286)
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'Qmf8BuFQmoN9ssC5mA34RbjGiuMXkedxHgybB3usCxqUKC') {
        expect(value.name).to.equal('index.html')
        expect(value.path).to.equal('QmWUmVd5ye2T4pFwhhq1qBX5B1RbmRey8w5qvD4whivp9V/production/editions/bluelightav/index.html')
        expect(value.size).to.equal(2667491)
        expect(value.type).to.equal('file')
      }
      if (cidV0.toString() === 'QmT8LimRir6VV23U3ZbUFSMi3UkK26ah7uEDFfcV7LbRVg') {
        expect(value.name).to.equal('index.html_build.tid')
        expect(value.path).to.equal('QmWUmVd5ye2T4pFwhhq1qBX5B1RbmRey8w5qvD4whivp9V/production/editions/bluelightav/index.html_build.tid')
        expect(value.size).to.equal(598)
        expect(value.type).to.equal('file')
      }
    }
  })
  it('parent directory from file', async () => {
    const url = await ipfsBundle.normalizeUrl('/ipfs/QmfEq9nRWGdFymxhgnC9H8L3zdPYuHbMhHYEwRJCAwiKFa/production/editions/bluelightav/index.html')
    const cid = await ipfsBundle.getDirectoryIdentifier(api, url)
    const cidV0 = ipfsBundle.cidToBase58CidV0(cid)
    expect(cidV0.toString()).to.equal('QmR5LHKiUaD9zFQHb75i3Uab3ehh5KHJm1GaifPzJR5nzK')
  })

  after(async () => {
    await stop()
  })
})
