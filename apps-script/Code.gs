/**
 * Dashboard Pelatihan Masyarakat KP – Backend (Google Apps Script)
 * Database : Google Sheets (sheet "Peserta" dan "Target")
 * API      : Web App (doGet) → JSON
 *
 * Endpoint:
 *   ?action=ping
 *   ?action=bootstrap[&token=..]   → data agregat untuk seluruh grafik (publik secara bawaan)
 *   ?action=peserta&key=2025-0001&token=..  → daftar peserta 1 pelatihan (WAJIB token)
 *
 * Script Properties (Project Settings → Script properties):
 *   API_TOKEN        (wajib)  kata sandi untuk melihat nama peserta
 *   PUBLIC_AGGREGATE (opsi)   "false" = data agregat pun wajib token (bawaan: true)
 *   SHEET_ID         (opsi)   isi bila script TIDAK terpasang di dalam spreadsheet
 */

const SHEET_PESERTA = 'Peserta';
const SHEET_TARGET = 'Target';
const CACHE_KEY = 'kkp_bootstrap_v1';
const CHUNK = 30000;           // karakter per potongan cache (batas CacheService 100 KB/nilai)
const CACHE_TTL = 21600;       // 6 jam (maksimum CacheService)
const ORDER_NOTE = 'Kolom dibaca berdasarkan NAMA header, urutan kolom bebas.';
const H = { id: 'IDPelatihan', tahun: 'Tahun', bulan: 'Bulan', bal: 'Penyelenggara', pel: 'NamaPelatihan',
  bid: 'Bidang', met: 'Metode', ska: 'Skema', ter: 'ProgramTerobosan', nama: 'NamaPeserta', jk: 'JK',
  pend: 'Pendidikan', kab: 'KabKota', prov: 'Provinsi', neg: 'Negara', dom: 'Domisili' };

/* ============================ LOGIKA MURNI (dapat diuji di luar Google) ============================ */

function colMap_(header) {
  const m = {};
  header.forEach((h, i) => { m[String(h).trim()] = i; });
  Object.values(H).forEach(n => { if (!(n in m)) throw new Error('Kolom "' + n + '" tidak ditemukan di sheet Peserta. ' + ORDER_NOTE); });
  return m;
}

function modeOf_(counts) {            // nilai terbanyak; bila seri → urutan abjad terkecil
  let best = null, bc = -1;
  Object.keys(counts).forEach(k => {
    const c = counts[k];
    if (c > bc || (c === bc && k < best)) { best = k; bc = c; }
  });
  return best;
}

/** values = baris data (tanpa header); cm = hasil colMap_; targets = [[tahun,target,realisasi,ket,parsial],...] */
function buildBootstrap_(values, cm, targets) {
  const sets = { bal: new Set(), bid: new Set(), met: new Set(), ska: new Set(), ter: new Set() };
  const evs = new Map(), locs = new Map(), cnt = new Map();
  const s = v => String(v === null || v === undefined ? '' : v).trim();

  for (let i = 0; i < values.length; i++) {
    const r = values[i], id = s(r[cm[H.id]]);
    if (!id) continue;
    let e = evs.get(id);
    if (!e) {
      e = { id: id, pel: s(r[cm[H.pel]]), bal: s(r[cm[H.bal]]), tahun: Number(r[cm[H.tahun]]), bulan: Number(r[cm[H.bulan]]),
        bid: {}, met: {}, ska: {}, ter: {} };
      evs.set(id, e);
    }
    ['bid', 'met', 'ska', 'ter'].forEach(k => { const v = s(r[cm[H[k]]]) || 'Tidak tercatat'; e[k][v] = (e[k][v] || 0) + 1; });
    const lk = s(r[cm[H.prov]]) + '\u0001' + s(r[cm[H.kab]]);
    if (!locs.has(lk)) locs.set(lk, 0);
    const ck = id + '\u0002' + lk;
    cnt.set(ck, (cnt.get(ck) || 0) + 1);
  }

  const evList = Array.from(evs.values()).sort((a, b) => a.id < b.id ? -1 : 1);
  evList.forEach(e => {
    e.bidM = modeOf_(e.bid); e.metM = modeOf_(e.met); e.skaM = modeOf_(e.ska); e.terM = modeOf_(e.ter);
    sets.bal.add(e.bal); sets.bid.add(e.bidM); sets.met.add(e.metM); sets.ska.add(e.skaM); sets.ter.add(e.terM);
  });
  const dim = {}, ix = {};
  Object.keys(sets).forEach(k => {
    dim[k] = Array.from(sets[k]).sort((a, b) => a.localeCompare(b, 'id'));
    ix[k] = new Map(dim[k].map((v, i) => [v, i]));
  });
  const locList = Array.from(locs.keys()).map(k => k.split('\u0001'));
  const locIdx = new Map(locList.map((p, i) => [p[0] + '\u0001' + p[1], i]));
  const evIdx = new Map(evList.map((e, i) => [e.id, i]));

  const ev = evList.map(e => [e.pel, ix.bal.get(e.bal), ix.bid.get(e.bidM), e.tahun, e.bulan,
    ix.met.get(e.metM), ix.ska.get(e.skaM), ix.ter.get(e.terM), e.id]);
  const rows = [];
  cnt.forEach((n, k) => {
    const p = k.split('\u0002');
    rows.push([evIdx.get(p[0]), locIdx.get(p[1]), n]);
  });

  const tg = {};
  (targets || []).forEach(t => {
    if (!t[0]) return;
    const tgt = (t[1] === '' || t[1] === null || t[1] === undefined) ? null : Number(t[1]);
    const a = [tgt, Number(t[2]) || 0, String(t[3] || 'Realisasi')];
    if (Number(t[4]) === 1) a.push(1);
    tg[String(t[0])] = a;
  });
  return { ev: ev, loc: locList, rows: rows, bal: dim.bal, bid: dim.bid, met: dim.met, ska: dim.ska, ter: dim.ter, tg: tg,
    meta: { generated: new Date().toISOString(), peserta: values.length, pelatihan: ev.length } };
}

