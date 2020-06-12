/* global jest, beforeAll, describe, it, expect */
"use strict";

const IpfsBundle = require("../build/plugins/ipfs/ipfs-bundle.js").IpfsBundle;
const log = require("loglevel");
const root = require("window-or-global");
beforeAll(() => {
  root.logger = log;
  log.setLevel("silent", false);
});
describe("CID", () => {
  it("Undefined pathname", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid();
    expect(ipnsIdentifier == null && protocol == null && cid == null).toBeTruthy();
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid("");
    expect(ipnsIdentifier == null && protocol == null && cid == null).toBeTruthy();
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid("/");
    expect(ipnsIdentifier == null && protocol == null && cid == null).toBeTruthy();
  });
  it("Incorrect pathname", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid("Hello World");
    expect(ipnsIdentifier == null && protocol == null && cid == null).toBeTruthy();
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid("/Hello/World");
    expect(ipnsIdentifier == null && protocol == null && cid == null).toBeTruthy();
  });
  it("Invalid IPFS cid", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { ipnsIdentifier, protocol, cid } = ipfsBundle.decodeCid("/ipfs/Hello World");
    expect(ipnsIdentifier == null && protocol == "ipfs" && cid == null).toBeTruthy();
  });
  it("Decode IPFS cid", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(
      "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    );
    expect(
      ipnsIdentifier == null &&
      protocol === "ipfs" &&
      cid === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy();
  });
  it("Decode IPNS key", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid(
      "/ipns/QmVDNdJNsTN2wxHCu75hvAAx659dTUUHDAKV53TJ8q6LzT"
    );
    expect(
      cid == null && protocol === "ipns" && ipnsIdentifier === "QmVDNdJNsTN2wxHCu75hvAAx659dTUUHDAKV53TJ8q6LzT"
    ).toBeTruthy();
  });
  it("Decode IPNS name", async () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    var { cid, ipnsIdentifier, protocol } = ipfsBundle.decodeCid("/ipns/bluelightav.eth");
    expect(cid == null && protocol === "ipns" && ipnsIdentifier === "bluelightav.eth").toBeTruthy();
  });
});
