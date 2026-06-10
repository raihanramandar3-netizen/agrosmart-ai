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

export const getMarketPrices = async (location: string, commodity?: string, marketType?: string, province?: string, date?: string, regency?: string) => {
  const prompt = `Cari harga pangan terbaru di Indonesia dari sumber resmi https://sp2kp.kemendag.go.id/ (SP2KP Kemendag).
  Parameter Pencarian:
  - Komoditas: ${commodity || 'Semua'}
  - Wilayah: ${province || 'Nasional'}${regency ? ', ' + regency : ''}
  - Tanggal: ${date || 'Hari ini'}

  Daftar Komoditas Utama di Kemendag:
  Beras Medium, Beras Premium, Gula Pasir Curah, Minyak Goreng Sawit Kemasan Premium, Minyak Goreng Sawit Curah, Minyakita, Daging Sapi Paha Belakang, Daging Ayam Ras, Telur Ayam Ras, Tepung Terigu, Kedelai Impor, Cabai Merah Keriting, Cabai Rawit Merah, Cabai Merah Besar, Bawang Merah, Bawang Putih Honan.

  BERIKAN RESPON DALAM FORMAT JSON SAJA DENGAN STRUKTUR:
  {
    "items": [
      {
        "name": "Nama Komoditas",
        "price": 15000,
        "unit": "kg",
        "changePercent": 0.5,
        "changeAmount": 75,
        "trend": "up",
        "history": [14000, 14500, 15000]
      }
    ],
    "aiCompass": {
      "insight": "Ringkasan kondisi pasar saat ini di lokasi tersebut",
      "forecast": "Prediksi harga 7 hari kedepan",
      "strategy": "Saran untuk petani/pedagang",
      "status": "Stabil/Waspada/Kritis"
    },
    "provinces": [
      { "name": "Wilayah Lain", "price": 15500 }
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    let text = response.text || "{}";
    console.log("Market Data Raw:", text);

    // Robust cleaning of markdown code blocks
    if (text.includes("```")) {
      text = text.replace(/```json|```/g, '').trim();
    }
    
    // Sometimes Gemini returns non-JSON text before or after JSON on mobile
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    const parsed = JSON.parse(text);
    return {
      ...parsed,
      grounding: response.candidates?.[0]?.groundingMetadata
    };
  } catch (err: any) {
    console.warn("Gemini Market Price failed, trying DeepSeek fallback...", err);
    try {
      const dsRes = await chatWithDeepSeek([{ role: 'user', content: prompt + " Kembalikan HANYA JSON mentah tanpa markdown." }]);
      const cleanJson = dsRes.replace(/```json|```/g, '').trim();
      const dsMatch = cleanJson.match(/\{[\s\S]*\}/);
      return JSON.parse(dsMatch ? dsMatch[0] : cleanJson);
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
