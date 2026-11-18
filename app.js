// MemeFactory site: latest release info, "download for your computer", and the
// self-typing search in the hero. Works without JavaScript too: the download
// links use GitHub's /releases/latest/download/ URLs, which always point to the
// newest published (non-draft) release.

const REPO = "gabojkz/meme-factory";
const RELEASES = `https://github.com/${REPO}/releases`;
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = "mf-latest-release-v2";
const CACHE_MS = 10 * 60 * 1000; // GitHub allows 60 API calls/hour per visitor

// `file` is the fixed download name the release workflow uploads; `match` finds the
// versioned build (e.g. MemeFactory_0.6.1_aarch64.dmg) when a release lacks it.
const PLATFORMS = {
  "mac-arm": { file: "MemeFactory-macos-arm64.dmg", match: /_aarch64\.dmg$/i, name: "macOS", detail: "Apple Silicon", icon: "" },
  "mac-intel": { file: "MemeFactory-macos-x64.dmg", match: /_x64\.dmg$/i, name: "macOS", detail: "Intel", icon: "" },
  windows: { file: "MemeFactory-windows-x64.msi", match: /_x64.*\.msi$/i, name: "Windows", detail: "64-bit", icon: "⊞" },
  linux: { file: "MemeFactory-linux-x86_64.AppImage", match: /_amd64\.AppImage$/i, name: "Linux", detail: "AppImage", icon: "🐧" },
  "linux-deb": { file: "MemeFactory-linux-amd64.deb", match: /_amd64\.deb$/i, name: "Linux", detail: ".deb", icon: "🐧" },
};

