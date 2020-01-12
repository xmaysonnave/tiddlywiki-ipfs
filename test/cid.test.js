/* global jest, describe, it, expect */
"use strict";

const IpfsLibrary = require("../build/plugins/ipfs/ipfs-library.js").IpfsLibrary;

const pathname = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

describe("CID", () => {

  it("Resolve CID.", async () => {
    const ipfsLibrary = new IpfsLibrary();
    const { protocol, cid } = ipfsLibrary.decodeCid(pathname);
    expect(
      protocol === "ipfs"
      && cid === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
    ).toBeTruthy()
  });

});
