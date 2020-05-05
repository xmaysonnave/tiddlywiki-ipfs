/* global jest, beforeAll, describe, it, expect */
"use strict";

const IpfsBundle = require("../build/plugins/ipfs/ipfs-bundle.js").IpfsBundle;
const log = require("loglevel");
const root = require("window-or-global");
beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});
describe("CID", () => {
  it("Undefined pathname", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { protocol, cid } = ipfsBundle.decodeCid();
    expect(protocol == null && cid == null).toBeTruthy();
    var { protocol, cid } = ipfsBundle.decodeCid("");
    expect(protocol == null && cid == null).toBeTruthy();
    var { protocol, cid } = ipfsBundle.decodeCid("/");
    expect(protocol == null && cid == null).toBeTruthy();
  });
  it("Incorrect pathname", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { protocol, cid } = ipfsBundle.decodeCid("Hello World");
    expect(protocol == null && cid == null).toBeTruthy();
    var { protocol, cid } = ipfsBundle.decodeCid("/Hello/World");
    expect(protocol == null && cid == null).toBeTruthy();
  });
  it("Invalid CID", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { protocol, cid } = ipfsBundle.decodeCid("/ipfs/Hello World");
    expect(protocol == "ipfs" && cid == null).toBeTruthy();
    var { protocol, cid } = ipfsBundle.decodeCid("/ipns/Hello World");
    expect(protocol == "ipns" && cid == null).toBeTruthy();
  });
  it("Resolve", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { protocol, cid } = ipfsBundle.decodeCid("/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
    expect(protocol === "ipfs" && cid === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau").toBeTruthy();
    var { protocol, cid } = ipfsBundle.decodeCid("/ipns/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
    expect(protocol === "ipns" && cid === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau").toBeTruthy();
  });
});
