export const DEFAULT_BASE_URL = "https://summora.advenoh.pe.kr";

export async function getBaseUrl() {
  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });
  return baseUrl || DEFAULT_BASE_URL;
}

export async function setBaseUrl(url) {
  await chrome.storage.sync.set({ baseUrl: url });
}

export async function saveArticle(baseUrl, url) {
  try {
    const res = await fetch(`${baseUrl}/api/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      let serverMessage;
      try {
        const body = await res.json();
        serverMessage = body?.message || body?.error || undefined;
      } catch {
        // 본문 파싱 실패 시 serverMessage 없음
      }
      return { ok: false, status: "error", code: "http", httpStatus: res.status, serverMessage };
    }
    const article = await res.json();
    return { ok: true, status: "saved", article };
  } catch {
    return { ok: false, status: "error", code: "network" };
  }
}
