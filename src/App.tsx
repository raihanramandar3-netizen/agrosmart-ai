import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bug, 
  Sprout, 
  CloudSun, 
  Camera, 
  Trash2,
  AlertTriangle,
  AlertCircle,
  Droplets,
  Thermometer,
  Wind,
  Search,
  Loader2,
  TrendingUp,
  Image as ImageIcon,
  MessageSquare,
  Send,
  User,
  Bot,
  LogOut,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Check,
  CheckCircle2,
  Menu,
  X,
  UserCircle,
  Info,
  Settings,
  Star,
  RotateCcw,
  MapPin,
  Navigation,
  FileDown,
  Cpu
} from 'lucide-react';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { 
  analyzePestImage, 
  getCropProtocol, 
  getWeatherRecommendations, 
  getMarketPrices, 
  startAIChat,
  validateGeminiKey,
  setApiKey
} from './services/gemini';
import { fetchRealWeather, WeatherData, setWeatherApiKey } from './services/weather';
import { 
  validateDeepSeekKey, 
  setDeepSeekKey, 
  chatWithDeepSeek 
} from './services/deepseek';
import { cn, compressImage } from './lib/utils';
import { useAuth } from './lib/AuthContext';
import { 
  signInWithGoogle, 
  logout, 
  db, 
  handleFirestoreError, 
  OperationType,
  checkRedirectResult
} from './lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  doc, 
  orderBy, 
  limit, 
  getCountFromServer,
  Timestamp,
  serverTimestamp,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';

