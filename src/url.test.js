import { describe, it, expect } from "vitest";
import { normalizeUrl, isSavableUrl, youtubeId } from "./url.js";

describe("normalizeUrl", () => {
  it("youtube watch: v= 만 남기고 t/list/si 제거", () => {
    expect(
      normalizeUrl("https://www.youtube.com/watch?v=ABC123&t=120s&list=PL1&si=xyz")
    ).toBe("https://www.youtube.com/watch?v=ABC123");
  });

  it("youtu.be 단축 URL → 표준 watch", () => {
    expect(normalizeUrl("https://youtu.be/ABC123?si=xyz")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("shorts → 표준 watch", () => {
    expect(normalizeUrl("https://www.youtube.com/shorts/ABC123")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("m.youtube.com watch 도 정규화", () => {
    expect(normalizeUrl("https://m.youtube.com/watch?v=ABC123&feature=share")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("embed → 표준 watch", () => {
    expect(normalizeUrl("https://www.youtube.com/embed/ABC123")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("music.youtube.com → 표준 watch", () => {
    expect(normalizeUrl("https://music.youtube.com/watch?v=ABC123&list=RD")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("일반 URL: utm_*/fbclid 제거하고 의미 있는 쿼리는 보존", () => {
    expect(
      normalizeUrl("https://blog.example.com/post?utm_source=x&id=7&fbclid=abc")
    ).toBe("https://blog.example.com/post?id=7");
  });

  it("일반 URL: 추적 파라미터 없으면 그대로", () => {
    expect(normalizeUrl("https://blog.example.com/post?id=7")).toBe(
      "https://blog.example.com/post?id=7"
    );
  });

  it("파싱 불가 입력은 그대로 반환", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });

  it("비-http(s) 스킴은 그대로 반환", () => {
    expect(normalizeUrl("chrome://extensions")).toBe("chrome://extensions");
  });
});

describe("youtubeId", () => {
  it("watch / youtu.be / shorts / embed / music → ID", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=ABC123&t=1")).toBe("ABC123");
    expect(youtubeId("https://youtu.be/ABC123?si=x")).toBe("ABC123");
    expect(youtubeId("https://www.youtube.com/shorts/ABC123")).toBe("ABC123");
    expect(youtubeId("https://www.youtube.com/embed/ABC123")).toBe("ABC123");
    expect(youtubeId("https://music.youtube.com/watch?v=ABC123")).toBe("ABC123");
  });
  it("비-YouTube / 파싱 불가 → null", () => {
    expect(youtubeId("https://blog.example.com/post")).toBeNull();
    expect(youtubeId("https://www.youtube.com/")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
  });
});

describe("isSavableUrl", () => {
  it("http(s)는 true", () => {
    expect(isSavableUrl("https://example.com")).toBe(true);
    expect(isSavableUrl("http://localhost:3000/x")).toBe(true);
  });

  it("chrome://, about:, 빈 문자열, 비-URL은 false", () => {
    expect(isSavableUrl("chrome://extensions")).toBe(false);
    expect(isSavableUrl("about:blank")).toBe(false);
    expect(isSavableUrl("")).toBe(false);
    expect(isSavableUrl("not a url")).toBe(false);
  });
});
