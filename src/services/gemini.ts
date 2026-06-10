import { GoogleGenAI } from "@google/genai";
import { chatWithDeepSeek } from "./deepseek";

let currentKey = process.env.GEMINI_API_KEY || "";
let ai = new GoogleGenAI({ apiKey: currentKey });

export const setApiKey = (key: string) => {
  currentKey = key;
  ai = new GoogleGenAI({ apiKey: currentKey });
};

// Helper for fallback
const tryWithFallback = async (geminiCall: () => Promise<any>, promptForDeepSeek: string) => {
  try {
    return await geminiCall();
  } catch (err: any) {
    console.warn("Gemini Failed, trying DeepSeek fallback...", err);
    try {
      return await chatWithDeepSeek([{ role: 'user', content: promptForDeepSeek }]);
    } catch (dsErr) {
      console.error("Both Gemini and DeepSeek failed:", dsErr);
      throw err; // Throw original gemini error for UI to handle if both fail
    }
  }
};

// Direct REST API call for image analysis - bypasses SDK routing issues
export const analyzePestImage = async (base64Image: string) => {
  if (!currentKey) throw new Error("API Key Gemini belum diatur. Silakan atur di Panel Admin.");
  
  try {
    const [prefix, data] = base64Image.split(',');
    const mimeType = prefix.match(/:(.*?);/)?.[1] || "image/jpeg";

    // Try current free-tier models (May 2026) - old 1.5/2.0 models deprecated for vision
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash", "gemini-3.1-flash-lite"];
    
    let lastError = "";
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`;
        
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Tugas Anda adalah mengidentifikasi hama atau penyakit tanaman dalam gambar ini. PENTING: Jika gambar yang diunggah BUKAN gambar tanaman, daun, atau hama pertanian (misalnya gambar hewan, manusia, ruangan, benda mati, dll), Anda WAJIB mengembalikan JSON ini: {\"nama\": \"Bukan Gambar Tanaman\", \"tingkat_keparahan\": \"-\", \"langkah_penanganan\": [\"Sistem tidak mendeteksi adanya tanaman di foto ini.\", \"Harap unggah ulang foto daun atau tanaman yang terindikasi penyakit/hama dengan jelas.\"]}. Jika itu ADALAH tanaman, berikan respon HANYA DALAM FORMAT JSON RAW (tanpa markdown) dengan keys: 'nama', 'tingkat_keparahan' (Rendah/Sedang/Tinggi), and 'langkah_penanganan' (array of strings)." },
                { inline_data: { mime_type: mimeType, data: data } }
              ]
            }]
          })
        });

        const json = await res.json();
        
        if (!res.ok) {
          console.warn(`Model ${modelName} failed:`, json.error?.message);
          lastError = json.error?.message || "Unknown error";
          continue; // Try next model
        }

        let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = "AI tidak memberikan respon teks.";
          continue;
        }

        // Bersihkan markdown code blocks
        if (text.includes("```")) {
          text = text.replace(/```json|```/g, '').trim();
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }

        return JSON.parse(text);
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} threw:`, modelErr.message);
        lastError = modelErr.message;
        continue;
      }
    }
    
    throw new Error(lastError || "Semua model AI gagal menganalisis gambar.");
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    throw new Error(error.message || "Gagal menghubungi AI Gemini.");
  }
};

export const getCropProtocol = async (cropType: string, stage: string) => {
  const prompt = `Buat protokol pengelolaan tanaman dinamis untuk ${cropType} pada tahap ${stage}. Sertakan jadwal penyiraman, pemupukan, dan tips khusus. Berikan dalam format Markdown yang rapi.`;
  
  return tryWithFallback(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "";
  }, prompt);
};

export const getWeatherRecommendations = async (location: string, weatherData?: any) => {
  let prompt = `Analisis cuaca untuk ${location} dan berikan panduan pertanian tingkat industri.`;
  
  if (weatherData) {
    prompt = `### DATA TEKNIS CUACA - ${location.toUpperCase()}
    - Temperatur: ${weatherData.temp}°C
    - Kelembaban: ${weatherData.humidity}%
    - Kecepatan Angin: ${weatherData.windSpeed} km/h
    - Kondisi Langit: ${weatherData.condition}

    ---

    DILARANG MENGGUNAKAN TABEL. GUNAKAN STRUKTUR BERIKUT:
    
    ## 🛡️ RINGKASAN OPERASIONAL
    Gunakan Bullet Points (*) untuk ringkasan cepat:
    * **Penyemprotan:** [YA/TIDAK + Alasan Singkat]
    * **Pemupukan:** [Waktu Optimal]
    * **Irigasi:** [Estimasi Volume]
    * **Proteksi Proteksi:** [Status Risiko Hama]

    ## 📍 TINDAKAN STRATEGIS AHLI
    Berikan instruksi bernomor (1. 2. 3.) yang sangat mendalam:
    1. [Instruksi teknis terperinci berdasarkan data cuaca di atas]
    2. [Langkah pencegahan operasional]
    3. [Rekomendasi pemeliharaan jangka pendek]

    LENGKAPI DENGAN ANALISIS PROFESIONAL:
    Jelaskan bagaimana kombinasi suhu ${weatherData.temp}°C dan kelembaban ${weatherData.humidity}% mempengaruhi laju fotosintesis atau respirasi tanaman secara teknis.

    Gunakan Markdown yang tajam dan profesional. Gunakan bahasa yang berwibawa namun praktis.`;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }] // Enable grounding for weather
      }
    });
    
    // Return both text and grounding metadata if available
    return {
      text: response.text || "",
      grounding: response.candidates?.[0]?.groundingMetadata
    };
  } catch (err: any) {
    console.warn("Gemini Weather Recommendation failed, trying DeepSeek fallback...", err);
    try {
      const dsRes = await chatWithDeepSeek([{ role: 'user', content: prompt }]);
      return { text: dsRes, grounding: null };
    } catch (dsErr) {
      console.error("Both Gemini and DeepSeek failed for weather:", dsErr);
      throw err;
    }
  }
};

const MARKET_CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit
const marketCache = new Map<string, { data: any; ts: number }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getMarketCacheKey = (
  commodity: string,
  wilayah: string,
  tanggal: string,
  marketType?: string
) => `${commodity}|${wilayah}|${tanggal}|${marketType || 'Pasar Tradisional'}`;

const parseMarketJson = (text: string) => {
  let cleaned = text;
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```json|```/g, '').trim();
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Respons AI bukan JSON valid.");
  return JSON.parse(jsonMatch[0]);
};

const isMarketResponseFailed = (parsed: any) => {
  const insight = String(parsed?.aiCompass?.insight || '').toLowerCase();
  const status = String(parsed?.aiCompass?.status || '').toLowerCase();
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const hasValidItems = items.some((item: any) => Number(item?.price) > 0);

  return (
    !hasValidItems ||
    status.includes('gagal') ||
    insight.includes('tidak dapat') ||
    insight.includes('tidak memiliki kemampuan') ||
    insight.includes('tidak tersedia') ||
    insight.includes('belum tersedia')
  );
};

const normalizeMarketResponse = (parsed: any, commodity: string, wilayah: string) => {
  const validStatuses = ['Aman', 'Waspada', 'Peluang'] as const;
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

  const items = rawItems
    .map((item: any) => {
      const price = Number(item?.price) || 0;
      const history = Array.isArray(item?.history)
        ? item.history.map(Number).filter((n: number) => !isNaN(n) && n > 0)
        : [];

      return {
        name: item?.name || commodity,
        price: String(price),
        unit: item?.unit || 'kg',
        changePercent: String(item?.changePercent ?? '0'),
        changeAmount: String(item?.changeAmount ?? '0'),
        trend: (['up', 'down', 'stable'].includes(item?.trend) ? item.trend : 'stable') as 'up' | 'down' | 'stable',
        history: history.length >= 2 ? history : [Math.round(price * 0.98), Math.round(price * 0.99), price].filter((n) => n > 0),
      };
    })
    .filter((item) => Number(item.price) > 0);

  const compass = parsed?.aiCompass || {};
  let status = validStatuses.includes(compass.status) ? compass.status : 'Aman';

  return {
    items,
    aiCompass: {
      insight: compass.insight || `Harga ${commodity} di ${wilayah} berdasarkan laporan pasar terbaru.`,
      forecast: compass.forecast || 'Perkiraan harga relatif stabil dalam 7 hari ke depan.',
      strategy: compass.strategy || 'Pantau harga pasar tradisional setempat sebelum menjual panen.',
      status,
    },
    provinces: Array.isArray(parsed?.provinces) ? parsed.provinces : [],
  };
};

const buildMarketPrompt = (
  commodity: string,
  wilayah: string,
  tanggal: string,
  marketType?: string,
  strict = false
) => {
  const searchQuery = `harga ${commodity} ${wilayah} Indonesia ${tanggal} SP2KP Kemendag Bapanas`;

  if (strict) {
    return `Cari di Google: "${searchQuery}"