type Tab = 'dashboard' | 'pest' | 'market' | 'chat' | 'profile' | 'weather' | 'admin' | 'history' | 'settings' | 'about';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface MarketItem {
  name: string;
  price: string;
  unit: string;
  changePercent: string;
  changeAmount: string;
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface MarketData {
  items: MarketItem[];
  aiCompass?: {
    insight: string;
    forecast: string;
    strategy: string;
    status: 'Aman' | 'Waspada' | 'Peluang';
  };
  provinces: { name: string; price: string }[];
  grounding?: any;
}

const PROVINCES = [
  'Nasional', 'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 
  'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Bangka Belitung', 'Kepulauan Riau',
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten',
  'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat',
  'Maluku', 'Maluku Utara', 'Papua Barat', 'Papua', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan', 'Papua Barat Daya'
];

const REGENCY_MAP: Record<string, string[]> = {
  'Nasional': ['Seluruh Indonesia'],
  'Lampung': ['Kota Bandar Lampung', 'Kota Metro', 'Lampung Barat', 'Lampung Selatan', 'Lampung Tengah', 'Lampung Timur', 'Lampung Utara', 'Mesuji', 'Pesawaran', 'Pesisir Barat', 'Pringsewu', 'Tanggamus', 'Tulang Bawang', 'Tulang Bawang Barat', 'Way Kanan'],
  'DKI Jakarta': ['Kota Jakarta Pusat', 'Kota Jakarta Utara', 'Kota Jakarta Barat', 'Kota Jakarta Selatan', 'Kota Jakarta Timur', 'Kepulauan Seribu'],
  'Jawa Timur': ['Kota Surabaya', 'Kota Malang', 'Kota Kediri', 'Kota Probolinggo', 'Kota Pasuruan', 'Kota Mojokerto', 'Kota Madiun', 'Kota Blitar', 'Kota Batu', 'Sidoarjo', 'Gresik', 'Banyuwangi', 'Jember'],
  'Jawa Barat': ['Kota Bandung', 'Kota Bekasi', 'Kota Depok', 'Kota Bogor', 'Kota Tasikmalaya', 'Kota Cimahi', 'Kota Sukabumi', 'Kota Cirebon', 'Kota Banjar', 'Bandung', 'Bekasi', 'Bogor', 'Ciamis', 'Cianjur', 'Cirebon', 'Garut', 'Indramayu', 'Karawang', 'Kuningan', 'Majalengka', 'Pangandaran', 'Purwakarta', 'Subang', 'Sukabumi', 'Sumedang', 'Tasikmalaya'],
  'Jawa Tengah': ['Kota Semarang', 'Kota Surakarta', 'Kota Magelang', 'Kota Pekalongan', 'Kota Salatiga', 'Kota Tegal', 'Semarang', 'Surakarta', 'Banyumas', 'Batang', 'Blora', 'Boyolali', 'Brebes', 'Cilacap', 'Demak', 'Grobogan', 'Jepara', 'Karanganyar', 'Kebumen', 'Kendal', 'Klaten', 'Kudus', 'Magelang', 'Pati', 'Pekalongan', 'Pemalang', 'Purbalingga', 'Purworejo', 'Rembang', 'Sragen', 'Sukoharjo', 'Tegal', 'Temanggung', 'Wonogiri', 'Wonosobo'],
  'Aceh': ['Kota Banda Aceh', 'Kota Sabang', 'Kota Lhokseumawe', 'Kota Langsa', 'Kota Subulussalam', 'Aceh Barat', 'Aceh Barat Daya', 'Aceh Besar', 'Aceh Jaya', 'Aceh Selatan', 'Aceh Singkil', 'Aceh Tamiang', 'Aceh Tengah', 'Aceh Tenggara', 'Aceh Timur', 'Aceh Utara', 'Bener Meriah', 'Bireuen', 'Gayo Lues', 'Nagan Raya', 'Pidie', 'Pidie Jaya', 'Simeulue'],
  'Sumatera Utara': ['Kota Medan', 'Kota Binjai', 'Kota Tebing Tinggi', 'Kota Pematangsiantar', 'Kota Tanjungbalai', 'Kota Sibolga', 'Kota Padangsidimpuan', 'Kota Gunungsitoli', 'Asahan', 'Batubara', 'Dairi', 'Deli Serdang', 'Humbang Hasundutan', 'Karo', 'Labuhanbatu', 'Langkat'],
};

const COMMODITIES = [
  'Beras Medium', 'Beras Premium', 'Gula Pasir Curah', 
  'Minyak Goreng Sawit Kemasan Premium', 'Minyak Goreng Sawit Curah', 
  'Minyakita', 'Daging Sapi Paha Belakang', 'Daging Ayam Ras', 
  'Telur Ayam Ras', 'Tepung Terigu', 'Kedelai Impor', 
  'Cabai Merah Keriting', 'Cabai Rawit Merah', 'Cabai Merah Besar', 
  'Bawang Merah', 'Bawang Putih Honan'
];

export default function App() {
  const { user, userData: realUserData, loading: authLoading, isAdmin: realIsAdmin } = useAuth();
  const [showDemoApp, setShowDemoApp] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  // Persistent state management
  const [history, setHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    checkRedirectResult();
  }, []);

  const [finishedOnboarding, setFinishedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('agro_onboarded') === 'true';
  });

  useEffect(() => {
    if (finishedOnboarding) {
      localStorage.setItem('agro_onboarded', 'true');
    }
  }, [finishedOnboarding]);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('agro_theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('agro_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const userData = showDemoApp ? {
    uid: 'demo-123',
    displayName: 'Tamu AgroSmart',
    email: 'guest@agrosmart.ai',
    role: 'user',
    photoURL: null as string | null
  } : realUserData;

  const isAdmin = showDemoApp ? false : realIsAdmin;
  const isLogged = user || showDemoApp;
  
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<{ temp: number; condition: string }>({ temp: 28.5, condition: 'Cerah Berawan' });
  const [weatherRecs, setWeatherRecs] = useState<{ text: string, grounding?: any }>({ text: '' });
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketFilters, setMarketFilters] = useState({
    commodity: 'Beras Medium',
    marketType: 'Pasar Tradisional',
    province: 'Nasional',
    regency: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [location, setLocation] = useState('');
  const [cropType, setCropType] = useState('Padi');
  const [growthStage, setGrowthStage] = useState('Vegetatif');

  const [pestResult, setPestResult] = useState<any>(null);
  const [protocol, setProtocol] = useState<string>('');

  const [input, setInput] = useState('');
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin Specific States
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, totalScans: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminActionResult, setAdminActionResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [showConfirmClearChat, setShowConfirmClearChat] = useState(false);
  const [showConfirmDeleteAccount, setShowConfirmDeleteAccount] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // API Key Centralization States
  const [customApiKey, setCustomApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [apiKeyError, setApiKeyError] = useState('');
  const [apiKeySaving, setApiKeySaving] = useState(false);

  const [deepSeekKey, setDeepSeekKeyInput] = useState('');
  const [deepSeekStatus, setDeepSeekStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  const [weatherKey, setWeatherKeyInput] = useState('');
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // Setup native keyboard listener
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Keyboard.addListener('keyboardWillShow', () => {
        setIsKeyboardOpen(true);
      });
      Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardOpen(false);
      });
    }
    return () => {
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
      }
    };
  }, []);



  // Load Global Keys from Firestore
  useEffect(() => {
    // Prevent unauthenticated read attempts
    if (!user) {
      setApiKeyStatus('idle');
      return;
    }

    const unsub = onSnapshot(doc(db, 'system_config', 'api_keys'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.gemini_key) {
          setApiKey(data.gemini_key);
          setCustomApiKey(data.gemini_key);
          setApiKeyStatus('valid');
        }
        if (data.deepseek_key) {
          setDeepSeekKey(data.deepseek_key);
          setDeepSeekKeyInput(data.deepseek_key);
          setDeepSeekStatus('valid');
        }
        if (data.weather_key) {
          setWeatherApiKey(data.weather_key);
          setWeatherKeyInput(data.weather_key);
          setWeatherStatus('valid');
        }
      }
    }, (err) => {
      // Don't throw for transient background errors if not admin, but log them
      console.warn("Background API Keys sync error:", err.message);
      if (realIsAdmin) {
        // Only trigger the hard error for admins who need access to cloud config
        handleFirestoreError(err, OperationType.GET, 'system_config/api_keys');
      }
    });

    return () => unsub();
  }, [user, realIsAdmin]);

  const saveGlobalKey = async (type: 'gemini' | 'deepseek' | 'weather', key: string) => {
    if (!isAdmin) return;
    const path = 'system_config/api_keys';
    try {
      await setDoc(doc(db, path), {
        [`${type}_key`]: key,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const checkApiKey = async () => {
    if (!customApiKey) return;
    setApiKeyStatus('checking');
    setApiKeySaving(true);
    setApiKeyError('');
    
    try {
      const result = await validateGeminiKey(customApiKey);
      if (result.valid) {
        setApiKeyStatus('valid');
        setApiKey(customApiKey);
        if (isAdmin) {
          try {
            await saveGlobalKey('gemini', customApiKey);
            alert("API Key Gemini berhasil disimpan di Cloud dan disinkronkan!");
          } catch (fsErr: any) {
            console.error("Cloud save failed:", fsErr);
            setApiKeyError("Key valid tapi gagal simpan ke Cloud. Cek koneksi.");
          }
        }
      } else {
        setApiKeyStatus('invalid');
        setApiKeyError(result.message || 'Key tidak valid atau limit tercapai');
      }
    } catch (err) {
      setApiKeyStatus('invalid');
      setApiKeyError("Gagal memverifikasi key.");
    } finally {
      setApiKeySaving(false);
    }
  };

  const checkDeepSeek = async (key: string) => {
    if (!key) {
      setDeepSeekStatus('idle');
      return;
    }
    setDeepSeekStatus('checking');
    const isValid = await validateDeepSeekKey(key);
    if (isValid) {
      setDeepSeekStatus('valid');
      setDeepSeekKey(key);
      if (isAdmin) saveGlobalKey('deepseek', key);
    } else {
      setDeepSeekStatus('invalid');
    }
  };

  // Debounced checks
  useEffect(() => {
    const timer = setTimeout(() => {
      if (deepSeekKey && deepSeekStatus !== 'valid') checkDeepSeek(deepSeekKey);
    }, 1500);
    return () => clearTimeout(timer);
  }, [deepSeekKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (weatherKey && weatherStatus !== 'valid') {
        // Simple validation check: OpenWeatherMap keys are usually 32 chars
        if (weatherKey.length >= 32) {
          setWeatherStatus('valid');
          setWeatherApiKey(weatherKey);
          if (isAdmin) saveGlobalKey('weather', weatherKey);
        } else if (weatherKey.length > 0) {
          setWeatherStatus('invalid');
        } else {
          setWeatherStatus('idle');
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [weatherKey]);

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeAdmins: (() => void) | undefined;

    if (activeTab === 'admin' && isAdmin) {
      setLoading(true);
      
      // One-time counts
      const fetchCounts = async () => {
        try {
          const usersCol = collection(db, 'users');
          const scansCol = collection(db, 'pestLogs');
          const usersSnap = await getCountFromServer(usersCol);
          const scansSnap = await getCountFromServer(scansCol);
          setAdminStats({
            totalUsers: usersSnap.data().count,
            totalScans: scansSnap.data().count
          });
        } catch (err) {
          console.error("Failed to fetch counts:", err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchCounts();

      // Real-time listeners
      const usersCol = collection(db, 'users');
      const recentUsersQuery = query(usersCol, orderBy('uid'), limit(5));
      unsubscribeUsers = onSnapshot(recentUsersQuery, (snap) => {
        setRecentUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });

      const adminsQuery = query(usersCol, where('role', '==', 'admin'));
      unsubscribeAdmins = onSnapshot(adminsQuery, (snap) => {
        setAdminsList(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeAdmins) unsubscribeAdmins();
    };
  }, [activeTab, isAdmin]);

  const fetchAdminData = async () => {
    // Keep this for the refresh button if needed, 
    // but the useEffect handles it now
    setAdminActionResult(null);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    
    setAdminActionLoading(true);
    setAdminActionResult(null);
    try {
      const searchEmail = newAdminEmail.trim().toLowerCase();
      const q = query(collection(db, 'users'), where('email', '==', searchEmail));
      let snap;
      try {
        snap = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
        return;
      }
      
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const userPath = `users/${userDoc.id}`;
        try {
          await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
          setAdminActionResult({ type: 'success', message: `${newAdminEmail} berhasil dijadikan Admin.` });
          setNewAdminEmail('');
          fetchAdminData();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        }
      } else {
        setAdminActionResult({ type: 'error', message: "User tidak ditemukan. Pastikan email terdaftar." });
      }
    } catch (error) {
      console.error(error);
      setAdminActionResult({ type: 'error', message: "Terjadi kesalahan sistem." });
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, email: string) => {
    if (email === 'raihanramanda644@gmail.com') {
      alert("Admin utama tidak bisa dihapus.");
      return;
    }

    if (!confirm(`Hapus hak akses Admin dari ${email}?`)) return;

    setAdminActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'user' });
      setAdminActionResult({ type: 'success', message: `Hak akses Admin ${email} telah dicabut.` });
      fetchAdminData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      setAdminActionResult({ type: 'error', message: "Gagal mencabut hak akses Admin." });
    } finally {
      setAdminActionLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch real weather data on mount as requested
  useEffect(() => {
    const fetchRealWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        const temp = data.current_weather.temperature;
        const code = data.current_weather.weathercode;
        
        let condition = "Cerah";
        if (code > 0 && code <= 3) condition = "Cerah Berawan";
        if (code >= 45 && code <= 48) condition = "Berkabut";
        if (code >= 51 && code <= 67) condition = "Hujan Ringan";
        if (code >= 71 && code <= 82) condition = "Hujan";
        if (code >= 95) condition = "Badai Petir";

        setWeatherData({ temp, condition });
      } catch (err) {
        console.error("Gagal ambil cuaca awal:", err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchRealWeather(pos.coords.latitude, pos.coords.longitude),
        (err) => console.log("Izin lokasi ditolak/gagal di awal:", err),
        { timeout: 60000, enableHighAccuracy: true, maximumAge: 300000 } // 5 mins cache
      );
    }
  }, []);
  
  // Fetch History and Chats on Login
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setMessages([]);
      return;
    }

    const qPests = query(
      collection(db, 'pestLogs'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribePests = onSnapshot(qPests, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().pestName,
        imageUrl: doc.data().imageUrl,
        date: doc.data().timestamp?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) || '-',
        severity: doc.data().severity
      }));
      setHistory(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pestLogs'));

    const qChats = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        role: doc.data().role as 'user' | 'model',
        text: doc.data().text
      }));
      setMessages(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chats'));

    return () => {
      unsubscribePests();
      unsubscribeChats();
    };
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      try {
        const base64 = await compressImage(rawBase64); // Compress for performance & stability
        const result = await analyzePestImage(base64);

        // real-time logging for admin stats
        if (user) {
          const path = 'pestLogs';
          try {
            // Sanitize severity to match rules: ['Rendah', 'Sedang', 'Tinggi']
            let validSeverity = result.tingkat_keparahan || 'Sedang';
            if (!['Rendah', 'Sedang', 'Tinggi'].includes(validSeverity)) {
              validSeverity = 'Sedang';
            }

            await addDoc(collection(db, path), {
              userId: user.uid,
              pestName: result.nama || 'Tidak Dikenal',
              severity: validSeverity,
              timestamp: serverTimestamp(),
              userEmail: user.email,
              imageUrl: base64
            });
          } catch (fsErr) {
            handleFirestoreError(fsErr, OperationType.CREATE, path);
          }
        }

        const newEntry = {
          id: Date.now().toString(),
          name: result.nama || 'Tidak Dikenal',
          imageUrl: base64,
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          severity: result.tingkat_keparahan || 'Sedang'
        };
        setHistory(prev => [newEntry, ...prev]);
        setPestResult(result);
        setActiveTab('pest');
      } catch (error: any) {
        console.error("Scan Error:", error);
        alert(error.message || "Gagal menganalisis gambar. Pastikan API Key diatur dengan benar di Panel Admin.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchWeather = async (customLoc?: string, lat?: number, long?: number) => {
    setLoading(true);
    try {
      const locToUse = customLoc || location || 'Surabaya';
      
      // Fetch real weather data first
      let weatherData: WeatherData | null = null;
      if (lat && long) {
        weatherData = await fetchRealWeather(lat, long);
      } else if (locToUse && locToUse !== 'Surabaya, Indonesia') {
        weatherData = await fetchRealWeather(undefined, undefined, locToUse);
      }

      const res = await getWeatherRecommendations(locToUse, weatherData);
      setWeatherRecs(res);
      
      if (weatherData && !customLoc) {
        setLocation(`${weatherData.city}, Indonesia`);
      }
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengambil data cuaca: " + (error.message || "Pastikan API Key Gemini sudah diatur di Panel Admin."));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLocation = async () => {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 60000 
        });
        await fetchWeather(undefined, coordinates.coords.latitude, coordinates.coords.longitude);
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              await fetchWeather(undefined, latitude, longitude);
              setLoading(false);
            },
            (error) => {
              setLoading(false);
              console.error("Geolocation Error:", error);
              const errorMsg = error.code === 3 ? "Deteksi lokasi habis waktu (Timeout). Coba cek sinyal GPS Anda." : "Gagal mendeteksi lokasi. Pastikan izin GPS diberikan.";
              alert(errorMsg);
            },
            { timeout: 60000, enableHighAccuracy: true, maximumAge: 60000 }
          );
          return;
        } else {
          alert("Browser Anda tidak mendukung deteksi lokasi.");
        }
      }
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengambil lokasi: " + (error.message || "Timeout/Izin Ditolak"));
    } finally {
      if (!navigator.geolocation || Capacitor.isNativePlatform()) {
        setLoading(false);
      }
    }
  };

  const handleNativeCamera = async (source: CameraSource = CameraSource.Prompt) => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false, // AI better with raw original photos
        resultType: CameraResultType.Base64,
        source: source,
        saveToGallery: true, // No. 1 App feature: always keep users' evidence
        promptLabelHeader: "Pilih Sumber Gambar",
        promptLabelPhoto: "Dari Galeri",
        promptLabelPicture: "Ambil Foto"
      });

      if (image.base64String) {
        const rawBase64 = `data:image/${image.format};base64,${image.base64String}`;
        const base64Data = await compressImage(rawBase64); // Ensure even high-res camera shots don't crash the app
        processImageAnalysis(base64Data);
      }
    } catch (error: any) {
      console.error("Camera Error:", error);
      if (error.message !== "User cancelled photos app" && error.message !== "User cancelled selection") {
        alert("Gagal mengakses kamera/galeri: " + error.message);
      }
    }
  };

  const processImageAnalysis = async (rawBase64: string) => {
    setLoading(true);
    try {
      const base64 = await compressImage(rawBase64); // Resizing ensures no crash on high-res photos
      const result = await analyzePestImage(base64);

      if (user) {
        const path = 'pestLogs';
        try {
          let validSeverity = result.tingkat_keparahan || 'Sedang';
          if (!['Rendah', 'Sedang', 'Tinggi'].includes(validSeverity)) {
            validSeverity = 'Sedang';
          }

          await addDoc(collection(db, path), {
            userId: user.uid,
            pestName: result.nama || 'Tidak Dikenal',
            severity: validSeverity,
            timestamp: serverTimestamp(),
            userEmail: user.email,
            imageUrl: base64
          });
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, path);
        }
      }

      const newEntry = {
        id: Date.now().toString(),
        name: result.nama || 'Tidak Dikenal',
        imageUrl: base64,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        severity: result.tingkat_keparahan || 'Sedang'
      };
      setHistory(prev => [newEntry, ...prev]);
      setPestResult(result);
      setActiveTab('pest');
    } catch (error: any) {
      console.error("Scan Error:", error);
      alert(error.message || "Gagal menganalisis gambar. Pastikan API Key diatur dengan benar.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!pestResult) {
      alert("Tidak ada data hasil scan untuk dibuatkan laporan.");
      return;
    }
    
    setLoading(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString('id-ID');
      
      // Safe data extraction (handle field name variations from AI)
      const pestName = pestResult.nama || pestResult.pestName || pestResult.name || 'Hama Tidak Terdeteksi';
      const severity = pestResult.tingkat_keparahan || pestResult.severity || 'Sedang';
      const steps = pestResult.langkah_penanganan || pestResult.recommendations || pestResult.steps || [];
      
      // Header & Branding
      doc.setFillColor(16, 185, 129); // Emerald-600
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('AGROSMART AI', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Laporan Deteksi Kesehatan Tanaman Digital', 105, 30, { align: 'center' });
      
      // Content Section
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.setFontSize(12);
      doc.text(`Waktu Analisis: ${timestamp}`, 20, 55);
      doc.text(`Petani: ${userData?.displayName || 'Petani AgroSmart'}`, 20, 62);
      
      // Result Box
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.roundedRect(15, 75, 180, 45, 5, 5, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text('HASIL IDENTIFIKASI HAMA/PENYAKIT:', 25, 85);
      
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129); // Emerald-600
      doc.setFont('helvetica', 'bold');
      doc.text(pestName.toUpperCase(), 25, 100);
      
      doc.setFontSize(10);
      doc.setTextColor(severity === 'Tinggi' ? 220 : 16, severity === 'Tinggi' ? 38 : 185, severity === 'Tinggi' ? 38 : 129);
      doc.text(`Tingkat Bahaya: ${severity}`, 25, 110);
      
      // Recommendations
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Rekomendasi Penanganan AI:', 20, 140);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 150;
      
      if (Array.isArray(steps)) {
        steps.forEach((step: string, i: number) => {
          const lines = doc.splitTextToSize(`${i + 1}. ${step}`, 170);
          doc.text(lines, 20, yPos);
          yPos += (lines.length * 6) + 4;
        });
      } else {
        const lines = doc.splitTextToSize(String(steps), 170);
        doc.text(lines, 20, yPos);
      }
      
      // Footer
      doc.setDrawColor(241, 245, 249);
      doc.line(20, 275, 190, 275);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Dihasilkan secara otomatis oleh AgroSmart AI Engine v1.0', 105, 282, { align: 'center' });
      doc.text('Hasil analisis AI bersifat rekomendasi, konsultasikan kembali dengan ahli pertanian lokal.', 105, 287, { align: 'center' });
      
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `Laporan_AgroSmart_${Date.now()}.pdf`;
        
        try {
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Documents,
          });
          
          // Trigger native share/open-with dialog
          await Share.share({
            title: 'Laporan AgroSmart AI',
            text: 'Berikut adalah laporan hasil analisis tanaman dari AgroSmart AI.',
            url: writeResult.uri,
            dialogTitle: 'Buka atau Bagikan PDF'
          });

        } catch (e: any) {
          console.error("Native save error:", e);
          alert("Gagal menyimpan PDF ke storage: " + e.message);
        }
      } else {
        const namePest = pestResult.nama || 'Laporan';
        doc.save(`Laporan_AgroSmart_${namePest.replace(/\s+/g, '_')}.pdf`);
      }
    } catch (error) {
      console.error("Gagal export PDF:", error);
      alert("Maaf, terjadi kesalahan teknis saat membuat laporan PDF. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketPrices = async () => {
    setLoading(true);
    try {
      const res = await getMarketPrices(
        location, 
        marketFilters.commodity, 
        marketFilters.marketType, 
        marketFilters.province, 
        marketFilters.date,
        marketFilters.regency
      );
      setMarketData(res as MarketData);
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengambil data pasar: " + (error.message || "Pastikan API Key Gemini sudah diatur di Panel Admin."));
    } finally {
      setLoading(false);
    }
  };

  // Persist chat message to Firestore
  const saveChatMessage = async (msg: Message) => {
    if (!user) return;
    const path = 'chats';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        role: msg.role,
        text: msg.text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const clearChatHistory = async () => {
    if (!user && !showDemoApp) return;
    
    setLoading(true);
    const path = 'chats';
    try {
      if (user) {
        const q = query(collection(db, path), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        
        if (snap.docs.length > 0) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      
      setMessages([]); 
      chatRef.current = null; // Reset AI context
      setShowConfirmClearChat(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setLoading(false);
    }
  };

  const deleteDetectionLog = async (id: string) => {
    if (!user) return;
    
    setLoading(true);
    const path = `pestLogs`;
    try {
      await deleteDoc(doc(db, path, id));
      setLogToDelete(null); 
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayName = async (newName: string) => {
    if (!user || !newName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: newName.trim()
      });
      alert("Profil diperbarui!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Delete user data from collections
      const batch = writeBatch(db);
      
      // Delete user profile doc
      batch.delete(doc(db, 'users', user.uid));
      
      const qPests = query(collection(db, 'pestLogs'), where('userId', '==', user.uid));
      const pestSnap = await getDocs(qPests);
      pestSnap.docs.forEach(d => batch.delete(d.ref));
      
      const qChats = query(collection(db, 'chats'), where('userId', '==', user.uid));
      const chatSnap = await getDocs(qChats);
      chatSnap.docs.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      
      // 2. Delete from Firebase Auth
      await user.delete();
      
      alert("Akun Anda telah berhasil dihapus.");
      logout();
      window.location.reload(); 
    } catch (error: any) {
      console.error("Delete account error:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("Demi keamanan, Anda perlu Logout kemudian Login kembali sebelum bisa menghapus akun secara permanen.");
      } else {
        alert("Gagal menghapus akun: " + (error.message || "Kesalahan tidak diketahui"));
      }
    } finally {
      setLoading(false);
      setShowConfirmDeleteAccount(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Save user message
    if (user) saveChatMessage(userMsg);

    try {
      // Try Gemini first
      try {
        if (!chatRef.current) {
          chatRef.current = startAIChat("Anda adalah asisten ahli pertanian cerdas bernama AgroSmart AI. Bantu petani dengan pertanyaan teknis, tips budidaya, dan solusi masalah pertanian.");
        }
        const response = await chatRef.current.sendMessage({ message: input });
        const botMsg: Message = { role: 'model', text: response.text || "Maaf, saya tidak bisa merespon saat ini." };
        setMessages(prev => [...prev, botMsg]);
        if (user) saveChatMessage(botMsg);
      } catch (geminiErr: any) {
        console.warn("Gemini Chat failed, try DeepSeek fallback...", geminiErr);
        // Fallback to DeepSeek
        if (deepSeekStatus === 'valid') {
          const dsMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
            { role: 'system', content: "Anda adalah asisten ahli pertanian cerdas bernama AgroSmart AI. Bantu petani dengan pertanyaan teknis, tips budidaya, dan solusi masalah pertanian." },
            ...messages.map(m => ({ 
              role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', 
              content: m.text 
            })),
            { role: 'user', content: input }
          ];
          const dsResponse = await chatWithDeepSeek(dsMessages);
          const botMsg: Message = { role: 'model', text: dsResponse || "Maaf, DeepSeek pun tidak merespon." };
          setMessages(prev => [...prev, botMsg]);
          if (user) saveChatMessage(botMsg);
        } else {
          throw geminiErr;
        }
      }
    } catch (error: any) {
      console.error(error);
      const errMsg: Message = { role: 'model', text: `Terjadi kesalahan: ${error.message || "Gagal menghubungi AI."}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!finishedOnboarding) {
    const slides = [
      { 
        title: "Deteksi Hama Akurat", 
        desc: "Gunakan kamera Anda untuk mendeteksi penyakit tanaman dalam sekejap dengan bantuan AI canggih.", 
        icon: <Bug className="w-16 h-16 text-emerald-400" />,
        image: "https://picsum.photos/seed/pest/800/600"
      },
      { 
        title: "Pantau Harga Pasar", 
        desc: "Dapatkan info harga komoditas pangan terkini langsung dari berbagai pasar di seluruh Indonesia.", 
        icon: <TrendingUp className="w-16 h-16 text-emerald-400" />,
        image: "https://picsum.photos/seed/market/800/600"
      },
      { 
        title: "Konsultasi Cerdas", 
        desc: "Asisten AI kami siap menjawab segala pertanyaan tentang pertanian Anda 24/7.", 
        icon: <Bot className="w-16 h-16 text-emerald-400" />,
        image: "https://picsum.photos/seed/ai/800/600"
      }
    ];

    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative w-full aspect-square mb-12 rounded-[3rem] overflow-hidden shadow-xl shadow-emerald-900/40">
            <img src={slides[onboardingStep].image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="p-4 bg-emerald-900/60 rounded-3xl border border-white/20">
                {slides[onboardingStep].icon}
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-display font-bold text-white mb-4">{slides[onboardingStep].title}</h2>
          <p className="text-emerald-100/60 leading-relaxed max-w-xs">{slides[onboardingStep].desc}</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === onboardingStep ? "w-8 bg-emerald-400" : "w-2 bg-emerald-800")} />
            ))}
          </div>
          
          <button 
            onClick={() => {
              if (onboardingStep < slides.length - 1) {
                setOnboardingStep(v => v + 1);
              } else {
                setFinishedOnboarding(true);
              }
            }}
            className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-bold font-display tracking-wide shadow-xl active:scale-[0.98] transition-transform"
          >
            {onboardingStep < slides.length - 1 ? "Selanjutnya" : "Mulai Gunakan App"}
          </button>
          
          {onboardingStep < slides.length - 1 && (
            <button onClick={() => setFinishedOnboarding(true)} className="w-full text-emerald-400/60 py-2 text-xs font-bold uppercase tracking-widest">
              Lewati Perkenalan
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-between p-10 text-white text-center">
        {/* Top Logo Section */}
        <div className="w-full flex flex-col items-center pt-10">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8 border border-emerald-400/20">
            <Sprout className="w-16 h-16 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-display font-black mb-2 tracking-tight">AgroSmart AI</h1>
          <p className="text-emerald-100/40 text-xs font-bold uppercase tracking-[0.4em]">Solusi Tani Masa Depan</p>
        </div>

        {/* Center Google Login */}
        <div className="w-full max-w-sm">
          <p className="text-emerald-100/60 mb-8 leading-relaxed text-sm">
            Selamat datang di platform pertanian cerdas. Silakan masuk untuk mengelola lahan Anda.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white text-zinc-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-4 hover:bg-emerald-50 transition-all shadow-xl active:scale-[0.98] border border-zinc-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google
          </button>
        </div>
        
        {/* Bottom Guest Login */}
        <div className="w-full max-w-sm pb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[10px] text-emerald-100/30 font-bold">ATAU</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>
          <button 
            onClick={() => setShowDemoApp(true)}
            className="w-full py-4 bg-emerald-800/40 border border-emerald-500/20 rounded-2xl text-[11px] font-bold text-emerald-300 uppercase tracking-widest hover:bg-emerald-800/60 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            Masuk sebagai Tamu (Mode Demo)
          </button>
          
          <p className="mt-8 text-[9px] text-emerald-500/20 font-bold uppercase tracking-[0.4em]">
            AgroSmart AI Terminal v1.4.2
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden transition-colors duration-500",
      isDarkMode ? "bg-zinc-950 text-emerald-50" : "bg-zinc-50 text-zinc-950"
    )}>
      {/* Main Content */}
      <header className={cn(
        "sticky top-0 z-40 flex items-center justify-between px-6 py-4 shadow-sm border-b transition-colors",
        isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-xl">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <h1 className={cn(
            "font-display font-bold text-xl leading-none",
            isDarkMode ? "text-white" : "text-zinc-900"
          )}>
            {activeTab === 'dashboard' && "AgroSmart"}
            {activeTab === 'pest' && "Deteksi Hama"}
            {activeTab === 'market' && "Harga Pangan"}
            {activeTab === 'chat' && "Asisten AI"}
            {activeTab === 'profile' && "Profil Saya"}
            {activeTab === 'admin' && "Panel Admin"}
            {activeTab === 'history' && "Riwayat Deteksi"}
            {activeTab === 'weather' && "Cuaca"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors",
              isDarkMode ? "bg-amber-900/20 text-amber-400 border-amber-900/30" : "bg-amber-50 text-amber-700 border-amber-100"
            )}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Admin</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-x-hidden p-5",
        activeTab === 'chat' ? "pb-0 overflow-hidden" : "pb-32 overflow-y-auto"
      )}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* User Welcome Card */}
            <div className="bg-emerald-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-emerald-900/20 group">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-1 group-hover:translate-x-1 transition-transform">Halo, {userData?.displayName?.split(' ')[0]} 👋</h2>
                <p className="text-emerald-300 text-xs mb-6">Optimalkan lahan Anda dengan solusi AI terpadu.</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
                    <p className="text-[10px] text-white/60 uppercase font-bold mb-1">Suhu Udara</p>
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-orange-400" />
                      <span className="text-xl font-bold">{weatherData.temp}°C</span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
                    <p className="text-[10px] text-white/60 uppercase font-bold mb-1">Prakiraan</p>
                    <div className="flex items-center gap-2">
                      <Wind className={cn(
                        "w-4 h-4",
                        weatherData.condition.includes('Hujan') ? "text-blue-400" : "text-amber-400"
                      )} />
                      <span className="text-sm font-bold leading-tight">{weatherData.condition}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-4">
                 <div className="animate-pulse w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]" />
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-emerald-500 rounded-full blur-[80px] opacity-20" />
            </div>

            {/* Main Tools Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className={cn(
                  "font-bold text-sm uppercase tracking-widest transition-colors",
                  isDarkMode ? "text-emerald-500" : "text-zinc-900"
                )}>Fitur Utama</h3>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Live Updates
                </div>
              </div>
              
              {/* Promo Card Detail Scan */}
              <button 
                onClick={() => setActiveTab('pest')}
                className={cn(
                  "w-full rounded-3xl p-5 flex items-center gap-5 shadow-sm active:scale-[0.98] transition-transform text-left border relative overflow-hidden",
                  isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors",
                  isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                )}>
                  <Camera className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className={cn("font-bold transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>Deteksi Hama AI</h4>
                  <p className={cn("text-xs transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Scan penyakit tanaman secara instan menggunakan kamera.</p>
                </div>
                <ChevronRight className={cn("w-5 h-5 transition-colors", isDarkMode ? "text-zinc-700" : "text-zinc-300")} />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent animate-shimmer" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <ToolIconCard isDarkMode={isDarkMode} icon={<TrendingUp />} label="Pasar" onClick={() => setActiveTab('market')} color="bg-blue-50 text-blue-600" />
                <ToolIconCard isDarkMode={isDarkMode} icon={<CloudSun />} label="Cuaca" onClick={() => setActiveTab('weather')} color="bg-cyan-50 text-cyan-600" />
              </div>
            </div>
          </div>
        )}

          {activeTab === 'pest' && (
            <div>
              {!pestResult ? (
                <div className="flex flex-col items-center justify-center pt-10 text-center">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-600">
                    <Camera className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Ambil Foto Hama</h3>
                  <p className="text-zinc-500 text-sm mb-8 px-6">
                    Mungkinkan AI menganalisis tanaman Anda untuk deteksi penyakit dan hama yang akurat.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
                    <button 
                      onClick={() => Capacitor.isNativePlatform() ? handleNativeCamera(CameraSource.Camera) : null}
                      className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                      <Camera className="w-5 h-5" />
                      Ambil Foto
                      {!Capacitor.isNativePlatform() && (
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                      )}
                    </button>
                    
                    {Capacitor.isNativePlatform() && (
                      <button 
                        onClick={() => handleNativeCamera(CameraSource.Photos)}
                        className={cn(
                          "flex-1 px-6 py-4 rounded-2xl font-bold border active:scale-95 transition-all flex items-center justify-center gap-2",
                          isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-zinc-200 text-zinc-600"
                        )}
                      >
                        <ImageIcon className="w-5 h-5" />
                        Galeri
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-12 flex items-center gap-2 text-zinc-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Privacy Protected AI Analysis</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                          pestResult.tingkat_keparahan === 'Tinggi' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <Bug className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl leading-tight text-zinc-900">{pestResult.nama}</h4>
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 uppercase tracking-wider",
                            pestResult.tingkat_keparahan === 'Tinggi' ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            <AlertCircle className="w-3 h-3" />
                            {pestResult.tingkat_keparahan}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setPestResult(null)} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-200"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-5">
                      <h5 className="font-bold text-sm text-zinc-900 border-l-4 border-emerald-500 pl-3">Rekomendasi Ahli AI</h5>
                      <div className="space-y-3">
                        {pestResult.langkah_penanganan?.map((step: string, i: number) => (
                          <div key={i} className="flex gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 items-start">
                            <div className="w-6 h-6 bg-white border border-zinc-200 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-emerald-600 shadow-sm">
                              {i + 1}
                            </div>
                            <p className="text-sm text-zinc-700 leading-relaxed font-medium">{step}</p>
                          </div>
                        ))}
                      </div>
                      


                      <button 
                        onClick={handleExportPDF}
                        className="w-full mt-4 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        <FileDown className="w-5 h-5" />
                        Unduh Laporan PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'market' && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-lg uppercase tracking-wider">Tren Harga Pangan</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FilterGroupMobile 
                      label="Provinsi" 
                      options={PROVINCES} 
                      value={marketFilters.province}
                      onChange={(v) => setMarketFilters(prev => ({...prev, province: v, regency: REGENCY_MAP[v]?.[0] || ''}))}
                    />
                    <FilterGroupMobile 
                      label="Kabupaten/Kota" 
                      options={REGENCY_MAP[marketFilters.province] || ['Semua Kabupaten/Kota']} 
                      value={marketFilters.regency || (REGENCY_MAP[marketFilters.province]?.[0] || 'Semua Kabupaten/Kota')}
                      onChange={(v) => setMarketFilters(prev => ({...prev, regency: v}))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FilterGroupMobile 
                      label="Komoditas" 
                      options={COMMODITIES} 
                      value={marketFilters.commodity}
                      onChange={(v) => setMarketFilters(prev => ({...prev, commodity: v}))}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Tanggal</label>
                      <div className="relative group">
                        <input 
                          type="date"
                          value={marketFilters.date}
                          onChange={(e) => setMarketFilters(prev => ({...prev, date: e.target.value}))}
                          className="w-full bg-slate-800 border-none text-white px-4 py-3.5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 appearance-none"
                        />
                        <Calendar className="w-4 h-4 text-emerald-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={fetchMarketPrices}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Telusuri Harga Riil
                </button>
              </div>

              {marketData ? (
                <div className="space-y-4">
                  {marketData.aiCompass && (
                    <div className={cn(
                      "rounded-3xl p-6 border-l-8 shadow-sm flex flex-col gap-4 transition-colors",
                      isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100",
                      marketData.aiCompass.status === 'Peluang' ? "border-l-emerald-500" : 
                      marketData.aiCompass.status === 'Waspada' ? "border-l-amber-500" : "border-l-blue-500"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          marketData.aiCompass.status === 'Peluang' ? "bg-emerald-50 text-emerald-600" : 
                          marketData.aiCompass.status === 'Waspada' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">AI Market Compass</h4>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            marketData.aiCompass.status === 'Peluang' ? "text-emerald-500" : 
                            marketData.aiCompass.status === 'Waspada' ? "text-amber-500" : "text-blue-500"
                          )}>Status: {marketData.aiCompass.status}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Kondisi Saat Ini</p>
                          <p className="text-xs leading-relaxed font-medium">{marketData.aiCompass.insight}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className={isDarkMode ? "bg-zinc-800/50 p-3 rounded-2xl" : "bg-zinc-50 p-3 rounded-2xl"}>
                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Prediksi</p>
                            <p className="text-[11px] leading-tight font-bold">{marketData.aiCompass.forecast}</p>
                          </div>
                          <div className={isDarkMode ? "bg-zinc-800/50 p-3 rounded-2xl" : "bg-zinc-50 p-3 rounded-2xl"}>
                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Saran Aksi</p>
                            <p className="text-[11px] leading-tight font-bold text-emerald-600">{marketData.aiCompass.strategy}</p>
                          </div>
                        </div>
                      </div>
                      <GroundingSources grounding={marketData.grounding} isDarkMode={isDarkMode} />
                    </div>
                  )}

                  {marketData.items?.length > 0 ? marketData.items.map((item, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "rounded-3xl p-5 border shadow-sm transition-colors",
                        isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className={cn("font-bold text-base", isDarkMode ? "text-white" : "text-zinc-900")}>{item.name}</h4>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{item.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-lg font-display font-bold", isDarkMode ? "text-white" : "text-zinc-900")}>
                            Rp {Number(item.price).toLocaleString('id-ID')}
                          </p>
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                            item.trend === 'up' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                          )}>
                            {item.trend === 'up' ? '▲' : '▼'} {item.changePercent}
                          </div>
                        </div>
                      </div>

                      <div className="h-[80px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={item.history ? item.history.map((v, idx) => ({ v, idx })) : []}>
                            <Area 
                              type="monotone" 
                              dataKey="v" 
                              stroke={item.trend === 'up' ? "#ef4444" : "#10b981"} 
                              fill={item.trend === 'up' ? "#ef444420" : "#10b98120"} 
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 opacity-40">
                      <p className="text-xs font-bold uppercase tracking-widest">Gagal memuat data komoditas</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "border-2 border-dashed rounded-3xl p-16 text-center opacity-40 transition-colors",
                  isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                  <TrendingUp className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pilih filter untuk melihat data</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-600 rounded-3xl p-5 text-white shadow-lg">
                  <UserCircle className="w-6 h-6 mb-2 opacity-80" />
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Total User</p>
                  <p className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString('id-ID')}</p>
                </div>
                <div className={cn(
                  "rounded-3xl p-5 border shadow-sm transition-colors",
                  isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
                )}>
                  <Bug className="text-rose-500 w-6 h-6 mb-2" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Total Scan</p>
                  <p className={cn("text-2xl font-bold transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>
                    {adminStats.totalScans.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Add Admin Feature */}
              <div className={cn(
                "rounded-3xl p-6 border shadow-sm",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-sm">Manajemen Admin</h4>
                </div>
                <form onSubmit={handleAddAdmin} className="space-y-3">
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                    Masukkan email user yang sudah terdaftar untuk memberikan hak akses Admin.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="Email Calon Admin..."
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl text-xs font-bold focus:outline-none border transition-colors",
                        isDarkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                    <button 
                      type="submit"
                      disabled={adminActionLoading || !newAdminEmail}
                      className="bg-amber-500 text-white px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
                    >
                      {adminActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tambah"}
                    </button>
                  </div>
                  {adminActionResult && (
                    <div className={cn(
                      "p-3 rounded-xl text-[10px] font-bold animate-in fade-in slide-in-from-top-1",
                      adminActionResult.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                      {adminActionResult.message}
                    </div>
                  )}
                </form>

                {adminsList.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Daftar Admin Aktif</h5>
                    <div className="space-y-2">
                      {adminsList.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-7 h-7 rounded-full overflow-hidden transition-colors bg-white", isDarkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                              <img 
                                src={admin.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${admin.displayName || admin.email}`} 
                                alt="" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">
                                {admin.displayName || 'Admin'}
                              </span>
                              <span className="text-[8px] text-zinc-500 truncate max-w-[150px]">
                                {admin.email}
                              </span>
                            </div>
                          </div>
                          {admin.email !== 'raihanramanda644@gmail.com' && (
                            <button 
                              onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                              className="text-[9px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gemini API Key Management */}
              <div className={cn(
                "rounded-3xl p-6 border shadow-sm",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      apiKeyStatus === 'valid' ? "bg-emerald-500/10 text-emerald-500" : 
                      apiKeyStatus === 'invalid' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-500/10 text-zinc-500"
                    )}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm">Gemini (Cloud Sync)</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      apiKeyStatus === 'valid' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : 
                      apiKeyStatus === 'invalid' ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : 
                      apiKeyStatus === 'checking' ? "bg-amber-500 animate-pulse" : "bg-zinc-300"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {apiKeyStatus === 'valid' ? 'Aktif' : 
                       apiKeyStatus === 'invalid' ? 'Error' : 
                       apiKeyStatus === 'checking' ? 'Cek...' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                    Key ini akan disimpan di Cloud. Mendukung deteksi hama, prakiraan cuaca cerdas, dan <b>Google Search grounding</b> untuk harga pangan terbaru.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={customApiKey}
                      onChange={(e) => {
                        setCustomApiKey(e.target.value);
                        if (apiKeyStatus === 'valid') setApiKeyStatus('idle');
                      }}
                      placeholder="AI_Studio_API_Key_..."
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl text-xs font-mono focus:outline-none border transition-colors",
                        isDarkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900",
                        apiKeyStatus === 'valid' ? "border-emerald-500/50" : 
                        apiKeyStatus === 'invalid' ? "border-rose-500/50" : ""
                      )}
                    />
                    <button
                      onClick={checkApiKey}
                      disabled={apiKeySaving || !customApiKey}
                      className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
                    >
                      {apiKeySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                    </button>
                  </div>
                  {!isAdmin && user && (
                    <p className="text-[9px] text-amber-500 font-bold ml-1">
                      ⚠️ Anda bukan Admin. Key hanya akan tersimpan di browser ini (Local).
                    </p>
                  )}
                  {apiKeyError && (
                    <p className="text-[9px] text-rose-500 font-bold ml-1 italic">{apiKeyError}</p>
                  )}
                  {apiKeyStatus === 'valid' && (
                    <p className="text-[9px] text-emerald-500 font-bold ml-1">Cloud Sync Aktif: Siap digunakan oleh semua user.</p>
                  )}
                </div>

                {/* DeepSeek Support */}
                <div className={cn("mt-8 pt-6 border-t transition-colors", isDarkMode ? "border-zinc-800" : "border-zinc-100")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        deepSeekStatus === 'valid' ? "bg-blue-500/10 text-blue-500" : 
                        deepSeekStatus === 'invalid' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-500/10 text-zinc-500"
                      )}>
                        <Cpu className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm">DeepSeek AI (Beta)</h4>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className={cn(
                        "w-2 h-2 rounded-full",
                        deepSeekStatus === 'valid' ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : 
                        deepSeekStatus === 'invalid' ? "bg-rose-500" : 
                        deepSeekStatus === 'checking' ? "bg-amber-500 animate-pulse" : "bg-zinc-300"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                        {deepSeekStatus === 'valid' ? 'Aktif' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <input 
                    type="password" 
                    value={deepSeekKey}
                    onChange={(e) => setDeepSeekKeyInput(e.target.value)}
                    placeholder="sk-deepseek-..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl text-xs font-mono focus:outline-none border transition-colors",
                      isDarkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                    )}
                  />
                </div>

                {/* Weather API Support */}
                <div className={cn("mt-8 pt-6 border-t transition-colors", isDarkMode ? "border-zinc-800" : "border-zinc-100")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        weatherStatus === 'valid' ? "bg-amber-500/10 text-amber-500" : 
                        weatherStatus === 'invalid' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-500/10 text-zinc-500"
                      )}>
                        <CloudSun className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm">OpenWeather API</h4>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className={cn(
                        "w-2 h-2 rounded-full",
                        weatherStatus === 'valid' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : 
                        weatherStatus === 'invalid' ? "bg-rose-500" : "bg-zinc-300"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                        {weatherStatus === 'valid' ? 'Aktif' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <input 
                    type="password" 
                    value={weatherKey}
                    onChange={(e) => setWeatherKeyInput(e.target.value)}
                    placeholder="API Key OpenWeatherMap..."
                    className={cn(
                      "w-full px-4 py-3 rounded-xl text-xs font-mono focus:outline-none border transition-colors",
                      isDarkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                    )}
                  />
                  {weatherStatus === 'valid' && (
                    <p className="text-[9px] text-emerald-500 font-bold mt-2 ml-1">Cloud Sync Aktif: Semua user menggunakan key ini.</p>
                  )}
                </div>
              </div>

              {/* Removed dummy chart */}

              <div className={cn(
                "rounded-3xl border shadow-sm overflow-hidden transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <div className={cn(
                  "p-5 border-b flex justify-between items-center transition-colors",
                  isDarkMode ? "border-zinc-800" : "border-zinc-50"
                )}>
                  <h4 className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-zinc-900")}>Daftar User Terbaru</h4>
                  <button onClick={fetchAdminData} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Refresh</button>
                </div>
                <div className={cn("divide-y", isDarkMode ? "divide-zinc-800" : "divide-zinc-50")}>
                  {recentUsers.length === 0 ? (
                    <p className="p-10 text-center text-xs text-zinc-400">Belum ada user terdaftar.</p>
                  ) : recentUsers.map((u, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full overflow-hidden transition-colors bg-white shadow-sm", isDarkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                          <img 
                            src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.displayName || u.email}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className={cn("text-xs font-bold transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>{u.displayName || 'User Baru'}</p>
                          <p className="text-[10px] text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.role === 'admin' && (
                          <span className="text-[8px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase">Admin</span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-medium">Aktif</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <button onClick={() => setActiveTab('profile')} className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">
                  <X className="w-4 h-4" /> Kembali
                </button>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                   {history.length} Laporan Tersimpan
                </div>
              </div>

              {history.length === 0 ? (
                <div className="py-20 text-center opacity-20">
                   <Bug className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-bold uppercase tracking-widest text-sm">Belum ada riwayat</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {history.map((item: any) => (
                    <div key={item.id} className={cn(
                      "rounded-[2rem] overflow-hidden border shadow-sm active:scale-95 transition-all text-left group relative",
                      isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
                    )}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogToDelete(item.id);
                        }}
                        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {logToDelete === item.id && (
                        <div className="absolute inset-0 z-20 bg-zinc-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-200">
                          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                          <p className="text-[10px] font-bold text-white mb-4 uppercase tracking-widest">Hapus laporan ini?</p>
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setLogToDelete(null); }}
                              className="flex-1 py-2 rounded-xl bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                            >
                              Tidak
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteDetectionLog(item.id); }}
                              className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 transition-colors"
                            >
                              Ya
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="relative overflow-hidden aspect-square">
                        <img 
                          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/300/300`} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer" 
                          alt={item.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-4">
                        <h4 className={cn("text-[11px] font-bold truncate transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>{item.name}</h4>
                        <p className="text-[9px] text-zinc-400 mt-1 mb-3">{item.date}</p>
                        <span className={cn(
                          "text-[8px] px-2 py-0.5 rounded-full font-bold uppercase transition-colors",
                          item.severity === 'Tinggi' ? (isDarkMode ? "bg-rose-900/20 text-rose-400" : "bg-rose-50 text-rose-600") :
                          item.severity === 'Sedang' ? (isDarkMode ? "bg-amber-900/20 text-amber-400" : "bg-amber-50 text-amber-600") :
                          (isDarkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                        )}>
                          {item.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="fixed inset-0 flex flex-col z-30" style={{ top: '65px', bottom: isKeyboardOpen ? '0px' : '85px' }}>

              {/* Messages Area - Scrollable */}
              <div className={cn("flex-1 overflow-y-auto space-y-3 px-5 py-3 scroll-smooth", isDarkMode ? "bg-zinc-950" : "bg-zinc-50")} ref={scrollRef} style={{ overscrollBehavior: 'contain' }}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '100%' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[20px] flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h4 className={cn("text-base font-bold mb-1", isDarkMode ? "text-white" : "text-zinc-800")}>AgroSmart AI</h4>
                    <p className={cn("text-xs mb-4", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Asisten pertanian cerdas, siap 24/7</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['🌾 Tips Padi', '🐛 Hama Jagung', '💧 Irigasi'].map((label) => (
                        <button
                          key={label}
                          onClick={() => { setInput(label.slice(2).trim()); }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all active:scale-95",
                            isDarkMode 
                              ? "border-zinc-700 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400" 
                              : "border-zinc-200 text-zinc-500 hover:border-emerald-300 hover:text-emerald-600"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}>
                    {msg.role !== 'user' && (
                      <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white mr-2 mt-1 flex-shrink-0 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] px-4 py-2.5 text-sm leading-relaxed transition-colors",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-2xl rounded-br-md shadow-md" 
                        : (isDarkMode 
                          ? "bg-zinc-800/80 text-zinc-200 rounded-2xl rounded-bl-md border border-zinc-700/50" 
                          : "bg-white text-zinc-800 rounded-2xl rounded-bl-md border border-zinc-100 shadow-sm")
                    )}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {loading && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white mr-2 mt-1 flex-shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl rounded-bl-md border flex gap-1 items-center",
                      isDarkMode ? "bg-zinc-800/80 border-zinc-700/50" : "bg-white border-zinc-100 shadow-sm"
                    )}>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Bar - ChatGPT Style, pinned to bottom */}
              <div className={cn(
                "px-5 py-3 mt-auto",
                isDarkMode ? "bg-zinc-950" : "bg-zinc-50"
              )}>
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className={cn(
                    "flex items-end gap-2 p-2 rounded-2xl border transition-all",
                    isDarkMode 
                      ? "bg-zinc-800/80 border-zinc-700/50 focus-within:border-emerald-500/30 focus-within:ring-1 focus-within:ring-emerald-500/10" 
                      : "bg-white border-zinc-200 focus-within:border-emerald-500/30 focus-within:ring-1 focus-within:ring-emerald-500/10 shadow-sm"
                  )}
                >
                  <textarea 
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize textarea
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Tanya seputar pertanian..."
                    rows={1}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm resize-none focus:outline-none bg-transparent leading-relaxed",
                      isDarkMode ? "text-white placeholder-zinc-500" : "text-zinc-900 placeholder-zinc-400"
                    )}
                    style={{ maxHeight: '120px' }}
                  />
                  <button 
                    type="submit"
                    disabled={loading || !input.trim()}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-200 flex-shrink-0",
                      input.trim() 
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-90" 
                        : (isDarkMode ? "bg-zinc-700 text-zinc-500" : "bg-zinc-100 text-zinc-400"),
                      "disabled:opacity-40"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className={cn(
                "rounded-3xl p-8 border shadow-sm text-center relative overflow-hidden transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <div className="relative z-10">
                  <div className={cn(
                    "w-24 h-24 rounded-full border-4 mx-auto mb-4 overflow-hidden shadow-xl transition-colors bg-white",
                    isDarkMode ? "border-emerald-900/30" : "border-emerald-50"
                  )}>
                    <img 
                      src={userData?.photoURL || user?.photoURL || (userData?.uid ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.uid}` : "https://api.dicebear.com/7.x/avataaars/svg?seed=Agro")} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>{userData?.displayName || "Petani AgroSmart"}</h3>
                  <p className={cn("text-xs mb-6 transition-colors", isDarkMode ? "text-zinc-400" : "text-zinc-500")}>{userData?.email}</p>
                  
                  <div className="flex justify-center gap-6">
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Status</p>
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full border transition-colors",
                        isDarkMode ? "bg-emerald-900/20 text-emerald-400 border-emerald-900/30" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      )}>User Aktif</span>
                    </div>
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Akses</p>
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider transition-colors",
                        isDarkMode ? "bg-zinc-800 text-white" : "bg-slate-900 text-white"
                      )}>{userData?.role || 'user'}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-4 font-bold">
                  <ShieldCheck className={cn("w-12 h-12 opacity-20 transition-colors", isDarkMode ? "text-emerald-900/10" : "text-emerald-50")} />
                </div>
              </div>

              {/* Theme Settings */}
              <div className={cn(
                "rounded-3xl p-6 border shadow-sm flex items-center justify-between transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-zinc-50 text-zinc-500")}>
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={cn("font-bold text-sm transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>Mode Gelap</h4>
                    <p className={cn("text-[10px] transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Sesuaikan tampilan kenyamanan mata</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    isDarkMode ? "bg-emerald-500" : "bg-zinc-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    isDarkMode ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              {/* Management Items (Admin Only) */}
              {isAdmin && (
                <div className={cn(
                  "rounded-3xl p-6 text-white shadow-xl mb-6 transition-colors",
                  isDarkMode ? "bg-emerald-900 border border-emerald-800 shadow-emerald-950/20" : "bg-emerald-950 shadow-emerald-900/10"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-none">Panel Kontrol</h4>
                        <p className={cn("text-[10px] uppercase font-bold tracking-widest mt-1", isDarkMode ? "text-emerald-500" : "text-emerald-400")}>Sistem Admin</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('admin')}
                      className="px-4 py-2 bg-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
                    >
                      Buka Panel
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-100/60 leading-relaxed italic">
                    Gunakan panel ini untuk memonitor perkembangan pengguna dan statistik pemakaian sistem AI secara real-time.
                  </p>
                </div>
              )}

              {/* Menu Items */}
              <div className={cn(
                "rounded-3xl border shadow-sm overflow-hidden transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <ProfileMenuItem isDarkMode={isDarkMode} onClick={() => setActiveTab('settings')} icon={<Settings className={cn("transition-colors", isDarkMode ? "text-zinc-600" : "text-slate-400")} />} label="Pengaturan Akun" />
                <ProfileMenuItem 
                  isDarkMode={isDarkMode}
                  onClick={() => setActiveTab('history')}
                  icon={<Bug className={cn("transition-colors", isDarkMode ? "text-rose-600" : "text-rose-400")} />} 
                  label="Riwayat Deteksi" 
                />
                <ProfileMenuItem isDarkMode={isDarkMode} onClick={() => setActiveTab('about')} icon={<Info className={cn("transition-colors", isDarkMode ? "text-zinc-600" : "text-zinc-400")} />} label="Tentang Aplikasi" />
                <div className={cn("p-4 border-t mt-2 transition-colors", isDarkMode ? "border-zinc-800" : "border-zinc-50")}>
                  <button 
                    onClick={() => {
                      logout();
                      setShowDemoApp(false);
                      setActiveTab('dashboard');
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold active:scale-95 transition-all",
                      isDarkMode ? "bg-rose-950/30 text-rose-500" : "bg-rose-50 text-rose-600"
                    )}
                  >
                    <LogOut className="w-5 h-5" />
                    Keluar Sekarang
                  </button>
                </div>
              </div>

              <div className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] pt-4">
                AgroSmart AI Mobile v1.4.2
              </div>
            </div>
          )}
                {activeTab === 'weather' && (
            <div className="space-y-6">
              <div className={cn(
                "rounded-3xl p-6 border shadow-sm min-h-[400px] transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <div className="flex items-center gap-3 mb-8">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isDarkMode ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <CloudSun className="w-6 h-6" />
                  </div>
                  <h3 className={cn("font-bold border-l-4 pl-3 transition-colors", isDarkMode ? "text-white border-emerald-500" : "text-zinc-900 border-zinc-100")}>
                    Rekomendasi Cuaca
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                        className={cn(
                          "w-full p-4 pl-12 rounded-2xl text-xs font-bold focus:outline-none transition-colors",
                          isDarkMode ? "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-100 text-zinc-900 placeholder:text-zinc-400"
                        )}
                        placeholder="Masukkan Lokasi Lahan..."
                      />
                      <MapPin className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <button 
                      onClick={() => handleAutoLocation()}
                      title="Gunakan Lokasi Saat Ini"
                      className={cn(
                        "p-4 border rounded-2xl active:scale-95 transition-all text-emerald-600",
                        isDarkMode ? "bg-emerald-900/40 border-emerald-900/30" : "bg-emerald-50 border-emerald-100"
                      )}
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => fetchWeather()}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold mb-8 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Mulai Analisis AI"}
                </button>
                
                <div className={cn(
                  "markdown-body prose prose-sm prose-emerald max-w-none transition-colors",
                  isDarkMode ? "prose-invert" : "prose-slate",
                  loading ? "opacity-30" : "opacity-100"
                )}>
                  {weatherRecs.text ? (
                    <>
                      <Markdown>{weatherRecs.text}</Markdown>
                      <GroundingSources grounding={weatherRecs.grounding} isDarkMode={isDarkMode} />
                    </>
                  ) : (
                    !loading && (
                      <div className="py-20 text-center opacity-40">
                        <Star className="w-8 h-8 mx-auto mb-3" />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Belum Ada Data</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn("flex items-center gap-2 text-xs font-bold transition-colors", isDarkMode ? "text-zinc-400" : "text-zinc-500")}
              >
                <X className="w-4 h-4" /> Kembali
              </button>
              
              <div className={cn(
                "rounded-3xl p-6 border shadow-sm transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <h3 className={cn("font-bold mb-4 flex items-center gap-2", isDarkMode ? "text-white" : "text-zinc-900")}>
                  <User className="w-4 h-4 text-emerald-500" /> Profil Pengguna
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-4">
                      <div className={cn("w-16 h-16 rounded-full overflow-hidden border-2 shadow-sm transition-colors bg-white", isDarkMode ? "border-zinc-800" : "border-zinc-100")}>
                        <img 
                          src={userData?.photoURL || user?.photoURL || (userData?.uid ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.uid}` : "https://api.dicebear.com/7.x/avataaars/svg?seed=Agro")} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-bold", isDarkMode ? "text-white" : "text-zinc-900")}>Foto Profil</p>
                        <p className="text-[10px] text-zinc-400">Sinkron otomatis dengan akun Google</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-2 transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Nama Lengkap</label>
                    <div className="flex gap-2">
                    <input 
                      type="text" 
                      defaultValue={userData?.displayName || ""}
                      id="update-name-input"
                      className={cn(
                        "flex-1 p-3 rounded-xl text-sm font-bold focus:outline-none border transition-colors",
                        isDarkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-100 text-zinc-900"
                      )}
                    />
                    <button 
                      onClick={() => {
                        const val = (document.getElementById('update-name-input') as HTMLInputElement).value;
                        updateDisplayName(val);
                      }}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-emerald-600/20 shrink-0",
                        "bg-emerald-600 text-white hover:bg-emerald-500"
                      )}
                      title="Simpan"
                    >
                      <Check className="w-6 h-6" />
                    </button>
                    </div>
                  </div>
                  <div>
                    <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Email (Terkunci)</label>
                    <p className={cn("p-3 rounded-xl text-xs font-bold opacity-50 border transition-colors", isDarkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-100 text-zinc-900")}>
                      {userData?.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "rounded-3xl p-6 border shadow-sm transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                <h3 className={cn("font-bold mb-4 flex items-center gap-2", isDarkMode ? "text-white" : "text-zinc-900")}>
                  <ShieldCheck className="w-4 h-4 text-rose-500" /> Keamanan & Data
                </h3>
                <button 
                  onClick={() => setShowConfirmClearChat(true)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl mb-3 border transition-all active:scale-[0.98]",
                    isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-50 border-zinc-100 text-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold">Hapus Riwayat Chat</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {showConfirmClearChat && (
                  <div className="mt-2 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-tight">Hapus semua chat?</p>
                        <p className="text-[9px] text-rose-500/60 font-medium">Tindakan ini tidak bisa dibatalkan.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowConfirmClearChat(false)}
                        className="flex-1 py-2 rounded-xl bg-white/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={clearChatHistory}
                        className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-zinc-100">
                   <button 
                    onClick={() => setShowConfirmDeleteAccount(true)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      isDarkMode ? "bg-rose-950/20 border-rose-900/30 text-rose-500" : "bg-rose-50 border-rose-100 text-rose-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-bold">Hapus Akun Permanen</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {showConfirmDeleteAccount && (
                    <div className="mt-2 p-5 rounded-2xl bg-rose-600 text-white animate-in zoom-in duration-300">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest leading-tight mb-1">PERINGATAN KERAS!</p>
                          <p className="text-[10px] opacity-80 leading-relaxed">
                            Semua data profil, riwayat scan hama, dan chat Anda akan dihapus selamanya dari server kami.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowConfirmDeleteAccount(false)}
                          className="flex-1 py-3 rounded-xl bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-colors"
                        >
                          Batalkan
                        </button>
                        <button 
                          onClick={handleDeleteAccount}
                          className="flex-1 py-3 rounded-xl bg-white text-rose-600 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 shadow-xl transition-colors"
                        >
                          HAPUS SEKARANG
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn("flex items-center gap-2 text-xs font-bold transition-colors", isDarkMode ? "text-zinc-400" : "text-zinc-500")}
              >
                <X className="w-4 h-4" /> Kembali
              </button>

              <div className={cn(
                "rounded-3xl p-8 border shadow-sm text-center transition-colors relative overflow-hidden",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
              )}>
                {/* Expo Badge */}
                <div className="absolute top-0 right-0">
                  <div className="bg-emerald-500 text-white text-[10px] font-black px-8 py-2 rotate-45 translate-x-6 translate-y-2 shadow-lg">
                    PRODUK UNGGULAN EXPO 2026
                  </div>
                </div>

                <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20">
                  <Sprout className="w-12 h-12" />
                </div>
                <h2 className={cn("text-2xl font-black italic transition-colors", isDarkMode ? "text-white" : "text-emerald-950")}>AgroSmart<span className="text-emerald-500">AI</span></h2>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1 tracking-[0.3em]">Advanced Agri-Tech Engine v1.4.2</p>
                
                <div className={cn("mt-8 text-left space-y-6 text-xs leading-relaxed transition-colors", isDarkMode ? "text-zinc-400" : "text-zinc-600")}>
                  <p>
                    <span className="font-bold text-emerald-500">AgroSmart AI</span> adalah manifestasi dari visi "Pertanian No. 1 di Dunia". Platform ini mengintegrasikan 
                    <span className="font-bold"> Vision AI</span> untuk deteksi hama, <span className="font-bold">Predictive Analytics</span> untuk cuaca, 
                    dan <span className="font-bold">Neural Chatbot</span> untuk konsultasi pakar instan.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-2xl border bg-opacity-50", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-100")}>
                      <Cpu className="w-4 h-4 text-emerald-500 mb-2" />
                      <h4 className={cn("font-bold text-[10px] uppercase mb-1 transition-colors", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>Infrastruktur</h4>
                      <p className="text-[9px] opacity-70">Multi-Cloud Sync & Serverless Architecture</p>
                    </div>
                    <div className={cn("p-4 rounded-2xl border bg-opacity-50", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-100")}>
                      <Bot className="w-4 h-4 text-emerald-500 mb-2" />
                      <h4 className={cn("font-bold text-[10px] uppercase mb-1 transition-colors", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>Intelligence</h4>
                      <p className="text-[9px] opacity-70">LLM Deep Integration (Gemini & DeepSeek)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className={cn("font-bold flex items-center gap-2 transition-colors", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Keamanan Global
                    </h4>
                    <p>Menerapkan standar enkripsi AES-256 untuk perlindungan data petani dan kepemilikan intelektual algoritma deteksi lokal.</p>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-zinc-100">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Masterpiece Framework by</p>
                  <p className={cn("font-bold text-xs mt-1 transition-colors", isDarkMode ? "text-zinc-300" : "text-zinc-900")}>Tim Unggulan Informatika — Global Industry Class © 2026</p>
                </div>
              </div>
            </div>
          )}
        </main>

      {/* Mobile Bottom Navigation */}
      {!(isKeyboardOpen && activeTab === 'chat') && (
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 border-t px-4 py-3 flex items-center justify-around z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.03)] transition-colors duration-500",
        isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-100"
      )}>
        <NavItem isDarkMode={isDarkMode} active={activeTab === 'dashboard' || activeTab === 'pest' || activeTab === 'weather'} icon={<LayoutDashboard />} label="Beranda" onClick={() => setActiveTab('dashboard')} />
        <NavItem isDarkMode={isDarkMode} active={activeTab === 'market'} icon={<TrendingUp />} label="Pasar" onClick={() => setActiveTab('market')} />
        <NavItem isDarkMode={isDarkMode} active={activeTab === 'chat'} icon={<MessageSquare />} label="AI Chat" onClick={() => setActiveTab('chat')} />
        <NavItem isDarkMode={isDarkMode} active={activeTab === 'profile'} icon={<UserCircle />} label="Profil" onClick={() => setActiveTab('profile')} />
      </nav>
      )}

        {loading && activeTab !== 'chat' && (
          <AILoadingOverlay activeTab={activeTab} isDarkMode={isDarkMode} />
        )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl", className)} />
  );
}

function NavItem({ active, icon, label, onClick, isDarkMode }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, isDarkMode: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all duration-300",
        active ? "text-emerald-600" : (isDarkMode ? "text-zinc-600 hover:text-zinc-500" : "text-zinc-300 hover:text-zinc-500")
      )}
    >
      <div className={cn(
        "p-2 rounded-2xl transition-all duration-500",
        active ? (isDarkMode ? "bg-emerald-900/30 scale-110 shadow-inner" : "bg-emerald-50 scale-110 shadow-inner") : "bg-transparent shadow-none"
      )}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: cn("w-6 h-6", active ? "stroke-[2.5px]" : "stroke-[2px]") })}
      </div>
      <span className={cn(
        "text-[9px] font-bold uppercase tracking-widest transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0"
      )}>{label}</span>
      {active && <div className="w-1 h-1 bg-emerald-600 rounded-full" />}
    </button>
  );
}

function ToolIconCard({ icon, label, onClick, color, isDarkMode }: { icon: React.ReactNode, label: string, onClick: () => void, color: string, isDarkMode: boolean }) {
  const darkColors: Record<string, string> = {
    'bg-blue-50': "bg-blue-900/30 text-blue-400 border-blue-900/20",
    'bg-amber-50': "bg-amber-900/30 text-amber-400 border-amber-900/20",
    'bg-cyan-50': "bg-cyan-900/30 text-cyan-400 border-cyan-900/20",
    'bg-emerald-50': "bg-emerald-900/30 text-emerald-400 border-emerald-900/20"
  };

  const baseColor = color.split(' ')[0];

  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-3xl flex flex-col items-center text-center gap-3 border shadow-sm active:scale-90 transition-all",
        isDarkMode ? (darkColors[baseColor] || "bg-zinc-900 text-white border-zinc-800") : `${color} border-transparent`
      )}
    >
      <div className={cn(
        "p-3 rounded-2xl shadow-sm text-current transition-colors",
        isDarkMode ? "bg-zinc-800" : "bg-white"
      )}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 shadow-sm" })}
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider transition-colors",
        isDarkMode ? "text-zinc-100" : "text-zinc-900"
      )}>{label}</span>
    </button>
  );
}

function ProfileMenuItem({ icon, label, onClick, isDarkMode }: { icon: React.ReactNode, label: string, onClick?: () => void, isDarkMode: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-6 transition-colors border-b last:border-b-0",
        isDarkMode ? "hover:bg-zinc-800 active:bg-zinc-700 border-zinc-800" : "hover:bg-zinc-50 active:bg-zinc-100 border-zinc-50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl transition-colors", isDarkMode ? "bg-zinc-800" : "bg-zinc-50")}>
          {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
        </div>
        <span className={cn("text-sm font-bold transition-colors", isDarkMode ? "text-zinc-300" : "text-zinc-700")}>{label}</span>
      </div>
      <ChevronRight className={cn("w-4 h-4 transition-colors", isDarkMode ? "text-zinc-600" : "text-zinc-300")} />
    </button>
  );
}

function ActivityItem({ title, time, status, desc, isDarkMode }: { title: string, time: string, status: 'success' | 'warning' | 'info', desc: string, isDarkMode: boolean }) {
  const statusColors = {
    success: "bg-emerald-500 shadow-emerald-500/20",
    warning: "bg-amber-500 shadow-amber-500/20",
    info: "bg-blue-500 shadow-blue-500/20"
  };

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={cn("w-3 h-3 rounded-full mt-1.5 shadow-lg", statusColors[status])} />
        <div className={cn("w-0.5 flex-1 my-1 rounded-full transition-colors", isDarkMode ? "bg-zinc-800" : "bg-zinc-50")} />
      </div>
      <div className="pb-4 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className={cn("font-bold text-sm transition-colors", isDarkMode ? "text-white" : "text-zinc-900")}>{title}</h4>
          <span className={cn(
            "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full transition-colors border",
            isDarkMode ? "text-zinc-500 border-zinc-800" : "text-zinc-400 border-zinc-50"
          )}>{time}</span>
        </div>
        <p className={cn("text-xs leading-relaxed font-medium transition-colors", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>{desc}</p>
      </div>
    </div>
  );
}

function FilterGroupMobile({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800/50 border border-slate-700 text-white text-xs px-4 py-3 rounded-2xl focus:outline-none appearance-none font-bold"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90" />
      </div>
    </div>
  );
}

function GroundingSources({ grounding, isDarkMode }: { grounding?: any, isDarkMode: boolean }) {
  if (!grounding || !grounding.groundingChunks || grounding.groundingChunks.length === 0) return null;

  return (
    <div className={cn(
      "mt-6 pt-6 border-t border-dashed",
      isDarkMode ? "border-zinc-800" : "border-zinc-100"
    )}>
      <div className="flex flex-col gap-2">
        {grounding.groundingChunks.map((chunk: any, i: number) => {
          if (!chunk.web) return null;
          return (
            <a 
              key={i} 
              href={chunk.web.uri} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-bold border transition-all active:scale-95 group hover:shadow-lg",
                isDarkMode 
                  ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/5 shadow-black/20" 
                  : "bg-white border-zinc-200 text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 shadow-sm"
              )}
            >
              <div className="w-1.5 h-1.5 shrink-0 bg-emerald-500 rounded-full group-hover:animate-pulse" />
              <span className="truncate flex-1">{chunk.web.title || "Referensi Terverifikasi"}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function AILoadingOverlay({ activeTab, isDarkMode }: { activeTab: string, isDarkMode: boolean }) {
  const [phase, setPhase] = useState(0);

  const phases = {
    pest: [
      "Menginisiasi Model Visi Komputer...",
      "Menganalisis piksel gambar...",
      "Mengekstrak fitur daun & patogen...",
      "Mencocokkan database penyakit tanaman...",
      "Menyusun rekomendasi penanganan presisi..."
    ],
    market: [
      "Mengamankan koneksi ke SP2KP Kemendag...",
      "Menarik data komoditas pangan nasional...",
      "Menganalisis tren volatilitas harga...",
      "Menyusun prediksi pasar berbasis AI..."
    ],
    weather: [
      "Mengunduh data satelit agrometeorologi...",
      "Menganalisis anomali suhu & presipitasi...",
      "Mengkalkulasi tingkat risiko agrikultur...",
      "Menyusun protokol perlindungan tanaman..."
    ],
    default: [
      "Menginisiasi koneksi Neural Network...",
      "Memproses jutaan parameter data...",
      "Menyusun respons komprehensif..."
    ]
  };

  const currentPhases = phases[activeTab as keyof typeof phases] || phases.default;

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => (prev + 1) % currentPhases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentPhases.length]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={cn(
        "w-full max-w-[320px] rounded-[32px] shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden transition-all duration-500",
        isDarkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-zinc-100"
      )}>
        {/* Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 rounded-full blur-[50px] animate-pulse"></div>
        
        {/* Core AI Icon */}
        <div className="relative mb-8 mt-2">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[28px] flex items-center justify-center shadow-lg shadow-emerald-500/30 relative overflow-hidden group">
            {activeTab === 'pest' && <ImageIcon className="w-10 h-10 text-white relative z-10 animate-pulse" />}
            {activeTab === 'market' && <TrendingUp className="w-10 h-10 text-white relative z-10 animate-pulse" />}
            {activeTab === 'weather' && <CloudSun className="w-10 h-10 text-white relative z-10 animate-pulse" />}
            {!['pest', 'market', 'weather'].includes(activeTab) && <Bot className="w-10 h-10 text-white relative z-10 animate-pulse" />}
            
            {/* Fake Scanning Line */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-transparent h-1/2 w-full animate-bounce"></div>
          </div>
          
          {/* Orbiting particles */}
          <div className="absolute -inset-5 border border-emerald-500/20 rounded-full animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 w-3 h-3 bg-emerald-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(52,211,153,1)]"></div>
          </div>
          <div className="absolute -inset-8 border border-emerald-500/10 rounded-full animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-emerald-300 rounded-full -translate-x-1/2 translate-y-1/2 shadow-[0_0_8px_rgba(110,231,183,1)]"></div>
          </div>
        </div>

        <h3 className={cn("text-xl font-black tracking-tight mb-3", isDarkMode ? "text-white" : "text-zinc-900")}>
          AI Memproses
        </h3>
        
        {/* Dynamic Text with fade transition */}
        <div className="h-10 flex items-center justify-center px-4 w-full">
          <p 
            key={phase} 
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest animate-in fade-in zoom-in-95 duration-300 text-center", 
              isDarkMode ? "text-emerald-400" : "text-emerald-600"
            )}
          >
            {currentPhases[phase]}
          </p>
        </div>
        
        <Loader2 className={cn(
          "w-5 h-5 mt-4 animate-spin opacity-50",
          isDarkMode ? "text-zinc-500" : "text-zinc-400"
        )} />
      </div>
    </div>
  );
}