/** Pilih peserta dari satu pelatihan. ids = kolom ID (1 kolom), rowsFetcher(startRow,count) → array baris */
function findRuns_(ids, key) {
  const runs = [];
  let start = -1;
  for (let i = 0; i < ids.length; i++) {
    const hit = String(ids[i][0]).trim() === key;
    if (hit && start < 0) start = i;
    if (!hit && start >= 0) { runs.push([start, i - start]); start = -1; }
  }
  if (start >= 0) runs.push([start, ids.length - start]);
  return runs;
}

/* ============================ AKSES SHEETS ============================ */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function readPeserta_() {
  const sh = ss_().getSheetByName(SHEET_PESERTA);
  if (!sh) throw new Error('Sheet "' + SHEET_PESERTA + '" tidak ada.');
  const last = sh.getLastRow(), cols = sh.getLastColumn();
  const header = sh.getRange(1, 1, 1, cols).getValues()[0];
  const values = last > 1 ? sh.getRange(2, 1, last - 1, cols).getValues() : [];
  return { header: header, values: values, sheet: sh };
}

function readTargets_() {
  const sh = ss_().getSheetByName(SHEET_TARGET);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues();
}

function computeAndCache_() {
  const p = readPeserta_(), cm = colMap_(p.header);
  const data = buildBootstrap_(p.values, cm, readTargets_());
  const json = JSON.stringify(data), cache = CacheService.getScriptCache(), put = {};
  const n = Math.ceil(json.length / CHUNK);
  for (let i = 0; i < n; i++) put[CACHE_KEY + '_' + i] = json.substr(i * CHUNK, CHUNK);
  put[CACHE_KEY + '_n'] = String(n);
  cache.putAll(put, CACHE_TTL);
  return json;
}

function getBootstrapJson_() {
  const cache = CacheService.getScriptCache(), n = Number(cache.get(CACHE_KEY + '_n') || 0);
  if (n > 0) {
    const keys = []; for (let i = 0; i < n; i++) keys.push(CACHE_KEY + '_' + i);
    const got = cache.getAll(keys);
    if (keys.every(k => got[k] !== undefined)) return keys.map(k => got[k]).join('');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return computeAndCache_(); } finally { lock.releaseLock(); }
}

