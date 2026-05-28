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
      let message = `저장 실패 (HTTP ${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
        else if (body?.error) message = body.error;
      } catch {
        // 본문 파싱 실패 시 기본 메시지 유지
      }
      return { ok: false, status: "error", message };
    }
    const article = await res.json();
    return { ok: true, status: "saved", article };
  } catch {
    return {
      ok: false,
      status: "error",
      message: "네트워크 오류: 백엔드에 연결할 수 없습니다.",
    };
  }
}
