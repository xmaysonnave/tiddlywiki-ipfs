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
const { URL } = require("universal-url");
const invalid = "Wrong URL...";
const baseFile = new URL("file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html");
const baseHttp = new URL("https://ipfs.bluelightav.org");
const absolute = new URL("https://bluelightav.eth");
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
      parsed.origin == baseHttp.origin &&
      parsed.pathname === "/" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.href == baseHttp.href &&
      parsed.toString() == baseHttp.toString()
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
      parsed.href === baseFile.href &&
      parsed.toString() === baseFile.toString()
    ).toBeTruthy();
  });
  it("Useless base HTTP URL", () => {
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(absolute, baseHttp);
    expect(
      parsed.protocol === "https:" &&
      parsed.protocol === baseHttp.protocol &&
      parsed.hostname === "bluelightav.eth" &&
      parsed !== absolute &&
      parsed.href === absolute.href &&
      parsed.toString() === absolute.toString()
    ).toBeTruthy();
  });
  it("Relative URL", () => {
    const base = new URL(baseHttp);
    const ipfsBundle = new IpfsBundle();
    ipfsBundle.init();
    const ipfsUrl = ipfsBundle.ipfsUrl;
    const parsed = ipfsUrl.getUrl(relative, base);
    base.pathname = relative;
    expect((parsed.pathname = base.pathname)).toBeTruthy();
  });
});
