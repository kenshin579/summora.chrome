import { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } from "./src/api.js";

const input = document.getElementById("baseUrl");
const savedEl = document.getElementById("saved");

async function init() {
  input.value = await getBaseUrl();
}

document.getElementById("save").addEventListener("click", async () => {
  const value = (input.value.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  await setBaseUrl(value);
  input.value = value;
  savedEl.hidden = false;
  setTimeout(() => {
    savedEl.hidden = true;
  }, 2000);
});

init();
