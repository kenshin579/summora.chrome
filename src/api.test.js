import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl, saveArticle } from "./api.js";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("getBaseUrl / setBaseUrl", () => {
  it("저장값이 없으면 기본 운영 주소", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { get: vi.fn(async (d) => d) } },
    });
    expect(await getBaseUrl()).toBe(DEFAULT_BASE_URL);
  });

  it("저장값이 있으면 그 값", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { get: vi.fn(async () => ({ baseUrl: "http://localhost:8080" })) } },
    });
    expect(await getBaseUrl()).toBe("http://localhost:8080");
  });

  it("setBaseUrl 은 storage.sync.set 호출", async () => {
    const set = vi.fn(async () => {});
    vi.stubGlobal("chrome", { storage: { sync: { set } } });
    await setBaseUrl("http://localhost:8080");
    expect(set).toHaveBeenCalledWith({ baseUrl: "http://localhost:8080" });
  });
});

describe("saveArticle", () => {
  it("2xx 이면 saved + article 정규화", async () => {
    const article = { id: 42, url: "https://x", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 201, json: async () => article }))
    );
    const r = await saveArticle("https://api.test", "https://x");
    expect(r).toEqual({ ok: true, status: "saved", article });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/articles",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("비-2xx 이면 error + 서버 메시지", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ message: "지원하지 않는 URL" }),
      }))
    );
    const r = await saveArticle("https://api.test", "ftp://x");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("error");
    expect(r.message).toBe("지원하지 않는 URL");
  });

  it("fetch 예외면 네트워크 오류 메시지", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      })
    );
    const r = await saveArticle("https://api.test", "https://x");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("error");
    expect(r.message).toMatch(/네트워크/);
  });
});
