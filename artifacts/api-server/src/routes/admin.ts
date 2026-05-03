import { Router, type IRouter } from "express";
import { db, storiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const CATEGORIES = [
  "bedtime",
  "adventure",
  "animal",
  "songs",
  "mythology",
  "learning",
  "yoga",
  "nature",
  "funny",
  "classic",
];

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
    header{background:#2D3E5E;color:#FDF6E3;padding:16px 32px;display:flex;align-items:center;gap:12px}
    header h1{font-size:22px}
    header span{font-size:13px;opacity:0.7;margin-top:2px}
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
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;background:#f0f0e8;color:#555;font-weight:600;border-bottom:2px solid #e0e0d0}
    td{padding:10px 12px;border-bottom:1px solid #f0f0e8;vertical-align:middle}
    tr:hover td{background:#fffbf5}
    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:#f0f0e8;color:#555}
    .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;align-items:center;justify-content:center}
    .modal-overlay.open{display:flex}
    .modal{background:white;border-radius:14px;padding:28px;width:600px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2)}
    .modal h2{margin-bottom:20px;font-size:18px}
    .modal-close{float:right;background:none;border:none;font-size:22px;cursor:pointer;color:#999}
  </style>
</head>
<body>
<header>
  <div>
    <h1>🎙 Storytime Admin</h1>
    <span>Content Management</span>
  </div>
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
</script>
</body>
</html>`;
}

router.get("/admin", async (req, res) => {
  const stories = await db
    .select()
    .from(storiesTable)
    .orderBy(storiesTable.createdAt);
  res.setHeader("Content-Type", "text/html");
  res.send(adminPage(stories, req.query.msg as string | undefined));
});

router.post("/admin/stories", async (req, res) => {
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
      thumbnailUrl: b.thumbnailUrl || null,
      audioUrl: b.audioUrl || null,
      videoUrl: b.videoUrl || null,
      published: b.published === "true",
    });
    res.redirect("/api/admin?msg=Story+added+successfully");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const safe = encodeURIComponent("Error: " + msg.slice(0, 120));
    res.redirect(`/api/admin?msg=${safe}`);
  }
});

router.post("/admin/stories/:id", async (req, res) => {
  const { id } = req.params;
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
        thumbnailUrl: b.thumbnailUrl || null,
        audioUrl: b.audioUrl || null,
        videoUrl: b.videoUrl || null,
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

router.delete("/admin/stories/:id", async (req, res) => {
  const { id } = req.params;
  await db.delete(storiesTable).where(eq(storiesTable.id, id));
  res.status(204).send();
});

export default router;
