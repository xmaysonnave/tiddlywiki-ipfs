/* global jest, beforeAll, describe, it, expect */
"use strict";

/**
 * url.href;
 * url.origin
 * url.protocol;
 * url.username;
 * url.password;
 * url.host;
 * url.hostname;
 * url.port;
 * url.pathname;
 * url.search;
 * url.hash;
 * https://jsdom.github.io/whatwg-url/
 * https://github.com/stevenvachon/universal-url
 * https://github.com/stevenvachon/universal-url-lite
 * https://url.spec.whatwg.org/
 */

const IpfsBundle = require("../build/plugins/ipfs/ipfs-bundle.js").IpfsBundle;
const log = require("loglevel");
const root = require("window-or-global");

const invalid = "Wrong URL...";
const baseFile = "file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html";
const baseHttp = "https://ipfs.bluelightav.org";
const absolute = "https://bluelightav.eth";
const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});

describe("WHATWG-URL", () => {
  it("Undefined URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    expect(() => {
      ipfsUrl.getUrl();
    }).toThrow();
  });

  it("Invalid URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    expect(() => {
      ipfsUrl.getUrl(invalid);
    }).toThrow();
  });

  it("HTTPS protocol URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(baseHttp);
    expect(
      parsed.protocol === "https:" &&
        parsed.origin === baseHttp &&
        parsed.pathname === "/" &&
        parsed.search === "" &&
        parsed.hash === "" &&
        parsed.href === baseHttp + "/"
    ).toBeTruthy();
  });

  it("File protocol URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(baseFile);
    expect(
      parsed.protocol === "file:" &&
        parsed.origin === "null" &&
        parsed.host === "" &&
        parsed.pathname === "/work/tiddly/tiddlywiki-ipfs/wiki/index.html" &&
        parsed.href === baseFile
    ).toBeTruthy();
  });

  it("Useless base HTTP URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(absolute, baseHttp);
    expect(
      parsed.protocol === "https:" && parsed.hostname === "bluelightav.eth" && parsed.href == absolute + "/"
    ).toBeTruthy();
  });

  it("Relative URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(relative, baseHttp);
    expect(parsed.href === baseHttp + relative).toBeTruthy();
  });
});
