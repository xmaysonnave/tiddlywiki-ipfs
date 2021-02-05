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
    const content = await ipfsBundle.ls(api, '/ipfs/QmR5LHKiUaD9zFQHb75i3Uab3ehh5KHJm1GaifPzJR5nzK')
    expect(content.size).to.equal(3)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key.toString())
      if (cidV0.toString() === 'QmVFTC717mvmnyEMjdrdb62zjkBmdkZ1BqFSmaUa3mbGtF') {
        expect(value.name).to.equal('favicon.png')
        expect(value.path).to.equal('QmR5LHKiUaD9zFQHb75i3Uab3ehh5KHJm1GaifPzJR5nzK/favicon.png')
        expect(value.size).to.equal(4286)
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmUkbXzrWogq8KbUTiTK3ewSjNHRVb65YhTT31R3FrpyLb') {
        expect(value.name).to.equal('index.html')
        expect(value.path).to.equal('QmR5LHKiUaD9zFQHb75i3Uab3ehh5KHJm1GaifPzJR5nzK/index.html')
        expect(value.size).to.equal(2667491)
        expect(value.type).to.equal('file')
      }
      if (cidV0.toString() === 'QmX957wtD8CtH99oEzGiPNcmaGGHG6vFjpAzqe7Xtqg2jn') {
        expect(value.name).to.equal('index.html_build.tid')
        expect(value.path).to.equal('QmR5LHKiUaD9zFQHb75i3Uab3ehh5KHJm1GaifPzJR5nzK/index.html_build.tid')
        expect(value.size).to.equal(598)
        expect(value.type).to.equal('file')
      }
    }
  })
  it('production directory', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmfEq9nRWGdFymxhgnC9H8L3zdPYuHbMhHYEwRJCAwiKFa/production/editions/bluelightav')
    expect(content.size).to.equal(3)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key.toString())
      if (cidV0.toString() === 'QmVFTC717mvmnyEMjdrdb62zjkBmdkZ1BqFSmaUa3mbGtF') {
        expect(value.name).to.equal('favicon.png')
        expect(value.path).to.equal('QmfEq9nRWGdFymxhgnC9H8L3zdPYuHbMhHYEwRJCAwiKFa/production/editions/bluelightav/favicon.png')
        expect(value.size).to.equal(4286)
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmUkbXzrWogq8KbUTiTK3ewSjNHRVb65YhTT31R3FrpyLb') {
        expect(value.name).to.equal('index.html')
        expect(value.path).to.equal('QmfEq9nRWGdFymxhgnC9H8L3zdPYuHbMhHYEwRJCAwiKFa/production/editions/bluelightav/index.html')
        expect(value.size).to.equal(2667491)
        expect(value.type).to.equal('file')
      }
      if (cidV0.toString() === 'QmX957wtD8CtH99oEzGiPNcmaGGHG6vFjpAzqe7Xtqg2jn') {
        expect(value.name).to.equal('index.html_build.tid')
        expect(value.path).to.equal('QmfEq9nRWGdFymxhgnC9H8L3zdPYuHbMhHYEwRJCAwiKFa/production/editions/bluelightav/index.html_build.tid')
        expect(value.size).to.equal(598)
        expect(value.type).to.equal('file')
      }
    }
  })

  after(async () => {
    await stop()
  })
})