function getPeserta_(key) {
  const p = readPeserta_(), cm = colMap_(p.header), sh = p.sheet;
  const ids = sh.getRange(2, cm[H.id] + 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  const runs = findRuns_(ids, key), out = [], cols = sh.getLastColumn();
  runs.forEach(r => {
    sh.getRange(2 + r[0], 1, r[1], cols).getValues().forEach(v => {
      out.push([String(v[cm[H.nama]]), String(v[cm[H.jk]]), String(v[cm[H.pend]]), String(v[cm[H.kab]]),
        String(v[cm[H.prov]]), String(v[cm[H.neg]])]);
    });
  });
  return out;
}

/* ============================ API ============================ */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function tokenOk_(t) {
  const real = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!real || !t) return false;
  const a = String(t), b = String(real);
  let diff = a.length ^ b.length;                      // perbandingan waktu-tetap
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function doGet(e) {
  const q = (e && e.parameter) || {}, action = q.action || 'bootstrap';
  try {
    const props = PropertiesService.getScriptProperties();
    if (action === 'ping') return json_({ ok: true, time: new Date().toISOString() });
    if (action === 'bootstrap') {
      const open = props.getProperty('PUBLIC_AGGREGATE') !== 'false';
      if (!open && !tokenOk_(q.token)) return json_({ ok: false, error: 'unauthorized' });
      return ContentService.createTextOutput('{"ok":true,"data":' + getBootstrapJson_() + '}').setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'peserta') {
      if (!tokenOk_(q.token)) return json_({ ok: false, error: 'unauthorized' });
      const key = String(q.key || '').trim();
      if (!/^[0-9A-Za-z\-_]{1,40}$/.test(key)) return json_({ ok: false, error: 'key tidak valid' });
      return json_({ ok: true, data: getPeserta_(key) });
    }
    return json_({ ok: false, error: 'action tidak dikenal' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ============================ ALAT ADMIN (menu di Google Sheets) ============================ */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Dashboard KKP')
      .addItem('Perbarui data dashboard (bangun ulang cache)', 'rebuildIndex')
      .addItem('Isi ID pelatihan yang kosong', 'ensureIds')
      .addItem('Pasang pembaruan otomatis (tiap 4 jam)', 'installTriggers')
      .addToUi();
  } catch (e) { /* bukan konteks spreadsheet */ }
}

/** Isi kolom IDPelatihan untuk baris baru (pelatihan yang sama = ID yang sama). */
function ensureIds() {
  const p = readPeserta_(), cm = colMap_(p.header), sh = p.sheet, v = p.values;
  const kOf = r => [r[cm[H.tahun]], r[cm[H.bulan]], String(r[cm[H.bal]]).trim(), String(r[cm[H.pel]]).trim()].join('\u0001');
  const byKey = new Map(), seq = {};
  v.forEach(r => {
    const id = String(r[cm[H.id]]).trim();
    if (!id) return;
    byKey.set(kOf(r), id);
    const m = id.match(/^P(\d{4})-(\d+)$/);
    if (m) seq[m[1]] = Math.max(seq[m[1]] || 0, Number(m[2]));
  });
  let added = 0;
  const col = v.map(r => {
    let id = String(r[cm[H.id]]).trim();
    if (id) return [id];
    const k = kOf(r);
    if (!byKey.has(k)) { const y = String(r[cm[H.tahun]]); seq[y] = (seq[y] || 0) + 1; byKey.set(k, 'P' + y + '-' + String(seq[y]).padStart(4, '0')); }
    added++;
    return [byKey.get(k)];
  });
  if (added) sh.getRange(2, cm[H.id] + 1, col.length, 1).setValues(col);
  try { SpreadsheetApp.getUi().alert('ID terisi untuk ' + added + ' baris.'); } catch (e) {}
  return added;
}

function rebuildIndex() {
  CacheService.getScriptCache().remove(CACHE_KEY + '_n');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { computeAndCache_(); } finally { lock.releaseLock(); }
  try { SpreadsheetApp.getUi().alert('Data dashboard diperbarui.'); } catch (e) {}
}

function warmCache() { rebuildIndex(); }

function installTriggers() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'warmCache').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('warmCache').timeBased().everyHours(4).create();
}

/** Jalankan SEKALI untuk membuat token acak bila belum ada; token dapat dilihat di Log eksekusi. */
function setupToken() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_TOKEN')) {
    props.setProperty('API_TOKEN', Utilities.getUuid().replace(/-/g, '').substr(0, 16));
  }
  Logger.log('API_TOKEN = ' + props.getProperty('API_TOKEN'));
}

if (typeof module !== 'undefined') module.exports = { buildBootstrap_, colMap_, findRuns_, modeOf_, H };
