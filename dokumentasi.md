# Dokumentasi Project AgroSmart AI Mobile

Dokumen ini berisi penjelasan lengkap mengenai struktur folder (kodingan) dan alur jalannya aplikasi (User Flow). Dokumentasi ini berguna untuk memahami bagaimana setiap bagian saling terhubung.

---

## 1. Struktur Folder & File Utama
Berikut adalah struktur folder dalam proyek ini beserta fungsinya:

```text
d:\terakhir\
├── android/            # Folder khusus berisi kode native Android. Dibuat otomatis oleh Capacitor buat nge-build aplikasi jadi APK.
├── src/                # Folder PALING PENTING. Semua kodingan UI (tampilan) dan logika React ada di sini.
│   ├── App.tsx         # File utama aplikasi! Semua tab (Dashboard, Hama, Chat, dll) nyatu di sini.
│   ├── index.css       # File untuk ngatur desain/styling warna-warni aplikasi (CSS).
│   ├── lib/            # Folder untuk fungsi-fungsi pendukung (Library):
│   │   ├── AuthContext.tsx # Ngurusin sesi user (siapa yang lagi login).
│   │   ├── firebase.ts     # Kodingan buat nyambungin aplikasi kita ke database Firebase.
│   │   └── utils.ts        # Kumpulan rumus pembantu (misal: buat ngecilin ukuran foto sebelum dikirim).
│   └── services/       # Folder buat nyambungin aplikasi ke AI & Internet (API):
│       ├── deepseek.ts # Nyambung ke AI DeepSeek.
│       ├── gemini.ts   # Nyambung ke Google Gemini (buat deteksi gambar hama & chat).
│       └── weather.ts  # Nyambung ke server cuaca buat narik data cuaca real-time.
├── public/             # Tempat nyimpen gambar statis, icon aplikasi, logo, dll.
├── images/             # Folder buatan kita yang isinya gambar diagram (Class, Activity, ERD) buat presentasi.
├── firestore.rules     # File keamanan Firebase. Ngatur siapa aja yang boleh baca/tulis data di database (misal: cuma Admin yang boleh ubah API Key).
├── capacitor.config.ts # File pengaturan Capacitor (jembatan dari web ke Android).
├── vite.config.ts      # Pengaturan Vite (mesin buat nge-build kodingan React biar cepat).
├── package.json        # Daftar "bahan baku" atau library pihak ketiga yang dipakai di aplikasi ini.
└── README.md           # Catatan ringkas proyek cara nge-run aplikasinya.
```

---

## 2. Penjelasan Alur Pengguna (User Flow)
Bagian ini menjelaskan apa yang terjadi di "belakang layar" (sistem) ketika pengguna (petani) menekan tombol tertentu di dalam aplikasi.

### A. Saat User Membuka Aplikasi & Login
- **User mencet:** Buka aplikasi di HP.
- **Sistem berjalan:**
  1. Aplikasi mengecek ke `AuthContext.tsx` apakah user sudah pernah login.
  2. Kalau belum, bakal diarahkan ke halaman Login.
  3. User mencet "Login dengan Google".
  4. File `firebase.ts` akan kontak server Google untuk minta izin.
  5. Setelah sukses, data user (Nama, Email, UID) otomatis tersimpan di memori lokal dan user dilempar ke menu **Dashboard**.

### B. Saat User Mencet "Deteksi Hama"
- **User mencet:** Ikon kamera atau tombol "Ambil Foto".
- **Sistem berjalan:**
  1. Capacitor (plugin native) bakal ngebuka kamera asli HP Android atau galeri foto.
  2. User jepret foto daun yang sakit.
  3. File `utils.ts` akan "ngecilin" (compress) ukuran foto supaya nggak ngabisin kuota internet.
  4. Foto dikirim ke AI lewat file `gemini.ts`.
  5. Gemini mikir, lalu ngebalikin jawaban (Nama Hama & Cara Ngobatin).
  6. Hasilnya ditampilkan ke layar (`App.tsx`).
  7. Sistem otomatis nyimpen hasil scan tersebut ke database Firestore (koleksi `pestLogs`) supaya muncul di "Riwayat Deteksi".

### C. Saat User Nanya ke Asisten AI (Chat)
- **User mencet:** Menu Asisten AI, ngetik "Gimana cara pupuk padi?", lalu pencet "Kirim".
- **Sistem berjalan:**
  1. Pesan teks diambil dan dikirim ke fungsi di `gemini.ts` atau `deepseek.ts`.
  2. AI memproses bahasa dan membalas dengan saran pertanian yang relevan.
  3. Balasan dari AI ditampilkan di layar chat.
  4. Obrolan ini kemudian di-backup/disimpan ke Firestore (koleksi `chats`) sesuai ID user tersebut.

### D. Saat User Mengecek Cuaca Lokal
- **User mencet:** Menu Cuaca / Auto Location.
- **Sistem berjalan:**
  1. Plugin Geolocation dari Capacitor bakal minta izin GPS HP buat ngecek titik koordinat (Latitude & Longitude) user.
  2. Titik koordinat dikirim ke `weather.ts` untuk nembak API server cuaca sungguhan (Open-Meteo).
  3. Data cuaca yang balik (suhu, cuaca hujan/cerah) ditampilkan di Dashboard.

### E. Saat Admin Ngubah "API Key" Rahasia
- **User mencet:** Login khusus pakai email admin, lalu masuk ke tab "Admin Panel", masukin API Key baru, klik Simpan.
- **Sistem berjalan:**
  1. Firebase mengecek `firestore.rules`, memastikan "Oh benar, email ini punya role Admin".
  2. API Key baru langsung disimpan di Firestore (koleksi `system_config`).
  3. Semua HP user yang pakai aplikasi ini akan langsung tersinkronisasi dan mulai memakai kunci rahasia yang baru secara *real-time*.
