import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, storiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdminAuth, setAdminCookie, clearAdminCookie } from "../middleware/auth";

const router: IRouter = Router();

const ADMIN_COOKIE = "storytime_admin";

function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  return trimmed;
}

const CATEGORIES = [
  "bedtime", "adventure", "animal", "songs", "mythology",
  "learning", "yoga", "nature", "funny", "classic",
];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const signed = (req as any).signedCookies?.[ADMIN_COOKIE];
  if (signed === "authenticated") return next();
  res.redirect("/api/admin/login");
}

function loginPage(error?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Storytime Admin — Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FDF6E3;color:#2D3E5E;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:40px 36px;width:360px}
    .logo{text-align:center;margin-bottom:28px}
    .logo h1{font-size:24px;color:#2D3E5E}
    .logo p{font-size:13px;color:#888;margin-top:4px}
    label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#555}
    input{width:100%;padding:11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;background:#fafafa;transition:border .15s;margin-bottom:16px}
    input:focus{outline:none;border-color:#E8826B;background:white}
    button{width:100%;padding:12px;background:#E8826B;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .15s}
    button:hover{opacity:.88}
    .error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <h1>🎙 Storytime</h1>
      <p>Admin Panel</p>
    </div>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="POST" action="/api/admin/login">
      <label>Password</label>
      <input type="password" name="password" autofocus placeholder="Enter admin password" required />
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`;
}

function adminPage(stories: typeof storiesTable.$inferSelect[], message?: string) {
  const rows = stories
    .map(
      (s) => `
    <tr>
      <td>${s.id}</td>
      <td>${s.title}</td>
      <td>${s.category}</td>
      <td>${s.duration}m</td>
      <td>${s.ageMin}–${s.ageMax}</td>
      <td>${s.audioUrl ? `<a href="${s.audioUrl}" target="_blank">Audio</a>` : "—"}</td>
      <td>${s.thumbnailUrl ? `<img src="${s.thumbnailUrl}" width="40" height="40" style="object-fit:cover;border-radius:4px">` : "—"}</td>
      <td>${s.published ? "✅" : "❌"}</td>
      <td>
        <button onclick="editStory(${JSON.stringify(JSON.stringify(s))})" style="padding:4px 10px;background:#2D3E5E;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px">Edit</button>
        <button onclick="deleteStory('${s.id}','${s.title.replace(/'/g, "\\'")}')" style="padding:4px 10px;background:#c0392b;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;margin-left:4px">Delete</button>
      </td>
    </tr>`,
    )
    .join("");

  const catOptions = CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Storytime Admin</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FDF6E3;color:#2D3E5E}
    header{background:#2D3E5E;color:#FDF6E3;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
    header h1{font-size:22px}
    header span{font-size:13px;opacity:0.7;margin-top:2px}
    .logout-btn{background:rgba(255,255,255,0.15);border:none;color:white;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
    .logout-btn:hover{background:rgba(255,255,255,0.25)}
    main{max-width:1100px;margin:32px auto;padding:0 24px}
    .card{background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:24px;margin-bottom:28px}
    .card h2{font-size:16px;margin-bottom:16px;color:#2D3E5E}
    .flash{background:#d4edda;color:#155724;border:1px solid #c3e6cb;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px}
    .flash.error{background:#f8d7da;color:#721c24;border-color:#f5c6cb}
    form .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    label{display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#555}
    input,select,textarea{width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;background:#fafafa;transition:border .15s}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#E8826B;background:white}
    textarea{resize:vertical;min-height:72px}
    .row{display:flex;gap:12px;align-items:flex-end;margin-top:12px}
    .btn{padding:10px 22px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;transition:opacity .15s}
    .btn:hover{opacity:.88}
    .btn-primary{background:#E8826B;color:white}
    .btn-secondary{background:#5B8C5A;color:white}
    .btn-outline{background:white;color:#2D3E5E;border:1px solid #ddd}
    .btn-import{background:#2D3E5E;color:white}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;background:#f0f0e8;color:#555;font-weight:600;border-bottom:2px solid #e0e0d0}
    td{padding:10px 12px;border-bottom:1px solid #f0f0e8;vertical-align:middle}
    tr:hover td{background:#fffbf5}
    .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;align-items:center;justify-content:center}
    .modal-overlay.open{display:flex}
    .modal{background:white;border-radius:14px;padding:28px;width:600px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)}
    .modal h2{margin-bottom:20px;font-size:18px}
    .modal-close{float:right;background:none;border:none;font-size:22px;cursor:pointer;color:#999}
    .import-area{width:100%;min-height:160px;font-family:monospace;font-size:12px;padding:12px;border:1px solid #ddd;border-radius:6px;background:#fafafa;resize:vertical}
    .import-result{margin-top:12px;font-size:13px;padding:10px 14px;border-radius:6px;display:none}
    .import-result.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;display:block}
    .import-result.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;display:block}
  </style>
</head>
<body>
<header>
  <div>
    <h1>🎙 Storytime Admin</h1>
    <span>Content Management</span>
  </div>
  <form method="POST" action="/api/admin/logout" style="margin:0">
    <button class="logout-btn" type="submit">Sign Out</button>
  </form>
</header>
<main>
  ${message ? `<div class="flash ${message.startsWith("Error") ? "error" : ""}">${message}</div>` : ""}

  <div class="card">
    <h2>Add New Story</h2>
    <form method="POST" action="/api/admin/stories">
      <div class="grid">
        <div>
          <label>Story ID (unique slug)</label>
          <input name="id" required placeholder="e.g. s21" />
        </div>
        <div>
          <label>Title</label>
          <input name="title" required placeholder="The Little Star" />
        </div>
        <div>
          <label>Category</label>
          <select name="category" required>${catOptions}</select>
        </div>
        <div>
          <label>Duration (minutes)</label>
          <input name="duration" type="number" required min="1" max="60" placeholder="5" />
        </div>
        <div>
          <label>Min Age</label>
          <input name="ageMin" type="number" required min="1" max="10" placeholder="2" />
        </div>
        <div>
          <label>Max Age</label>
          <input name="ageMax" type="number" required min="1" max="10" placeholder="5" />
        </div>
        <div style="grid-column:1/-1">
          <label>Description</label>
          <textarea name="description" required placeholder="A short, warm description for parents and kids…"></textarea>
        </div>
        <div style="grid-column:1/-1">
          <label>Thumbnail URL (image)</label>
          <input name="thumbnailUrl" type="url" placeholder="https://… (PNG, JPG, WebP)" />
        </div>
        <div style="grid-column:1/-1">
          <label>Audio URL (MP3 or M4A)</label>
          <input name="audioUrl" type="url" placeholder="https://… (MP3, M4A)" />
        </div>
        <div style="grid-column:1/-1">
          <label>Video URL (optional)</label>
          <input name="videoUrl" type="url" placeholder="https://… (MP4)" />
        </div>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary">Add Story</button>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:normal;cursor:pointer">
          <input type="checkbox" name="published" value="true" checked style="width:auto" />
          Publish immediately
        </label>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Bulk Import (JSON)</h2>
    <p style="font-size:13px;color:#888;margin-bottom:12px">Paste a JSON array of stories. Each item needs: id, title, category, duration, ageMin, ageMax, description. audioUrl and thumbnailUrl are optional.</p>
    <textarea id="importJson" class="import-area" placeholder='[
  {
    "id": "s21",
    "title": "The Brave Little Cloud",
    "category": "nature",
    "duration": 6,
    "ageMin": 2,
    "ageMax": 5,
    "description": "A shy cloud discovers it can make rainbows.",
    "audioUrl": "https://...",
    "thumbnailUrl": "https://...",
    "published": true
  }
]'></textarea>
    <div class="row" style="margin-top:12px">
      <button class="btn btn-import" onclick="runImport()">Import All</button>
      <span id="importSpinner" style="font-size:13px;color:#888;display:none">Importing…</span>
    </div>
    <div id="importResult" class="import-result"></div>
  </div>

  <div class="card">
    <h2>All Stories (${stories.length})</h2>
    <table>
      <thead><tr>
        <th>ID</th><th>Title</th><th>Category</th><th>Duration</th>
        <th>Age</th><th>Audio</th><th>Cover</th><th>Live</th><th>Actions</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</main>

<!-- Edit modal -->
<div class="modal-overlay" id="editOverlay">
  <div class="modal">
    <button class="modal-close" onclick="closeEdit()">✕</button>
    <h2>Edit Story</h2>
    <form method="POST" id="editForm">
      <input type="hidden" name="_method" value="PUT" />
      <div class="grid">
        <div>
          <label>Title</label>
          <input name="title" id="e_title" required />
        </div>
        <div>
          <label>Category</label>
          <select name="category" id="e_category">${catOptions}</select>
        </div>
        <div>
          <label>Duration (minutes)</label>
          <input name="duration" id="e_duration" type="number" required />
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label>Min Age</label><input name="ageMin" id="e_ageMin" type="number" required /></div>
          <div style="flex:1"><label>Max Age</label><input name="ageMax" id="e_ageMax" type="number" required /></div>
        </div>
        <div style="grid-column:1/-1">
          <label>Description</label>
          <textarea name="description" id="e_description" required></textarea>
        </div>
        <div style="grid-column:1/-1">
          <label>Thumbnail URL</label>
          <input name="thumbnailUrl" id="e_thumbnailUrl" type="url" />
        </div>
        <div style="grid-column:1/-1">
          <label>Audio URL</label>
          <input name="audioUrl" id="e_audioUrl" type="url" />
        </div>
        <div style="grid-column:1/-1">
          <label>Video URL</label>
          <input name="videoUrl" id="e_videoUrl" type="url" />
        </div>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-secondary">Save Changes</button>
        <button type="button" class="btn btn-outline" onclick="closeEdit()">Cancel</button>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:normal;cursor:pointer;margin-left:auto">
          <input type="checkbox" name="published" id="e_published" value="true" style="width:auto" />
          Published
        </label>
      </div>
    </form>
  </div>
</div>

<script>
function editStory(jsonStr) {
  const s = JSON.parse(jsonStr);
  document.getElementById('e_title').value = s.title;
  document.getElementById('e_category').value = s.category;
  document.getElementById('e_duration').value = s.duration;
  document.getElementById('e_ageMin').value = s.ageMin;
  document.getElementById('e_ageMax').value = s.ageMax;
  document.getElementById('e_description').value = s.description;
  document.getElementById('e_thumbnailUrl').value = s.thumbnailUrl || '';
  document.getElementById('e_audioUrl').value = s.audioUrl || '';
  document.getElementById('e_videoUrl').value = s.videoUrl || '';
  document.getElementById('e_published').checked = s.published;
  document.getElementById('editForm').action = '/api/admin/stories/' + s.id;
  document.getElementById('editOverlay').classList.add('open');
}
function closeEdit() {
  document.getElementById('editOverlay').classList.remove('open');
}
async function deleteStory(id, title) {
  if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
  const res = await fetch('/api/admin/stories/' + id, { method: 'DELETE' });
  if (res.ok || res.status === 204) location.reload();
  else alert('Delete failed');
}
document.getElementById('editOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeEdit();
});

async function runImport() {
  const raw = document.getElementById('importJson').value.trim();
  const result = document.getElementById('importResult');
  const spinner = document.getElementById('importSpinner');
  result.className = 'import-result';
  result.textContent = '';
  if (!raw) { result.className = 'import-result error'; result.textContent = 'Paste JSON first.'; return; }
  let stories;
  try { stories = JSON.parse(raw); } catch(e) { result.className = 'import-result error'; result.textContent = 'Invalid JSON: ' + e.message; return; }
  if (!Array.isArray(stories)) { result.className = 'import-result error'; result.textContent = 'Must be a JSON array [ ... ]'; return; }
  spinner.style.display = 'inline';
  try {
    const res = await fetch('/api/admin/stories/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ stories }) });
    const data = await res.json();
    if (res.ok) {
      result.className = 'import-result success';
      result.textContent = data.message;
      setTimeout(() => location.reload(), 1500);
    } else {
      result.className = 'import-result error';
      result.textContent = data.error || 'Import failed';
    }
  } catch(e) {
    result.className = 'import-result error';
    result.textContent = 'Network error: ' + e.message;
  } finally {
    spinner.style.display = 'none';
  }
}
</script>
</body>
</html>`;
}

// ── Auth routes (no guard) ──────────────────────────────────────────────────

router.get("/admin/login", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(loginPage());
});

router.post("/admin/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.setHeader("Content-Type", "text/html");
    res.status(500).send(loginPage("ADMIN_PASSWORD is not set. Ask your developer to configure it."));
    return;
  }

  if (password === adminPassword) {
    (res as any).cookie(ADMIN_COOKIE, "authenticated", {
      signed: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    });
    res.redirect("/api/admin");
  } else {
    res.setHeader("Content-Type", "text/html");
    res.send(loginPage("Incorrect password. Please try again."));
  }
});

router.post("/admin/logout", (_req, res) => {
  (res as any).clearCookie(ADMIN_COOKIE);
  res.redirect("/api/admin/login");
});

// ── Protected admin routes ──────────────────────────────────────────────────

router.get("/admin", requireAdmin, async (req, res) => {
  const stories = await db
    .select()
    .from(storiesTable)
    .orderBy(storiesTable.createdAt);
  res.setHeader("Content-Type", "text/html");
  res.send(adminPage(stories, req.query.msg as string | undefined));
});

router.post("/admin/stories/bulk", requireAdmin, async (req, res) => {
  const { stories } = req.body as { stories?: unknown[] };
  if (!Array.isArray(stories) || stories.length === 0) {
    res.status(400).json({ error: "stories must be a non-empty array" });
    return;
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of stories) {
    const s = raw as Record<string, unknown>;
    try {
      await db.insert(storiesTable).values({
        id: String(s.id),
        title: String(s.title),
        category: String(s.category),
        duration: Number(s.duration),
        ageMin: Number(s.ageMin),
        ageMax: Number(s.ageMax),
        description: String(s.description),
        thumbnailUrl: normalizeMediaUrl(s.thumbnailUrl as string | null),
        audioUrl: normalizeMediaUrl(s.audioUrl as string | null),
        videoUrl: normalizeMediaUrl(s.videoUrl as string | null),
        published: s.published !== false,
      }).onConflictDoNothing();
      inserted++;
    } catch (err) {
      skipped++;
      errors.push(`${s.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const message = `Imported ${inserted} stories.${skipped > 0 ? ` ${skipped} skipped (duplicate IDs).` : ""}`;
  res.json({ message, inserted, skipped, errors });
});

router.post("/admin/stories", requireAdmin, async (req, res) => {
  const b = req.body;
  try {
    await db.insert(storiesTable).values({
      id: b.id,
      title: b.title,
      category: b.category,
      duration: parseInt(b.duration, 10),
      ageMin: parseInt(b.ageMin, 10),
      ageMax: parseInt(b.ageMax, 10),
      description: b.description,
      thumbnailUrl: normalizeMediaUrl(b.thumbnailUrl),
      audioUrl: normalizeMediaUrl(b.audioUrl),
      videoUrl: normalizeMediaUrl(b.videoUrl),
      published: b.published === "true",
    });
    res.redirect("/api/admin?msg=Story+added+successfully");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const safe = encodeURIComponent("Error: " + msg.slice(0, 120));
    res.redirect(`/api/admin?msg=${safe}`);
  }
});

router.post("/admin/stories/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const b = req.body;
  try {
    await db
      .update(storiesTable)
      .set({
        title: b.title,
        category: b.category,
        duration: parseInt(b.duration, 10),
        ageMin: parseInt(b.ageMin, 10),
        ageMax: parseInt(b.ageMax, 10),
        description: b.description,
        thumbnailUrl: normalizeMediaUrl(b.thumbnailUrl),
        audioUrl: normalizeMediaUrl(b.audioUrl),
        videoUrl: normalizeMediaUrl(b.videoUrl),
        published: b.published === "true",
        updatedAt: new Date(),
      })
      .where(eq(storiesTable.id, id));
    res.redirect("/api/admin?msg=Story+updated+successfully");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const safe = encodeURIComponent("Error: " + msg.slice(0, 120));
    res.redirect(`/api/admin?msg=${safe}`);
  }
});

router.delete("/admin/stories/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  await db.delete(storiesTable).where(eq(storiesTable.id, id));
  res.status(204).send();
});

export default router;