Berikan estimasi harga ${commodity} di ${wilayah} berdasarkan berita/laporan terbaru yang ditemukan.
JANGAN menolak atau jelaskan keterbatasan teknis. WAJIB berikan angka harga.

JSON saja:
{"items":[{"name":"${commodity}","price":13400,"unit":"kg","changePercent":"0.5","changeAmount":"67","trend":"stable","history":[13200,13300,13400]}],"aiCompass":{"insight":"Ringkasan singkat kondisi pasar","forecast":"Prediksi 7 hari","strategy":"Saran petani","status":"Aman"},"provinces":[]}`;
  }

  return `Kamu analis harga pangan Indonesia. Gunakan Google Search.

PENCARIAN:
- Komoditas: ${commodity}
- Wilayah: ${wilayah}
- Jenis pasar: ${marketType || 'Pasar Tradisional'}
- Referensi tanggal: ${tanggal}
- Query: "${searchQuery}"

SUMBER YANG BOLEH (gabungkan, jangan hanya 1 situs):
Laporan SP2KP/Bapanas/Kemendag, berita daerah, Katadata, Antara, detik, portal pemerintah daerah.

ATURAN WAJIB:
1. DILARANG bilang "tidak bisa akses website", "perlu login", atau "data tidak tersedia". Selalu berikan hasil terbaik dari pencarian.
2. Jika data persis tanggal ${tanggal} tidak ada, pakai data TERDEKAT (1-14 hari sebelumnya) dan sebut tanggal sumbernya singkat di insight.
3. WAJIB isi "items" minimal 1 komoditas dengan harga Rupiah masuk akal.
4. "history": 3 angka (estimasi 3 hari terakhir).
5. "status" HANYA: "Aman", "Waspada", atau "Peluang".
6. insight/forecast/strategy: maks 2 kalimat, bahasa petani, bukan penjelasan teknis AI.
7. Range wajar beras medium: Rp 10.000-18.000/kg.

