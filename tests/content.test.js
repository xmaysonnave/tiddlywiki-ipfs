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
 * https://infura.io/docs
 * https://cid.ipfs.io
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

describe('directory', () => {
  before(async () => {
    await start()
  })
  it('bluelightav', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmVCxrRp1Ne8VvwpcRVdD8P1YAoC97x6AMyRzARA9EMLme') // bafybeidgbgwuuhexlqw2ppuwhcykazem7hmpuz7okk4izxnjsjddqq7m7e
    expect(content.size).to.equal(3)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmVFTC717mvmnyEMjdrdb62zjkBmdkZ1BqFSmaUa3mbGtF') {
        // bafybeidgvtq34hdbdgcbx2ksat5iguhdtawjpw7w3raiuxxuhstyz7ckza
        expect(value.name).to.equal('favicon.png')
        expect(value.path).to.equal('QmVCxrRp1Ne8VvwpcRVdD8P1YAoC97x6AMyRzARA9EMLme/favicon.png')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmWdgVLZ689LPrmdbRcJa1TY6wr8Ye2gxBcGagKg6Jv3Ff') {
        // bafybeid3hjq3hlnqzceeuvafmptemapmzsbz3mtxkcf63qqz5t4otlox2i
        expect(value.name).to.equal('index.html')
        expect(value.path).to.equal('QmVCxrRp1Ne8VvwpcRVdD8P1YAoC97x6AMyRzARA9EMLme/index.html')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmaB1cfwVC7fh31xXq4eM89uWxMB56pAxnyP5bQgTTW4mF') {
        // bafybeifp2qjoqtb3t4dyc6pdzqroggays2s7w4cpgvy7yozs4yaq5ggfdi
        expect(value.name).to.equal('index.html_build.tid')
        expect(value.path).to.equal('QmVCxrRp1Ne8VvwpcRVdD8P1YAoC97x6AMyRzARA9EMLme/index.html_build.tid')
        expect(value.type).to.equal('file')
      }
    }
  })
  it('production', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav')
    expect(content.size).to.equal(3)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmVFTC717mvmnyEMjdrdb62zjkBmdkZ1BqFSmaUa3mbGtF') {
        expect(value.name).to.equal('favicon.png')
        expect(value.path).to.equal('QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav/favicon.png')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmWdgVLZ689LPrmdbRcJa1TY6wr8Ye2gxBcGagKg6Jv3Ff') {
        expect(value.name).to.equal('index.html')
        expect(value.path).to.equal('QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav/index.html')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmaB1cfwVC7fh31xXq4eM89uWxMB56pAxnyP5bQgTTW4mF') {
        expect(value.name).to.equal('index.html_build.tid')
        expect(value.path).to.equal('QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav/index.html_build.tid')
        expect(value.type).to.equal('file')
      }
    }
  })
  after(async () => {
    await stop()
  })
})

describe('resolve', () => {
  before(async () => {
    await start()
  })
  it('no ipfs', async () => {
    const url = await ipfsBundle.normalizeUrl('https://tiddlywiki.com')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid).to.equal(null)
    expect(remainderPath).to.equal('')
  })
  it('root directory', async () => {
    const url = await ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeia6r5jklgmenmhly5lwfri24yqs4os4e3pa5apnrxqhpvjt22b4bm')
    expect(remainderPath).to.equal('')
  })
  it('subdomain root directory', async () => {
    const url = await ipfsBundle.normalizeUrl('https://bafybeia6r5jklgmenmhly5lwfri24yqs4os4e3pa5apnrxqhpvjt22b4bm.ipfs.dweb.link')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeia6r5jklgmenmhly5lwfri24yqs4os4e3pa5apnrxqhpvjt22b4bm')
    expect(remainderPath).to.equal('')
  })
  it('wrapped directory', async () => {
    const url = await ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeidgbgwuuhexlqw2ppuwhcykazem7hmpuz7okk4izxnjsjddqq7m7e')
    expect(remainderPath).to.equal('')
  })
  it('wrapped directory from file', async () => {
    const url = await ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav/index.html')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeid3hjq3hlnqzceeuvafmptemapmzsbz3mtxkcf63qqz5t4otlox2i')
    expect(remainderPath).to.equal('')
  })
  after(async () => {
    await stop()
  })
})

describe('container', () => {
  before(async () => {
    await start()
  })
  it('no ipfs', async () => {
    const url = await ipfsBundle.normalizeUrl('https://tiddlywiki.com')
    const ipfsPath = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(ipfsPath).to.equal(null)
  })
  it('root directory', async () => {
    const url = await ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/')
    const ipfsPath = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(ipfsPath).to.equal('/ipfs/bafybeia6r5jklgmenmhly5lwfri24yqs4os4e3pa5apnrxqhpvjt22b4bm')
  })
  it('subdomain root directory', async () => {
    const url = await ipfsBundle.normalizeUrl('https://bafybeia6r5jklgmenmhly5lwfri24yqs4os4e3pa5apnrxqhpvjt22b4bm.ipfs.dweb.link')
    const ipfsPath = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(ipfsPath).to.equal('/ipfs/bafybeia6r5jklgmenmhly5lwfri24yqs4os4e3pa5apnrxqhpvjt22b4bm')
  })
  it('wrapped directory', async () => {
    const url = await ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav')
    const ipfsPath = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(ipfsPath).to.equal('/ipfs/bafybeidgbgwuuhexlqw2ppuwhcykazem7hmpuz7okk4izxnjsjddqq7m7e')
  })
  it('wrapped directory from file', async () => {
    const url = await ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmQPwhKKH4Cta8jwXNwEJQ64vF5g9kZTJcYEToJTTZAnmQ/production/editions/bluelightav/index.html')
    const ipfsPath = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(ipfsPath).to.equal('/ipfs/bafybeidgbgwuuhexlqw2ppuwhcykazem7hmpuz7okk4izxnjsjddqq7m7e')
  })
  after(async () => {
    await stop()
  })
})
