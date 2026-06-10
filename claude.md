# 🌾 AgroSmart AI - Technical Documentation & Architecture

## 🚀 Overview

**AgroSmart AI** adalah sebuah platform digital "Smart Farming" masa depan yang dirancang khusus untuk membantu petani modern di Indonesia meningkatkan produktivitas melalui kecerdasan buatan (AI). Aplikasi ini didesain sebagai **Mobile-First Progressive Web App (PWA)** yang dibalut dengan **Capacitor** untuk performa Native Android yang optimal.

Tujuan utama proyek ini adalah menyediakan solusi satu atap (one-stop solution) untuk:

1. **Analisis Hama & Penyakit:** Menggunakan Visi Komputer (Gemini 2.5 Flash) untuk mendeteksi masalah tanaman lewat kamera.
2. **Prakiraan Cuaca Terverifikasi:** Menggunakan metode RAG (Retrieval-Augmented Generation) untuk validasi cuaca real-time.
3. **Monitor Harga Pasar (RAG):** Mengutip data harga pangan langsung dari sumber resmi (Kemendag/Bapanas) via Google Search.
4. **Manajemen Lahan:** Monitoring parameter kesehatan tanaman secara visual.

---

## 📂 Struktur Folder & Kegunaannya

Berikut adalah penjelasan faedah dari setiap direktori utama dalam project ini:

### 1. `/src`

Jantung dari aplikasi. Semua logika frontend dan backend-client berada di sini.

- **`App.tsx`**: File utama yang berisi routing, logika state global, dan komponen UI dashboard. Ini adalah "otak" dari tampilan antarmuka.
- **`main.tsx`**: Entry point aplikasi yang menghubungkan React ke DOM (Document Object Model).
- **`index.css`**: Konfigurasi styling berbasis Tailwind CSS v4 untuk performa render UI yang sangat cepat.

### 2. `/src/lib` (Library & Config)

Berisi konfigurasi pihak ketiga yang telah dioptimalkan (hardened).

- **`firebase.ts`**: Konfigurasi Firebase (Auth & Firestore). Di dalamnya terdapat logika login Google yang sudah dimodifikasi agar stabil di Android (kombinasi Popup & Redirect fallbacks).
- **`AuthContext.tsx`**: Mengelola status login pengguna agar tetap sinkron di seluruh halaman.
- **`utils.ts`**: Helper function seperti `cn()` untuk penggabungan class Tailwind yang dinamis.

### 3. `/src/services` (AI & Data Services)

Berisi logika komunikasi dengan API luar.

- **`gemini.ts`**: Layanan AI utama yang mengatur grounding (pencarian Google) dan deteksi gambar. Di sinilah metode **RAG (Retrieval-Augmented Generation)** diimplementasikan untuk validasi data market dan cuaca.
- **Layanan Fallback**: Jika Gemini mengalami limit, sistem otomatis mengalihkan beban ke **DeepSeek** untuk menjamin uptime 99.9%.

### 4. `/public`

Berisi aset statis seperti logo, favicon, dan gambar splash screen yang tidak diproses oleh bundler Vite.

### 5. Root Files

- **`package.json`**: Daftar semua "senjata" (libraries) yang kita gunakan.
- **`capacitor.config.ts`**: Jembatan antara Web App kita dengan Sistem Operasi Android (GPS, Kamera, Notifikasi).
- **`firebase-blueprint.json`**: Cetak biru database Firestore untuk menjamin integritas data.
- **`firestore.rules`**: Aturan keamanan (Security Rules) tingkat tinggi untuk mencegah hacker mencuri data user.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini menggunakan **Modern Stack** tercanggih saat ini:

| Teknologi | Fungsi | Alasan Penggunaan |

| :--- | :--- | :--- |

|**React 18 + Vite**| Framework & Build Tool | Render UI super cepat dan reload instan saat development. |

|**Capacitor**| Native Bridge | Mengubah web app menjadi APK/AAB Android dengan akses Kamera & GPS asli. |

|**Tailwind CSS v4**| Styling | Desain UI premium, responsif, dan sangat ringan (low layout-shift). |

|**Firebase Auth**| Authentication | Login aman menggunakan akun Google, dioptimalkan untuk mobile. |

|**Firestore**| Cloud Database | Database NoSQL real-time untuk sinkronisasi data antar HP. |

|**Gemini 2.5 Flash**| Primary AI | Model AI utama Google untuk analisis gambar, chat, dan pencarian Web (RAG). |

|**DeepSeek**| Fallback AI | Backup pintar jika layanan utama mengalami gangguan atau limit. |

|**Lucide React**| Icons | Koleksi icon minimalis dan elegan khas aplikasi modern. |

|**Motion**| Animations | Memberikan efek transisi halus agar aplikasi terasa "mahal" (Fluid UI). |

---

## 🎯 Fokus Target Android

Aplikasi ini dirancang khusus untuk berjalan mulus di perangkat Android dengan perhatian pada:

- **Low Memory Usage**: Efisiensi RAM agar tidak lambat di HP budget.
- **Stable GPS**: Kami meningkatkan *timeout* deteksi lokasi hingga 60 detik untuk area lahan pertanian yang sinyalnya kurang stabil.
- **High-Res Camera Handling**: Sistem kompresi gambar otomatis agar upload foto hama tidak gagal karena ukuran file besar (4K).
- **Dark Mode Optimized**: Tampilan visual yang nyaman di mata saat digunakan di bawah sinar matahari maupun malam hari.

---

## 🧩 Pemetaan Fitur & Kode (Function Map)

Berikut adalah panduan untuk menemukan logika dari fitur-fitur utama di dalam kode:

| Fitur | Lokasi File | Fungsi Utama |

| :--- | :--- | :--- |

|**Login Google (Mobile-Stable)**|`src/lib/firebase.ts`|`signInWithGoogle` (Logika Redirect & Popup fallback) |

|**Pencarian Harga Pasar (RAG)**|`src/services/gemini.ts`|`getMarketPrices` (Grounding Search + JSON Parsing) |

|**Analisis Hama (Vision)**|`src/services/gemini.ts`|`analyzePestImage` (Gemini 2.5 Flash Vision, fallback multi-model) |

|**Rekomendasi Cuaca (RAG)**|`src/services/gemini.ts`|`getWeatherRecommendations` (Data Weather + Grounding) |

|**Deteksi Lokasi (GPS)**|`src/App.tsx`|`detectLocation` (Capacitor Geolocation with 60s timeout) |

|**Export Laporan PDF**|`src/App.tsx`|`handleExportPDF` (jsPDF + html2canvas integration) |

|**Failover AI (Reliability)**|`src/services/gemini.ts`|`tryWithFallback` (Logika switch Gemini -> DeepSeek) |

|**Status Real-time**|`src/App.tsx`|`onSnapshot` (Firebase real-time listener untuk data sensor) |

---

## 🛡️ Keamanan & Integrasi

- **Zero-Hallucination**: Semua data harga dan cuaca menggunakan `tools: [{ googleSearch: {} }]` di `gemini.ts`.
- **Image Compression**: Sebelum di-upload ke AI, gambar dikompresi menggunakan fungsi `compressImage` di `src/lib/utils.ts` untuk menghemat kuota dan memori.
- **Environment Variables**: API Key tidak ditulis keras (hardcoded), melainkan dipanggil via `process.env` atau dikelola dinamis di Admin Panel UI.
  ![1778641589851](image/claude/1778641589851.png)
