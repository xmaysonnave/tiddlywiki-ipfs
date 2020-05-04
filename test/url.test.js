/* global jest, beforeAll, describe, it, expect */
"use strict";

const IpfsBundle = require("../build/plugins/ipfs/ipfs-bundle.js").IpfsBundle;
const log = require("loglevel");
const root = require("window-or-global");
const { URL } = require("universal-url");
const local = new URL("file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html");
const remote = new URL("https://ipfs.infura.io/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const api = new URL("https://ipfs.infura.io:5001/");
const gateway = new URL("https://ipfs.infura.io/");
const eth = new URL("https://bluelightav.eth/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const ethLink = new URL(
  "https://bluelightav.eth.link/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
);
const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";
beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});
describe("API URL", () => {
  it("Valid Default", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getIpfsDefaultApiUrl();
    expect(parsed.href === api.href).toBeTruthy();
  });
  it("Valid Safe", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getIpfsApiUrl();
    expect(parsed.href === api.href).toBeTruthy();
  });
  it("Invalid", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    try {
      ipfsUrl.getIpfsApiUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS API URL...");
    }
  });
});
describe("Document URL", () => {
  it("Valid", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    ipfsUrl.getDocumentUrl = jest.fn();
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = ipfsUrl.getDocumentUrl();
    expect(parsed.href === remote.href).toBeTruthy();
  });
  it("Invalid", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    try {
      ipfsUrl.getDocumentUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid current HTML Document URL...");
    }
  });
});
describe("Gateway URL", () => {
  it("Valid Default", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getIpfsDefaultGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });
  it("Valid Safe", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getIpfsGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });
  it("Invalid", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    try {
      ipfsUrl.getIpfsGatewayUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS Gateway URL...");
    }
  });
});
describe("URL", () => {
  it("Valid", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(api);
    expect(parsed.href === api.href).toBeTruthy();
  });
  it("Invalid", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    try {
      ipfsUrl.getUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid URL...");
    }
  });
});
describe("Base URL", () => {
  it("Origin", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    ipfsUrl.getDocumentUrl = jest.fn();
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(remote);
    const base = ipfsUrl.getIpfsBaseUrl();
    expect(base.href === "https://ipfs.infura.io/").toBeTruthy();
  });

  it("Fallback to default Gateway", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    ipfsUrl.getDocumentUrl = jest.fn();
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(local);
    const base = ipfsUrl.getIpfsBaseUrl();
    expect(base.href === gateway.href).toBeTruthy();
  });
});
describe("Normalize Gateway URL", () => {
  it("Relative. Fallback to Origin...", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    ipfsUrl.getDocumentUrl = jest.fn();
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = ipfsUrl.normalizeUrl(relative);
    expect(parsed.href === remote.protocol + "//" + remote.hostname + relative).toBeTruthy();
  });
  it("Relative. Fallback to default Gateway...", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    ipfsUrl.getDocumentUrl = jest.fn();
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(local);
    const parsed = ipfsUrl.normalizeUrl(relative);
    expect(parsed.href === gateway.protocol + "//" + gateway.hostname + relative).toBeTruthy();
  });
  it("Remove dot link...", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    ipfsUrl.getDocumentUrl = jest.fn();
    ipfsUrl.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = ipfsUrl.normalizeUrl(ethLink);
    expect(parsed.href === eth.href).toBeTruthy();
  });
});
