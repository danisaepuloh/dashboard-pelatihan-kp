# Dashboard Pelatihan Masyarakat Kelautan dan Perikanan

Dashboard interaktif (filter tahun, bulan, penyelenggara, metode, skema, program terobosan, bidang, domisili dalam/luar negeri),
dengan **database di Google Sheets**, **API di Google Apps Script**, dan **tampilan di GitHub Pages**.

```
 Google Sheets (database)  ──▶  Apps Script (API JSON)  ──▶  GitHub Pages (tampilan responsif)
   Peserta, Target               Code.gs, cache 6 jam          docs/index.html + css + js
```

| Bagian | Isi | Lokasi |
|---|---|---|
| Database | 140.400 baris peserta 2022–2026 | Google Sheets Anda (bukan GitHub) |
| Backend | `apps-script/Code.gs` | Google Apps Script |
| Frontend | `docs/` | GitHub Pages |

> **Keamanan data.** Nama peserta adalah data pribadi. Karena itu data **tidak** disimpan di GitHub. Halaman GitHub Pages bersifat
> publik, sedangkan daftar nama peserta hanya dapat dibuka dengan **token** yang Anda tetapkan di Apps Script.
> Data agregat (angka & grafik) bersifat publik secara bawaan; kunci juga dengan `PUBLIC_AGGREGATE = false` bila perlu.

---

## Langkah 1 – Buat database di Google Sheets
1. Buat Google Sheet baru (mis. “Database Pelatihan KP”).
2. **File → Import → Upload** `data-import-JANGAN-DI-GITHUB/Peserta.csv` → pilih **Insert new sheet(s)**.
   **Hilangkan centang “Convert text to numbers, dates, and formulas”** → Import.
3. Ulangi untuk `Target.csv`.
4. Ubah nama kedua tab **persis** menjadi `Peserta` dan `Target`. Hapus tab kosong bawaan.

Kolom sheet `Peserta` (urutan kolom bebas, yang dibaca adalah **nama header**):

| Kolom | Isi |
|---|---|
| IDPelatihan | kode unik pelatihan, mis. `P2025-0001` (satu pelatihan = nama + penyelenggara + bulan) |
| Tahun, Bulan | angka (Bulan 1–12) |
| Penyelenggara, NamaPelatihan, Bidang, Metode, Skema, ProgramTerobosan | teks (isi `Tidak tercatat` bila tidak ada) |
| NamaPeserta, JK (L/P), Pendidikan | data peserta |
| KabKota, Provinsi | domisili. Peserta luar negeri: Provinsi = `Luar Negeri` |
| Negara, Domisili | `Indonesia` / `Dalam negeri`, atau nama negara / `Luar negeri` |

Sheet `Target`: `Tahun, Target, Realisasi, Keterangan, Parsial` (Parsial = 1 bila tahun belum penuh; Target boleh kosong).

## Langkah 2 – Pasang backend Apps Script
1. Di Google Sheet: **Extensions → Apps Script**.
2. Ganti isi `Code.gs` dengan isi `apps-script/Code.gs`.
3. (Opsional) **Project Settings → Show “appsscript.json”** lalu samakan dengan `apps-script/appsscript.json`.
4. Jalankan fungsi `setupToken` (klik **Run**, setujui izin akses). Token muncul di **Execution log**.
   Atau buat sendiri: **Project Settings → Script properties → Add** `API_TOKEN` = kata sandi pilihan Anda.
5. Jalankan `rebuildIndex` (pertama kali ±10–40 detik) lalu `installTriggers` (cache otomatis diperbarui tiap 4 jam).

## Langkah 3 – Deploy sebagai Web App
1. **Deploy → New deployment → Select type: Web app**
2. *Execute as*: **Me** · *Who has access*: **Anyone**
3. **Deploy**, salin **Web app URL** (berakhiran `/exec`).
4. Uji di browser: `URL/exec?action=ping` → harus muncul `{"ok":true,...}`.

> Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** (URL tetap sama).

## Langkah 4 – Pasang tampilan di GitHub Pages
1. Buka `docs/js/config.js`, ganti `API_URL` dengan URL Web App dari Langkah 3.
2. Buat repositori GitHub, unggah folder proyek ini (`.gitignore` sudah mencegah CSV ikut terunggah).
   ```bash
   git init && git add . && git commit -m "Dashboard pelatihan KP"
   git branch -M main && git remote add origin https://github.com/<akun>/<repo>.git && git push -u origin main
   ```
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `main`, folder `/docs`** → Save.
4. Dashboard aktif di `https://<akun>.github.io/<repo>/` (±1–2 menit).

## Memperbarui data
1. Tambahkan baris baru di sheet `Peserta` (boleh dikosongkan kolom `IDPelatihan`).
2. Menu **Dashboard KKP → Isi ID pelatihan yang kosong**, lalu **Perbarui data dashboard**.
3. Di dashboard klik **⟳ Muat ulang**. Tanpa langkah 2, data baru muncul otomatis paling lama 4 jam kemudian.

Tips agar data bersih: gunakan *Data → Data validation (dropdown)* untuk Provinsi, Bidang, Metode, Skema, JK, dan Penyelenggara
supaya tidak muncul variasi tulisan.

## Menambahkan logo / mengubah warna
- Letakkan logo resmi di `docs/img/` dan isi `LOGO_URL: "img/logo.png"` di `config.js`.
- Warna ada di bagian `:root` pada `docs/css/style.css` (`--navy`, `--blue`, `--cyan`, `--gold`). Tampilan otomatis mengikuti mode terang/gelap perangkat.

## Batasan yang perlu diketahui
- Google Sheets maksimum 10 juta sel. Dengan 16 kolom, kapasitas ±600 ribu baris peserta (saat ini 140 ribu).
- Pemuatan pertama setelah cache kedaluwarsa bisa 10–40 detik; setelah itu cepat. Trigger 4 jam menjaga cache tetap hangat.
- Token dikirim sebagai parameter URL (HTTPS). Cukup untuk pembatasan akses internal; untuk keamanan lebih tinggi, ganti alamat Web App
  ke domain organisasi (Workspace) dan batasi akses ke akun tertentu.
- Halaman GitHub Pages dari repositori privat tetap dapat diakses publik (kecuali paket GitHub Enterprise); jangan menaruh data apa pun di repositori.
