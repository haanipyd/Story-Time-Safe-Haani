import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { db, storiesTable, interactiveStoriesTable, storySegmentsTable, storyOptionsTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";
import { requireAdminAuth, setAdminCookie, clearAdminCookie } from "../middleware/auth";

const router: IRouter = Router();

function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

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

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

function adminCsp(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
  );
  next();
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
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/api/admin/login">
      <label>Password</label>
      <input type="password" name="password" autofocus placeholder="Enter admin password" required />
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`;
}

function interactiveStoriesSection(
  iStories: typeof interactiveStoriesTable.$inferSelect[],
) {
  const rows = iStories
    .map(
      (s) => `
    <tr>
      <td>${escapeHtml(s.id)}</td>
      <td>${escapeHtml(s.title)}</td>
      <td>${escapeHtml(s.language === "ml" ? "Malayalam" : "English")}</td>
      <td>${escapeHtml(s.ageMin)}–${escapeHtml(s.ageMax)}</td>
      <td>${s.thumbnailUrl ? `<img src="${escapeHtml(s.thumbnailUrl)}" width="40" height="40" style="object-fit:cover;border-radius:4px">` : "—"}</td>
      <td>${s.published ? "✅" : "❌"}</td>
      <td>
        <button class="is-edit-btn" data-id="${escapeHtml(s.id)}" style="padding:4px 10px;background:#2D3E5E;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px">Edit</button>
        <button class="is-delete-btn" data-id="${escapeHtml(s.id)}" data-title="${escapeHtml(s.title)}" style="padding:4px 10px;background:#c0392b;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;margin-left:4px">Delete</button>
      </td>
    </tr>`,
    )
    .join("");

  return `
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2>Interactive Stories (${iStories.length})</h2>
      <button class="btn btn-primary" onclick="openNewIS()">+ New Story</button>
    </div>
    <table>
      <thead><tr>
        <th>ID</th><th>Title</th><th>Language</th><th>Age</th><th>Cover</th><th>Published</th><th>Actions</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function adminPage(
  stories: typeof storiesTable.$inferSelect[],
  iStories: typeof interactiveStoriesTable.$inferSelect[],
  message?: string,
) {
  const rows = stories
    .map(
      (s) => `
    <tr>
      <td>${escapeHtml(s.id)}</td>
      <td>${escapeHtml(s.title)}</td>
      <td>${escapeHtml(s.category)}</td>
      <td>${escapeHtml(s.durationMin)}m</td>
      <td>${escapeHtml(s.ageMin)}–${escapeHtml(s.ageMax)}</td>
      <td>${s.audioUrl ? `<a href="${escapeHtml(s.audioUrl)}" target="_blank">Audio</a>` : "—"}</td>
      <td>${s.thumbnailUrl ? `<img src="${escapeHtml(s.thumbnailUrl)}" width="40" height="40" style="object-fit:cover;border-radius:4px">` : "—"}</td>
      <td>${s.isActive ? "✅" : "❌"}</td>
      <td>
        <button class="edit-btn" data-story="${escapeHtml(JSON.stringify(s))}" style="padding:4px 10px;background:#2D3E5E;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px">Edit</button>
        <button class="delete-btn" data-id="${escapeHtml(s.id)}" data-title="${escapeHtml(s.title)}" style="padding:4px 10px;background:#c0392b;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;margin-left:4px">Delete</button>
      </td>
    </tr>`,
    )
    .join("");

  const catOptions = CATEGORIES.map(
    (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`,
  ).join("");

  const flashHtml = message
    ? `<div class="flash ${message.startsWith("Error") ? "error" : ""}">${escapeHtml(message)}</div>`
    : "";

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
    .btn-sm{padding:6px 14px;font-size:13px}
    .btn-danger{background:#c0392b;color:white}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;background:#f0f0e8;color:#555;font-weight:600;border-bottom:2px solid #e0e0d0}
    td{padding:10px 12px;border-bottom:1px solid #f0f0e8;vertical-align:middle}
    tr:hover td{background:#fffbf5}
    .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;align-items:center;justify-content:center}
    .modal-overlay.open{display:flex}
    .modal{background:white;border-radius:14px;padding:28px;width:700px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)}
    .modal h2{margin-bottom:20px;font-size:18px}
    .modal-close{float:right;background:none;border:none;font-size:22px;cursor:pointer;color:#999}
    .import-area{width:100%;min-height:160px;font-family:monospace;font-size:12px;padding:12px;border:1px solid #ddd;border-radius:6px;background:#fafafa;resize:vertical}
    .import-result{margin-top:12px;font-size:13px;padding:10px 14px;border-radius:6px;display:none}
    .import-result.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;display:block}
    .import-result.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;display:block}
    /* Tabs */
    .tabs{display:flex;gap:0;margin-bottom:28px;border-bottom:2px solid #e0e0d0}
    .tab-btn{padding:10px 22px;background:none;border:none;font-size:15px;font-weight:600;color:#888;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:color .15s}
    .tab-btn.active{color:#E8826B;border-bottom-color:#E8826B}
    .tab-panel{display:none}
    .tab-panel.active{display:block}
    /* Segment builder */
    .segment-card{background:#f8f8f2;border:1px solid #e0e0d0;border-radius:10px;padding:16px;margin-bottom:12px;position:relative}
    .segment-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
    .segment-badge{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
    .badge-narration{background:#dbeafe;color:#1e40af}
    .badge-checkpoint{background:#fef9c3;color:#854d0e}
    .option-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;background:white;border:1px solid #e0e0d0;border-radius:6px;padding:8px 10px}
    .option-row input{margin-bottom:0}
    .correct-radio{width:auto!important;margin:0 4px 0 0}
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
  ${flashHtml}

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('audio')">📻 Audio Stories</button>
    <button class="tab-btn" onclick="switchTab('interactive')">🎮 Interactive Stories</button>
  </div>

  <!-- ── Audio Stories Tab ───────────────────────────── -->
  <div class="tab-panel active" id="tab-audio">

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
      <h2>🔐 Test OTP (No SMS)</h2>
      <p style="font-size:13px;color:#888;margin-bottom:12px">Generate a real OTP for any phone number without sending an SMS. Use this to test login in the APK when MSG91 is not configured.</p>
      <div class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px">Phone Number</label>
          <input id="testOtpPhone" type="text" placeholder="+919876543210" style="width:100%;box-sizing:border-box" />
        </div>
        <button class="btn btn-primary" onclick="generateTestOtp()" style="white-space:nowrap">Get OTP</button>
      </div>
      <div id="testOtpResult" style="margin-top:12px;display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px">
        <div style="font-size:13px;color:#555;margin-bottom:4px">Enter this OTP in the app:</div>
        <div id="testOtpCode" style="font-size:36px;font-weight:700;letter-spacing:8px;color:#166534;font-family:monospace"></div>
        <div id="testOtpExpiry" style="font-size:12px;color:#888;margin-top:6px"></div>
      </div>
      <div id="testOtpError" style="margin-top:12px;display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;font-size:13px;color:#991b1b"></div>
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

  </div><!-- /tab-audio -->

  <!-- ── Interactive Stories Tab ─────────────────────── -->
  <div class="tab-panel" id="tab-interactive">
    ${interactiveStoriesSection(iStories)}
  </div>

</main>

<!-- Edit audio story modal -->
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

<!-- Interactive story editor modal -->
<div class="modal-overlay" id="isOverlay">
  <div class="modal" style="width:760px">
    <button class="modal-close" onclick="closeIS()">✕</button>
    <h2 id="is_modal_title">New Interactive Story</h2>

    <div class="grid" style="margin-bottom:16px">
      <div>
        <label>Story ID (unique slug)</label>
        <input id="is_id" placeholder="e.g. is-rabbit-meal" />
      </div>
      <div>
        <label>Title</label>
        <input id="is_title" placeholder="Hoppy's Lunch" />
      </div>
      <div>
        <label>Language</label>
        <select id="is_language">
          <option value="en">English</option>
          <option value="ml">Malayalam</option>
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>Min Age</label><input id="is_ageMin" type="number" min="1" max="5" value="2" /></div>
        <div style="flex:1"><label>Max Age</label><input id="is_ageMax" type="number" min="1" max="5" value="5" /></div>
      </div>
      <div style="grid-column:1/-1">
        <label>Thumbnail URL</label>
        <input id="is_thumbnail" type="url" placeholder="https://… (PNG, JPG)" />
      </div>
      <div style="grid-column:1/-1">
        <label>Description</label>
        <textarea id="is_description" rows="2" placeholder="A short description for parents…"></textarea>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <strong style="font-size:14px">Segments</strong>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" onclick="addSegment('narration')">+ Narration</button>
        <button class="btn btn-sm btn-outline" onclick="addSegment('checkpoint')">+ Checkpoint</button>
      </div>
    </div>
    <div id="is_segments"></div>

    <div style="margin-top:16px;display:flex;gap:10px;align-items:center">
      <button class="btn btn-secondary" onclick="saveIS()">Save Story</button>
      <button class="btn btn-outline" onclick="closeIS()">Cancel</button>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:normal;cursor:pointer;margin-left:auto">
        <input type="checkbox" id="is_published" style="width:auto" />
        Published
      </label>
      <div id="is_save_msg" style="font-size:13px;display:none"></div>
    </div>
  </div>
</div>

<script>
// ── Tab switching ─────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ── Audio story edit/delete ───────────────────────────────
function openEdit(s) {
  document.getElementById('e_title').value = s.title;
  document.getElementById('e_category').value = s.category;
  document.getElementById('e_duration').value = s.durationMin;
  document.getElementById('e_ageMin').value = s.ageMin;
  document.getElementById('e_ageMax').value = s.ageMax;
  document.getElementById('e_description').value = s.description;
  document.getElementById('e_thumbnailUrl').value = s.thumbnailUrl || '';
  document.getElementById('e_audioUrl').value = s.audioUrl || '';
  document.getElementById('e_videoUrl').value = s.videoUrl || '';
  document.getElementById('e_published').checked = s.isActive;
  document.getElementById('editForm').action = '/api/admin/stories/' + encodeURIComponent(s.id);
  document.getElementById('editOverlay').classList.add('open');
}
function closeEdit() {
  document.getElementById('editOverlay').classList.remove('open');
}
document.getElementById('editOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeEdit();
});
document.addEventListener('click', async function(e) {
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    try { openEdit(JSON.parse(editBtn.dataset.story)); } catch(err) { alert('Could not load story data.'); }
    return;
  }
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const title = deleteBtn.dataset.title;
    if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
    const res = await fetch('/api/admin/stories/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok || res.status === 204) location.reload();
    else alert('Delete failed');
  }
  // Interactive story delete
  const isDeleteBtn = e.target.closest('.is-delete-btn');
  if (isDeleteBtn) {
    const id = isDeleteBtn.dataset.id;
    const title = isDeleteBtn.dataset.title;
    if (!confirm('Delete "' + title + '"? All segments and options will be removed.')) return;
    const res = await fetch('/api/admin/interactive-stories/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok || res.status === 204) location.reload();
    else alert('Delete failed');
  }
  // Interactive story edit
  const isEditBtn = e.target.closest('.is-edit-btn');
  if (isEditBtn) {
    loadISForEdit(isEditBtn.dataset.id);
  }
});

// ── Bulk import ───────────────────────────────────────────
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

// ── Test OTP ──────────────────────────────────────────────
async function generateTestOtp() {
  const phone = document.getElementById('testOtpPhone').value.trim();
  const resultBox = document.getElementById('testOtpResult');
  const errorBox = document.getElementById('testOtpError');
  const codeEl = document.getElementById('testOtpCode');
  const expiryEl = document.getElementById('testOtpExpiry');
  resultBox.style.display = 'none';
  errorBox.style.display = 'none';
  try {
    const res = await fetch('/api/auth/test-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorBox.textContent = data?.error?.message || 'Failed to generate OTP';
      errorBox.style.display = 'block';
      return;
    }
    codeEl.textContent = data.otp;
    expiryEl.textContent = 'Valid for ' + (data.expires_in / 60) + ' minutes. Enter this in the app after requesting OTP for ' + phone;
    resultBox.style.display = 'block';
  } catch (e) {
    errorBox.textContent = 'Network error: ' + e.message;
    errorBox.style.display = 'block';
  }
}

// ── Interactive Story Editor ──────────────────────────────
let isEditingId = null;
let isSegments = [];

function uid() {
  return 'seg-' + Math.random().toString(36).slice(2, 9);
}
function optUid() {
  return 'opt-' + Math.random().toString(36).slice(2, 9);
}

function openNewIS() {
  isEditingId = null;
  isSegments = [];
  document.getElementById('is_modal_title').textContent = 'New Interactive Story';
  document.getElementById('is_id').value = '';
  document.getElementById('is_id').disabled = false;
  document.getElementById('is_title').value = '';
  document.getElementById('is_language').value = 'en';
  document.getElementById('is_ageMin').value = '2';
  document.getElementById('is_ageMax').value = '5';
  document.getElementById('is_thumbnail').value = '';
  document.getElementById('is_description').value = '';
  document.getElementById('is_published').checked = false;
  document.getElementById('is_save_msg').style.display = 'none';
  renderSegments();
  document.getElementById('isOverlay').classList.add('open');
}

async function loadISForEdit(id) {
  try {
    const res = await fetch('/api/interactive-stories/' + encodeURIComponent(id));
    if (!res.ok) {
      // Try fetching from admin endpoint (story may be unpublished)
      const res2 = await fetch('/api/admin/interactive-stories/' + encodeURIComponent(id));
      if (!res2.ok) { alert('Could not load story'); return; }
      var data = await res2.json();
    } else {
      var data = await res.json();
    }
    isEditingId = data.id;
    isSegments = (data.segments || []).map(seg => ({
      ...seg,
      options: seg.options || []
    }));
    document.getElementById('is_modal_title').textContent = 'Edit: ' + data.title;
    document.getElementById('is_id').value = data.id;
    document.getElementById('is_id').disabled = true;
    document.getElementById('is_title').value = data.title || '';
    document.getElementById('is_language').value = data.language || 'en';
    document.getElementById('is_ageMin').value = data.ageMin || 2;
    document.getElementById('is_ageMax').value = data.ageMax || 5;
    document.getElementById('is_thumbnail').value = data.thumbnailUrl || '';
    document.getElementById('is_description').value = data.description || '';
    document.getElementById('is_published').checked = !!data.published;
    document.getElementById('is_save_msg').style.display = 'none';
    renderSegments();
    document.getElementById('isOverlay').classList.add('open');
  } catch(e) { alert('Error loading story: ' + e.message); }
}

function closeIS() {
  document.getElementById('isOverlay').classList.remove('open');
}
document.getElementById('isOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeIS();
});

function addSegment(type) {
  isSegments.push({
    id: uid(),
    orderIndex: isSegments.length,
    type,
    audioUrl: '',
    sceneImageUrl: '',
    questionText: '',
    options: type === 'checkpoint' ? [
      { id: optUid(), label: '', emoji: '', imageUrl: '', isCorrect: true, displayOrder: 0 },
      { id: optUid(), label: '', emoji: '', imageUrl: '', isCorrect: false, displayOrder: 1 },
    ] : []
  });
  renderSegments();
}

function removeSegment(segId) {
  isSegments = isSegments.filter(s => s.id !== segId);
  isSegments.forEach((s, i) => s.orderIndex = i);
  renderSegments();
}

function addOption(segId) {
  const seg = isSegments.find(s => s.id === segId);
  if (!seg) return;
  seg.options.push({ id: optUid(), label: '', emoji: '', imageUrl: '', isCorrect: false, displayOrder: seg.options.length });
  renderSegments();
}

function removeOption(segId, optId) {
  const seg = isSegments.find(s => s.id === segId);
  if (!seg) return;
  seg.options = seg.options.filter(o => o.id !== optId);
  seg.options.forEach((o, i) => o.displayOrder = i);
  renderSegments();
}

function renderSegments() {
  const container = document.getElementById('is_segments');
  if (isSegments.length === 0) {
    container.innerHTML = '<div style="color:#aaa;font-size:13px;padding:12px 0;text-align:center">No segments yet. Add a Narration or Checkpoint segment above.</div>';
    return;
  }
  container.innerHTML = isSegments.map((seg, idx) => {
    const badge = seg.type === 'narration'
      ? '<span class="segment-badge badge-narration">🔊 Narration</span>'
      : '<span class="segment-badge badge-checkpoint">❓ Checkpoint</span>';

    const optionsHtml = seg.type === 'checkpoint' ? \`
      <div style="margin-top:10px">
        <label style="font-size:12px;font-weight:700;color:#666;margin-bottom:6px">Options (radio = correct answer)</label>
        \${seg.options.map(opt => \`
          <div class="option-row">
            <input type="radio" class="correct-radio" name="correct_\${seg.id}" \${opt.isCorrect ? 'checked' : ''} onchange="setCorrect('\${seg.id}', '\${opt.id}')" />
            <input style="width:80px" placeholder="Emoji" value="\${opt.emoji}" oninput="updateOpt('\${seg.id}','\${opt.id}','emoji',this.value)" />
            <input style="flex:1" placeholder="Label (e.g. Carrot)" value="\${opt.label}" oninput="updateOpt('\${seg.id}','\${opt.id}','label',this.value)" />
            <input style="flex:2" placeholder="Image URL (optional)" value="\${opt.imageUrl}" oninput="updateOpt('\${seg.id}','\${opt.id}','imageUrl',this.value)" />
            <button onclick="removeOption('\${seg.id}','\${opt.id}')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:16px;padding:0 4px">✕</button>
          </div>
        \`).join('')}
        <button class="btn btn-sm btn-outline" style="margin-top:6px" onclick="addOption('\${seg.id}')">+ Add Option</button>
      </div>
    \` : '';

    return \`
      <div class="segment-card">
        <div class="segment-header">
          <span style="color:#aaa;font-size:13px;font-weight:700">#\${idx + 1}</span>
          \${badge}
          <button onclick="removeSegment('\${seg.id}')" style="margin-left:auto;background:none;border:none;color:#c0392b;cursor:pointer;font-size:15px">Remove</button>
        </div>
        <div class="grid">
          <div style="grid-column:1/-1">
            <label>Audio URL</label>
            <input placeholder="https://… (MP3, M4A)" value="\${seg.audioUrl}" oninput="updateSeg('\${seg.id}','audioUrl',this.value)" />
          </div>
          \${seg.type === 'narration' ? \`
          <div style="grid-column:1/-1">
            <label>Scene Image URL (optional)</label>
            <input placeholder="https://… (PNG, JPG)" value="\${seg.sceneImageUrl}" oninput="updateSeg('\${seg.id}','sceneImageUrl',this.value)" />
          </div>\` : \`
          <div style="grid-column:1/-1">
            <label>Question Text (read aloud)</label>
            <input placeholder="Which one should Hoppy eat?" value="\${seg.questionText}" oninput="updateSeg('\${seg.id}','questionText',this.value)" />
          </div>\`}
        </div>
        \${optionsHtml}
      </div>
    \`;
  }).join('');
}

function updateSeg(segId, field, value) {
  const seg = isSegments.find(s => s.id === segId);
  if (seg) seg[field] = value;
}

function updateOpt(segId, optId, field, value) {
  const seg = isSegments.find(s => s.id === segId);
  if (!seg) return;
  const opt = seg.options.find(o => o.id === optId);
  if (opt) opt[field] = value;
}

function setCorrect(segId, optId) {
  const seg = isSegments.find(s => s.id === segId);
  if (!seg) return;
  seg.options.forEach(o => o.isCorrect = o.id === optId);
}

async function saveIS() {
  const msg = document.getElementById('is_save_msg');
  const id = document.getElementById('is_id').value.trim();
  const title = document.getElementById('is_title').value.trim();
  if (!id || !title) { msg.style.display='inline'; msg.style.color='#c0392b'; msg.textContent='ID and Title are required.'; return; }

  const payload = {
    id,
    title,
    language: document.getElementById('is_language').value,
    ageMin: parseInt(document.getElementById('is_ageMin').value),
    ageMax: parseInt(document.getElementById('is_ageMax').value),
    thumbnailUrl: document.getElementById('is_thumbnail').value.trim(),
    description: document.getElementById('is_description').value.trim(),
    published: document.getElementById('is_published').checked,
    segments: isSegments,
  };

  const url = isEditingId
    ? '/api/admin/interactive-stories/' + encodeURIComponent(isEditingId)
    : '/api/admin/interactive-stories';
  const method = isEditingId ? 'PUT' : 'POST';

  msg.style.display = 'inline';
  msg.style.color = '#888';
  msg.textContent = 'Saving…';

  try {
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok || res.status === 201) {
      msg.style.color = '#155724';
      msg.textContent = 'Saved!';
      setTimeout(() => { closeIS(); location.reload(); }, 800);
    } else {
      msg.style.color = '#c0392b';
      msg.textContent = data.error || 'Save failed';
    }
  } catch(e) {
    msg.style.color = '#c0392b';
    msg.textContent = 'Network error: ' + e.message;
  }
}
</script>
</body>
</html>`;
}

// ── CSP middleware for all admin HTML routes ────────────────────────────────
router.use("/admin", adminCsp);

// ── Auth routes (no session guard) ─────────────────────────────────────────

router.get("/admin/login", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(loginPage());
});

router.post("/admin/login", adminLoginLimiter, (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.setHeader("Content-Type", "text/html");
    res.status(500).send(loginPage("ADMIN_PASSWORD is not set. Ask your developer to configure it."));
    return;
  }

  const passwordBuf = Buffer.from(String(password ?? ""));
  const adminBuf = Buffer.from(adminPassword);
  const lengthsMatch = passwordBuf.length === adminBuf.length;
  const compareBuf = lengthsMatch ? adminBuf : Buffer.alloc(passwordBuf.length);
  const equal = crypto.timingSafeEqual(passwordBuf, compareBuf) && lengthsMatch;

  if (equal) {
    setAdminCookie(res);
    res.redirect("/api/admin");
  } else {
    res.setHeader("Content-Type", "text/html");
    res.send(loginPage("Incorrect password. Please try again."));
  }
});

router.post("/admin/logout", (_req, res) => {
  clearAdminCookie(res);
  res.redirect("/api/admin/login");
});

// ── Protected admin routes ──────────────────────────────────────────────────

router.get("/admin", requireAdminAuth, async (req, res) => {
  const [stories, iStories] = await Promise.all([
    db.select().from(storiesTable).orderBy(storiesTable.publishedAt),
    db.select().from(interactiveStoriesTable).orderBy(interactiveStoriesTable.createdAt),
  ]);
  res.setHeader("Content-Type", "text/html");
  res.send(adminPage(stories, iStories, req.query.msg as string | undefined));
});

// ── Admin: get single interactive story (for edit, includes unpublished) ─────
router.get("/admin/interactive-stories/:id", requireAdminAuth, async (req, res) => {
  const storyId = String(req.params["id"]);
  const [story] = await db.select().from(interactiveStoriesTable).where(eq(interactiveStoriesTable.id, storyId)).limit(1);
  if (!story) { res.status(404).json({ error: "Not found" }); return; }
  const segments = await db.select().from(storySegmentsTable).where(eq(storySegmentsTable.storyId, storyId)).orderBy(asc(storySegmentsTable.orderIndex));
  const segIds = segments.map(s => s.id);
  const options = segIds.length > 0
    ? await db.select().from(storyOptionsTable).where(inArray(storyOptionsTable.segmentId, segIds)).orderBy(asc(storyOptionsTable.displayOrder))
    : [];
  const bySegment = options.reduce<Record<string, typeof storyOptionsTable.$inferSelect[]>>((a, o) => { (a[o.segmentId] ??= []).push(o); return a; }, {});
  res.json({ ...story, segments: segments.map(s => ({ ...s, options: bySegment[s.id] ?? [] })) });
});

router.post("/admin/stories/bulk", requireAdminAuth, async (req, res) => {
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
        durationMin: Number(s.duration ?? (s as any).durationMin ?? 5),
        ageMin: Number(s.ageMin),
        ageMax: Number(s.ageMax),
        description: String(s.description),
        thumbnailUrl: normalizeMediaUrl(s.thumbnailUrl as string | null) ?? "",
        audioUrl: normalizeMediaUrl(s.audioUrl as string | null) ?? "",
        isActive: s.published !== false,
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

router.post("/admin/stories", requireAdminAuth, async (req, res) => {
  const b = req.body;
  try {
    await db.insert(storiesTable).values({
      id: b.id,
      title: b.title,
      category: b.category,
      durationMin: parseInt(b.duration, 10),
      ageMin: parseInt(b.ageMin, 10),
      ageMax: parseInt(b.ageMax, 10),
      description: b.description,
      thumbnailUrl: normalizeMediaUrl(b.thumbnailUrl) ?? "",
      audioUrl: normalizeMediaUrl(b.audioUrl) ?? "",
      isActive: b.published === "true",
    });
    res.redirect("/api/admin?msg=Story+added+successfully");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const safe = encodeURIComponent("Error: " + msg.slice(0, 120));
    res.redirect(`/api/admin?msg=${safe}`);
  }
});

router.post("/admin/stories/:id", requireAdminAuth, async (req, res) => {
  const id = String(req.params.id);
  const b = req.body;
  try {
    await db
      .update(storiesTable)
      .set({
        title: b.title,
        category: b.category,
        durationMin: parseInt(b.duration, 10),
        ageMin: parseInt(b.ageMin, 10),
        ageMax: parseInt(b.ageMax, 10),
        description: b.description,
        thumbnailUrl: normalizeMediaUrl(b.thumbnailUrl) ?? undefined,
        audioUrl: normalizeMediaUrl(b.audioUrl) ?? undefined,
        isActive: b.published === "true",
      })
      .where(eq(storiesTable.id, id));
    res.redirect("/api/admin?msg=Story+updated+successfully");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const safe = encodeURIComponent("Error: " + msg.slice(0, 120));
    res.redirect(`/api/admin?msg=${safe}`);
  }
});

router.delete("/admin/stories/:id", requireAdminAuth, async (req, res) => {
  const id = String(req.params.id);
  await db.delete(storiesTable).where(eq(storiesTable.id, id));
  res.status(204).send();
});

export default router;
