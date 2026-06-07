import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function load(lang) {
  const path = fileURLToPath(new URL(`../_locales/${lang}/messages.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("locale catalogs", () => {
  it("en 과 ko 의 키 집합이 동일하다", () => {
    const en = Object.keys(load("en")).sort();
    const ko = Object.keys(load("ko")).sort();
    expect(ko).toEqual(en);
  });

  it("모든 메시지에 message 필드가 있다", () => {
    for (const lang of ["en", "ko"]) {
      const cat = load(lang);
      for (const [key, val] of Object.entries(cat)) {
        expect(val.message, `${lang}/${key}`).toBeTruthy();
      }
    }
  });

  it("errHttp 에 placeholder 정의가 있다", () => {
    for (const lang of ["en", "ko"]) {
      const cat = load(lang);
      expect(cat.errHttp.placeholders?.status?.content, `${lang}/errHttp.placeholders`).toBe("$1");
    }
  });
});