RESPON HANYA JSON MENTAH tanpa markdown:
{
  "items": [{"name": "${commodity}", "price": 13400, "unit": "kg", "changePercent": "0.5", "changeAmount": "67", "trend": "stable", "history": [13200, 13300, 13400]}],
  "aiCompass": {"insight": "...", "forecast": "...", "strategy": "...", "status": "Aman"},
  "provinces": [{"name": "Wilayah lain", "price": 13500}]
}`;
};

export const getMarketPrices = async (location: string, commodity?: string, marketType?: string, province?: string, date?: string, regency?: string) => {
  const komoditas = commodity || 'Beras Medium';
  const tanggal = date || new Date().toISOString().split('T')[0];
  const skipRegency = !regency || regency === 'Semua Kabupaten/Kota' || regency === 'Seluruh Indonesia';
  const wilayah = skipRegency
    ? (province || 'Nasional')
    : `${regency}, ${province || ''}`.replace(/,\s*$/, '').trim();

  const cacheKey = getMarketCacheKey(komoditas, wilayah, tanggal, marketType);
  const cached = marketCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < MARKET_CACHE_TTL_MS) {
    console.log("Market cache hit:", cacheKey);
    return cached.data;
  }

  const callGemini = async (prompt: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });
    return response;
  };

  const tryFetchMarket = async () => {
    const attempts = [
      () => buildMarketPrompt(komoditas, wilayah, tanggal, marketType, false),
      () => buildMarketPrompt(komoditas, wilayah, tanggal, marketType, true),
      () => buildMarketPrompt(komoditas, wilayah, tanggal, marketType, true),
    ];

    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await sleep(800);
      const response = await callGemini(attempts[i]());
      const text = response.text || "{}";
      console.log(`Market attempt ${i + 1}:`, text);

      try {
        const parsed = parseMarketJson(text);
        if (!isMarketResponseFailed(parsed)) {
          return { response, parsed };
        }
      } catch (parseErr) {
        console.warn(`Market attempt ${i + 1} parse failed:`, parseErr);
      }
    }

    throw new Error("AI tidak mengembalikan harga valid setelah beberapa percobaan.");
  };

  try {
    const { response, parsed } = await tryFetchMarket();
    const normalized = normalizeMarketResponse(parsed, komoditas, wilayah);
    const result = {
      ...normalized,
      grounding: response.candidates?.[0]?.groundingMetadata
    };
    marketCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err: any) {
    console.warn("Gemini Market Price failed, trying DeepSeek fallback...", err);
    try {
      const fallbackPrompt = buildMarketPrompt(komoditas, wilayah, tanggal, marketType, true)
        + " Kembalikan HANYA JSON mentah tanpa markdown.";
      const dsRes = await chatWithDeepSeek([{ role: 'user', content: fallbackPrompt }]);
      const parsed = parseMarketJson(dsRes);
      if (isMarketResponseFailed(parsed)) throw err;
      return normalizeMarketResponse(parsed, komoditas, wilayah);
    } catch (dsErr) {
      console.error("Market Price fallback failed:", dsErr);
      throw err;
    }
  }
};

export const startAIChat = (systemInstruction: string) => {
  if (!currentKey) throw new Error("API Key Gemini belum diatur.");
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction,
    },
  });
};

export const validateGeminiKey = async (key: string) => {
  if (key.length < 20) return { valid: false, message: "API Key terlalu pendek." };
  const customAi = new GoogleGenAI({ apiKey: key });
  try {
    const response = await customAi.models.generateContent({ 
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: "test" }] }]
    });
    if (response.text) return { valid: true };
    return { valid: false, message: "No response from AI" };
  } catch (error: any) {
    return { valid: false, message: error.message || "Invalid API Key or connection error" };
  }
};
