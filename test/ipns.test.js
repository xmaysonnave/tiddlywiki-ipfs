/* global jest, beforeAll, describe, it, expect */
"use strict";

const log = require("loglevel");
const root = require("window-or-global");

const IpfsWrapper = require("../build/plugins/ipfs/ipfs-wrapper.js").IpfsWrapper;

const resolvedTiddly = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

const decodedCid = {
  protocol: "ipfs",
  cid: "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
};

const keys = [
  {
    id: "QmZLTGyFGnbmYJoitU6cRCb8SwWEkgTz4EQgbKydxWyDsJ",
    name: "self"
  },
  {
    id: "QmNQhkAtdGVjK5Ehck8jx7QHQoz9pxUnnc12fGJP8MuqyL",
    name: "documentation"
  },
  {
    id: "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf",
    name: "tiddly"
  }
];

jest.mock("../build/plugins/ipfs/ipfs-library.js");

beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});

describe("IPNS", () => {

  it("Undefined IPNS key and IPNS name", async () => {
    const ipfsWrapper = new IpfsWrapper();
    try {
      await ipfsWrapper.fetchIpns();
    } catch (error) {
      expect(error.message).toBe("Undefined IPNS key and IPNS name...");
    }
  });

  it("Unknown IPNS keys", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(null);
    try {
      await ipfsWrapper.fetchIpns(null, "dummy", null);
    } catch (error) {
      expect(error.message).toBe("Failed to fetch IPNS keys...");
    }
  });

});

describe("IPNS key and IPNS name", () => {

  it("Unknown IPNS key and IPNS name", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    try {
      await ipfsWrapper.fetchIpns(null, "dummy", "dummy");
    } catch (error) {
      expect(error.message).toBe("Unknown IPNS key and IPNS name...");
    }
  });

  it("Fetch IPNS key and IPNS name", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { ipnsKey, ipnsName } = await ipfsWrapper.fetchIpns(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf", "tiddly");
    expect(
      ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
    ).toBeTruthy();
  });

});

describe("IPNS name", () => {

  it("Unknown IPNS name", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    try {
      await ipfsWrapper.fetchIpns(null, null, "dummy");
    } catch (error) {
      expect(error.message).toBe("Unknown IPNS name...");
    }
  });

  it("Fetch IPNS key and IPNS name", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { ipnsKey, ipnsName } = await ipfsWrapper.fetchIpns(null, null, "tiddly");
    expect(
      ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
    ).toBeTruthy();
  });

});

describe("IPNS key", () => {

  it("Unknown IPNS key.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    try {
      await ipfsWrapper.fetchIpns(null, "dummy", null);
    } catch (error) {
      expect(error.message).toBe("Unknown IPNS key...");
    }
  });

  it("Fetch IPNS key and IPNS name", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    const { ipnsKey, ipnsName } = await ipfsWrapper.fetchIpns(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf", null);
    expect(
      ipnsName === "tiddly"
      && ipnsKey === "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf"
    ).toBeTruthy();
  });

  it("Resolve IPNS key", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.resolve.mockResolvedValue(resolvedTiddly);
    ipfsWrapper.ipfsLibrary.decodeCid.mockReturnValue(decodedCid);
    const resolved = await ipfsWrapper.resolveIpnsKey(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf");
    expect(resolved === "bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau").toBeTruthy();
  });

  it("Unassigned IPNS key.", async () => {
    const ipfsWrapper = new IpfsWrapper();
    ipfsWrapper.ipfsLibrary.getKeys.mockResolvedValue(keys);
    try {
      await ipfsWrapper.resolveIpnsKey(null, "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf");
    } catch (error) {
      expect(error.message).toBe("Failed to resolve IPNS key: " + "QmbegBzeBEtohaAPpUYwmkFURtDHEXm7KcdNjASUw1RrZf");
    }
  });

});
