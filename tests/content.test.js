/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const fs = require('fs')
const fse = require('fs-extra')
const IPFS = require('ipfs')
const Repo = require('ipfs-repo')
const chai = require('chai')
const IpfsBundle = require('core/modules/library/ipfs-bundle.js').IpfsBundle

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
  it('bluelightav cidv0', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmP8LU6bAczGMpcyqLDcvdC9kXfStCq3ZTcPDbgbfJZTnr')
    expect(content.size).to.equal(2)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmaiRNricrY3oUhxgy599RidYzmc5ChJzuqWjkrELde1ij') {
        expect(key.toString()).to.equal('bafybeifx37ze6fizpleasf43v523flemel3grcrv7jqwnbkr7g2h7c2zdq')
        expect(value.name).to.equal('$_ipfs_edition-build.tid')
        expect(value.path).to.equal('QmP8LU6bAczGMpcyqLDcvdC9kXfStCq3ZTcPDbgbfJZTnr/$_ipfs_edition-build.tid')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmPxzdJHhbZDtqbM67RDJzPt2FwayMyzLfkdDHU2wYYATm') {
        expect(key.toString()).to.equal('bafybeiayfmo4yssrrytia6jinfuvwlo2nry3zv23vhymbkooep4oxuj5tq')
        expect(value.name).to.equal('bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.path).to.equal('QmP8LU6bAczGMpcyqLDcvdC9kXfStCq3ZTcPDbgbfJZTnr/bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.type).to.equal('file')
      }
    }
  })
  it('bluelightav cidv1', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/bafybeialwqlwrfzou222oop7eiufct2rm5s62mr5uyonr4mytumvvu7q3m')
    expect(content.size).to.equal(2)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmaiRNricrY3oUhxgy599RidYzmc5ChJzuqWjkrELde1ij') {
        expect(key.toString()).to.equal('bafybeifx37ze6fizpleasf43v523flemel3grcrv7jqwnbkr7g2h7c2zdq')
        expect(value.name).to.equal('$_ipfs_edition-build.tid')
        expect(value.path).to.equal('bafybeialwqlwrfzou222oop7eiufct2rm5s62mr5uyonr4mytumvvu7q3m/$_ipfs_edition-build.tid')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmPxzdJHhbZDtqbM67RDJzPt2FwayMyzLfkdDHU2wYYATm') {
        expect(key.toString()).to.equal('bafybeiayfmo4yssrrytia6jinfuvwlo2nry3zv23vhymbkooep4oxuj5tq')
        expect(value.name).to.equal('bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.path).to.equal('bafybeialwqlwrfzou222oop7eiufct2rm5s62mr5uyonr4mytumvvu7q3m/bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.type).to.equal('file')
      }
    }
  })
  it('production cidv0', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav')
    expect(content.size).to.equal(2)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmaiRNricrY3oUhxgy599RidYzmc5ChJzuqWjkrELde1ij') {
        expect(key.toString()).to.equal('bafybeifx37ze6fizpleasf43v523flemel3grcrv7jqwnbkr7g2h7c2zdq')
        expect(value.name).to.equal('$_ipfs_edition-build.tid')
        expect(value.path).to.equal('QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav/$_ipfs_edition-build.tid')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmPxzdJHhbZDtqbM67RDJzPt2FwayMyzLfkdDHU2wYYATm') {
        expect(key.toString()).to.equal('bafybeiayfmo4yssrrytia6jinfuvwlo2nry3zv23vhymbkooep4oxuj5tq')
        expect(value.name).to.equal('bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.path).to.equal('QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav/bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.type).to.equal('file')
      }
    }
  })
  it('production cidv1', async () => {
    const content = await ipfsBundle.ls(api, '/ipfs/bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq/production/editions/bluelightav')
    expect(content.size).to.equal(2)
    for (const [key, value] of content) {
      const cidV0 = ipfsBundle.cidToBase58CidV0(key)
      if (cidV0.toString() === 'QmaiRNricrY3oUhxgy599RidYzmc5ChJzuqWjkrELde1ij') {
        expect(key.toString()).to.equal('bafybeifx37ze6fizpleasf43v523flemel3grcrv7jqwnbkr7g2h7c2zdq')
        expect(value.name).to.equal('$_ipfs_edition-build.tid')
        expect(value.path).to.equal('bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq/production/editions/bluelightav/$_ipfs_edition-build.tid')
        expect(value.type).to.equal('file')
      } else if (cidV0.toString() === 'QmPxzdJHhbZDtqbM67RDJzPt2FwayMyzLfkdDHU2wYYATm') {
        expect(key.toString()).to.equal('bafybeiayfmo4yssrrytia6jinfuvwlo2nry3zv23vhymbkooep4oxuj5tq')
        expect(value.name).to.equal('bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html')
        expect(value.path).to.equal(
          'bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq/production/editions/bluelightav/bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html'
        )
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
    const url = ipfsBundle.normalizeUrl('https://tiddlywiki.com')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid).to.equal(null)
    expect(remainderPath).to.equal('')
  })
  it('root directory', async () => {
    const url = ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq')
    expect(remainderPath).to.equal('')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('subdomain root directory', async () => {
    const url = ipfsBundle.normalizeUrl('https://bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq.ipfs.dweb.link')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq')
    expect(remainderPath).to.equal('')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('directory', async () => {
    const url = ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeialwqlwrfzou222oop7eiufct2rm5s62mr5uyonr4mytumvvu7q3m')
    expect(remainderPath).to.equal('')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('file', async () => {
    const url = ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav/$_ipfs_edition-build.tid')
    const { cid, remainderPath } = await ipfsBundle.resolveIpfs(api, url)
    expect(cid.toString()).to.equal('bafybeifx37ze6fizpleasf43v523flemel3grcrv7jqwnbkr7g2h7c2zdq')
    expect(remainderPath).to.equal('')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.false
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
    const url = ipfsBundle.normalizeUrl('https://tiddlywiki.com')
    const cid = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(cid).to.equal(null)
  })
  it('root directory', async () => {
    const url = ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/')
    const cid = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(cid.toString()).to.equal('bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('subdomain root directory', async () => {
    const url = ipfsBundle.normalizeUrl('https://bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq.ipfs.dweb.link')
    const cid = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(cid.toString()).to.equal('bafybeicgsbnsd7wupeg2r2vivpduehqldx4e2nlq3c6namdaolv5dsfppq')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('wrapped directory', async () => {
    const url = ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav')
    const cid = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(cid.toString()).to.equal('bafybeialwqlwrfzou222oop7eiufct2rm5s62mr5uyonr4mytumvvu7q3m')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('wrapped directory from file', async () => {
    const url = ipfsBundle.normalizeUrl(
      'https://dweb.link/ipfs/QmT66vAtKUgZXzT7wubknYfz5Jz63EwcTYRzefVMsTijrs/production/editions/bluelightav/bluelightav-0.4.0-beta-tw-v5.1.23+build-210514348.html'
    )
    const cid = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(cid.toString()).to.equal('bafybeialwqlwrfzou222oop7eiufct2rm5s62mr5uyonr4mytumvvu7q3m')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.true
  })
  it('file', async () => {
    const url = ipfsBundle.normalizeUrl('https://dweb.link/ipfs/QmaiRNricrY3oUhxgy599RidYzmc5ChJzuqWjkrELde1ij')
    const cid = await ipfsBundle.resolveIpfsContainer(api, url)
    expect(cid.toString()).to.equal('bafybeifx37ze6fizpleasf43v523flemel3grcrv7jqwnbkr7g2h7c2zdq')
    const isIpfsDirectory = await ipfsBundle.isIpfsDirectory(api, cid)
    expect(isIpfsDirectory).to.be.false
  })
  after(async () => {
    await stop()
  })
})