/** The release's file for a platform: the fixed name, else the versioned build. */
function assetFor(release, p) {
  if (!release) return undefined;
  if (release.assets[p.file]) return release.assets[p.file];
  const name = Object.keys(release.assets).find((n) => p.match.test(n));
  return name ? release.assets[name] : undefined;
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function store(action, value) {
  try {
    if (action === "get") return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    return null;
  }
}

async function latestRelease() {
  const cached = store("get");
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.release;
  const res = await fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const data = await res.json();
  const release = {
    tag: data.tag_name,
    url: data.html_url,
    published: data.published_at,
    assets: Object.fromEntries((data.assets || []).map((a) => [a.name, { url: a.browser_download_url, size: a.size }])),
  };
  store("set", { at: Date.now(), release });
  return release;
}

function formatSize(bytes) {
  const mb = bytes / 1024 / 1024;
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

/** Best guess at the visitor's platform: "mac-arm" | "mac-intel" | "windows" | "linux" | "mobile" | null. */
async function detectPlatform() {
  const ua = navigator.userAgent || "";
  const uaData = navigator.userAgentData;
  if (uaData?.mobile || /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "mobile";
  }
  const platform = (uaData?.platform || navigator.platform || ua).toLowerCase();
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac")) {
    // Chromium can tell Apple Silicon from Intel; Safari and Firefox can't, and
    // every Mac sold since 2021 is Apple Silicon, so that's the default.
    try {
      const { architecture } = (await uaData?.getHighEntropyValues?.(["architecture"])) || {};
      if (architecture === "x86") return "mac-intel";
    } catch {
      /* fall through */
    }
    return "mac-arm";
  }
  if (platform.includes("linux") || platform.includes("x11")) return "linux";
  return null;
}

function setupDownloads(release, platform) {
  for (const card of $$("[data-platform]")) {
    const p = PLATFORMS[card.dataset.platform];
    const asset = assetFor(release, p);
    const size = $("[data-size]", card);
    const yours = card.dataset.platform === platform;
    card.classList.toggle("yours", yours);
    if (yours) card.closest(".dl-card")?.classList.add("yours");
    if (!release) continue; // couldn't ask GitHub: keep the always-latest links
    if (asset) {
      card.href = asset.url;
      card.classList.remove("missing");
      if (size) size.textContent = `· ${formatSize(asset.size)}`;
    } else {
      // This build isn't in the newest release: send people to the release page instead of a 404.
      card.href = release.url;
      card.classList.add("missing");
      $(".file", card).textContent = "Still cooking: next release";
      card.title = "This build isn’t in the newest release yet. The release page has what’s there.";
    }
  }

  if (release) {
    $("[data-release-line]").innerHTML =
      `<span class="ver">${escapeHtml(release.tag)}</span> released ${escapeHtml(formatDate(release.published))} · ` +
      `<a href="${escapeHtml(release.url)}" rel="noopener">What’s new</a> · ` +
      `<a href="${RELEASES}" rel="noopener">All releases</a>`;
    const badge = $("[data-version-badge]");
    if (badge) badge.textContent = `${release.tag} · free & open source`;
  }

  // Hero button: straight to the right file when we know the platform.
  const btn = $("[data-primary-download]");
  const note = $("[data-primary-note]");
  const p = PLATFORMS[platform];
  if (platform === "mobile") {
    $("[data-primary-label]").textContent = "Get it on your computer";
    $("[data-primary-meta]").textContent = "It’s a desktop app, bestie. Open this on a computer";
    return;
  }
  if (!p) return;
  const asset = assetFor(release, p);
  if (release && !asset) return; // nothing for this platform yet: keep "see all downloads"
  btn.href = asset?.url || `${RELEASES}/latest/download/${p.file}`;
  $("[data-primary-label]").textContent = `Download for ${p.name}`;
  $("[data-primary-icon]").textContent = p.icon || "⬇";
  $("[data-primary-meta]").textContent = [release?.tag, p.detail, asset && formatSize(asset.size)]
    .filter(Boolean)
    .join(" · ");
  if (platform === "mac-arm" || platform === "mac-intel") {
    const other = platform === "mac-arm" ? "mac-intel" : "mac-arm";
    note.innerHTML = `Intel Mac? Your build is <a href="#download">down here</a>.`;
    note.hidden = false;
    $(`[data-platform="${other}"]`)?.setAttribute("title", "The other Mac build");
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- Hero: the search types itself and filters the grid ---------- */

function heroSearch() {
  const typed = $("[data-typed]");
  const cards = $$("[data-grid] figure");
  if (!typed || !cards.length) return;

  const filter = (q) => {
    const query = q.trim().toLowerCase();
    for (const card of cards) {
      const hit = !query || card.dataset.text.includes(query);
      card.classList.toggle("miss", !hit);
      card.classList.toggle("match", !!query && hit);
    }
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    typed.textContent = "deploy";
    filter("deploy");
    return;
  }

  const queries = ["deploy", "monday", "works", "pizza", "told you"];
  let qi = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  (async function loop() {
    for (;;) {
      const q = queries[qi++ % queries.length];
      for (let i = 1; i <= q.length; i++) {
        typed.textContent = q.slice(0, i);
        filter(typed.textContent);
        await sleep(95 + Math.random() * 60);
      }
      await sleep(1900);
      for (let i = q.length; i >= 0; i--) {
        typed.textContent = q.slice(0, i);
        if (i === 0) filter("");
        await sleep(35);
      }
      await sleep(500);
    }
  })();
}

/* ---------- Copy buttons ---------- */

function copyButtons() {
  for (const btn of $$("[data-copy]")) {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied 😎";
      } catch {
        btn.textContent = "Select & copy";
      }
      setTimeout(() => (btn.textContent = "Copy"), 1800);
    });
  }
}

/* ---------- Start ---------- */

heroSearch();
copyButtons();

(async () => {
  const platformPromise = detectPlatform();
  let release = null;
  try {
    release = await latestRelease();
  } catch (e) {
    console.warn("Couldn’t read the latest release from GitHub; using the always-latest links.", e);
  }
  setupDownloads(release, await platformPromise);
})();
