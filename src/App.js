import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Settings,
  Search,
  Calendar,
  BookOpen,
  User,
  List,
  Sun,
  Moon,
  Bookmark,
  Info,
  Plus,
  Trash2,
  Clock,
  X,
  Bell,
  BellOff,
  ChevronRight,
  Github,
  History,
  Heart,
} from "lucide-react";
import OnboardingScreen from './OnboardingScreen';

const BACKEND_URL = "https://purring-celesta-fermitoday-f00679ea.koyeb.app";

// IndexedDB Helper
const DB_NAME = "FermiTodayDB";
const DB_VERSION = 1;

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    };
  });
};

const getFromDB = async (key) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["settings"], "readonly");
    const store = transaction.objectStore("settings");
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (key, value) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["settings"], "readwrite");
    const store = transaction.objectStore("settings");
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const extractClassFromSummary = (summary) => {
  const match = summary.match(/CLASS[EI]\s+([A-Z0-9,\s]+?)(?=\s*[-–]|\s+AULA|\s+PROF|\s*$)/i);
  if (!match) return [];
  const classPart = match[1];
  return classPart.split(/[,\s]+/).filter(c => c.trim().length > 0);
};

const extractProfessorFromSummary = (summary) => {
  const professors = [];
  const pluralMatch = summary.match(/PROFF?\.(?:ssa)?\s*([A-Z][A-Z\s,.']+?)(?=\s*CLASSE|\s*AULA|\s*ASSENTE|\s*$)/i);
  if (pluralMatch) {
    const names = pluralMatch[1].split(',');
    for (const name of names) {
      const trimmedName = name.trim().replace(/['"]+$/, '').trim().replace(/\s+/g, " ");
      if (trimmedName.length > 0 && trimmedName.length < 50) {
        professors.push(trimmedName);
      }
    }
    if (professors.length > 0) return professors;
  }
  const profMatches = [...summary.matchAll(/PROF\.?(?:ssa)?\.?\s*([A-Z][A-Z\s]+?)(?=\s*[,\(\)]|\s+ASSENTE|\s+CLASSE|\s*$)/gi)];
  for (const match of profMatches) {
    if (match[1]) {
      const profName = match[1].trim().replace(/\s+/g, " ");
      if (profName.length > 0) professors.push(profName);
    }
  }
  return professors;
};

const filterEventsByClass = (events, classCode) => {
  const upperClassCode = classCode.toUpperCase().trim();
  return events.filter((event) => {
    const extractedClasses = extractClassFromSummary(event.summary);
    return extractedClasses.includes(upperClassCode);
  });
};

const filterEventsByProfessor = (events, professorName) => {
  const upperProfName = professorName.toUpperCase().trim();
  return events.filter(event => {
    const extractedProfs = extractProfessorFromSummary(event.summary);
    if (extractedProfs.length > 0) {
      const found = extractedProfs.some(prof => prof.toUpperCase() === upperProfName);
      if (found) return true;
    }
    const descriptionUpper = event.description ? event.description.toUpperCase() : '';
    if (descriptionUpper.includes(`PROF`) && descriptionUpper.includes(upperProfName)) {
      return true;
    }
    return false;
  });
};

const EventCard = ({ item, index, isDark }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const isAllDayEvent = item.isAllDay || (typeof item.start === "string" && item.start.length === 10 && item.start.includes("-"));

  const formatTime = () => {
    if (isAllDayEvent) return "Tutto il giorno";
    try {
      const startTime = new Date(item.start).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
      const endTime = new Date(item.end).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
      return `${startTime} - ${endTime}`;
    } catch (error) {
      return "Orario non disponibile";
    }
  };

  return (
    <div className={`transition-all duration-500 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${index * 50}ms` }}>
      <div className={`rounded-2xl overflow-hidden shadow-lg mb-4 flex transition-all duration-300 hover:shadow-xl ${isDark ? "bg-zinc-900" : "bg-white"}`}>
        <div className="w-1.5 bg-indigo-500 flex-shrink-0"></div>
        <div className="flex-1 p-5">
          <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{item.summary}</h3>
          {item.description && <p className={`text-sm mb-3 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.description}</p>}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg w-fit ${isDark ? "bg-zinc-800" : "bg-gray-100"}`}>
            {isAllDayEvent ? <Calendar className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} /> : <Clock className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />}
            <span className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{formatTime()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [section, setSection] = useState("");
  const [professor, setProfessor] = useState("");
  const [savedSections, setSavedSections] = useState([]);
  const [savedProfessors, setSavedProfessors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [themeMode, setThemeMode] = useState("auto"); // "light", "dark", "auto"
  const [showSettings, setShowSettings] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [viewMode, setViewMode] = useState("section");
  const [notification, setNotification] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSection, setNotificationSection] = useState("");
  const [notificationProfessor, setNotificationProfessor] = useState("");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState("06:00");
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [pushSubscription, setPushSubscription] = useState(null);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
      const hasSeenPrompt = localStorage.getItem("iosInstallPromptDismissed");
      if (isIOS && !isInStandaloneMode && !hasSeenPrompt) {
        setTimeout(() => setShowIOSInstall(true), 500);
      }
    }
  }, []);

  useEffect(() => {
    if (themeMode === "auto" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => setIsDark(mediaQuery.matches);
      setIsDark(mediaQuery.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      setIsDark(themeMode === "dark");
    }
  }, [themeMode]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification("Connessione ripristinata", "info");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification("Nessuna connessione internet", "error");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/vapid-public-key`)
      .then(res => res.json())
      .then(data => {
        console.log("✅ VAPID key fetched");
        setVapidPublicKey(data.publicKey);
      })
      .catch(err => console.error("❌ Failed to fetch VAPID key:", err));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js")
        .then((registration) => {
          console.log("SW registered:", registration);
          setInterval(() => registration.update(), 60000);
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                showNotification("📱 Nuova versione disponibile! Ricaricando...", "info");
                setTimeout(() => {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                }, 2000);
              }
            });
          });
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
              const data = event.data.data;
              if (data.section) {
                setSection(data.section);
                setViewMode("section");
                setTimeout(() => fetchEvents(false, data.section, undefined, 'today'), 100);
              } else if (data.professor) {
                setProfessor(data.professor);
                setViewMode("professor");
                setTimeout(() => fetchEvents(false, undefined, data.professor, 'today'), 100);
              }
            }
          });
        })
        .catch((error) => console.error("SW registration failed:", error));
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") showNotification("App installata!", "info");
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const themeModeValue = await getFromDB("themeMode");
        if (themeModeValue) {
          setThemeMode(themeModeValue);
        }
        const sections = await getFromDB("savedSections");
        const professors = await getFromDB("savedProfessors");
        const notifEnabled = await getFromDB("notificationsEnabled");
        const notifSection = await getFromDB("notificationSection");
        const notifProfessor = await getFromDB("notificationProfessor");
        const digest = await getFromDB("digestEnabled");
        const digestT = await getFromDB("digestTime");
        const realtime = await getFromDB("realtimeEnabled");
        const subscription = await getFromDB("pushSubscription");
        if (sections) setSavedSections(sections);
        if (professors) setSavedProfessors(professors);
        if (notifEnabled !== undefined) setNotificationsEnabled(notifEnabled);
        if (notifSection) setNotificationSection(notifSection);
        if (notifProfessor) setNotificationProfessor(notifProfessor);
        if (digest !== undefined) setDigestEnabled(digest);
        if (digestT) setDigestTime(digestT);
        if (realtime !== undefined) setRealtimeEnabled(realtime);
        if (subscription) setPushSubscription(subscription);

        const onboardingComplete = await getFromDB("onboardingComplete");
        if (onboardingComplete !== undefined) {
          setHasCompletedOnboarding(onboardingComplete);
        } else {
          setHasCompletedOnboarding(false); // First time user
        }
        setSettingsLoaded(true);
      } catch (error) {
        console.error("Error loading settings:", error);
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await saveToDB("onboardingComplete", true);
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Error saving onboarding state:", error);
    }
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    saveToDB("themeMode", themeMode).catch(err => console.error(err));
  }, [themeMode, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    saveToDB("savedSections", savedSections).catch(err => console.error(err));
  }, [savedSections, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    saveToDB("savedProfessors", savedProfessors).catch(err => console.error(err));
  }, [savedProfessors, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    saveToDB("notificationsEnabled", notificationsEnabled).catch(err => console.error(err));
    saveToDB("notificationSection", notificationSection).catch(err => console.error(err));
    saveToDB("notificationProfessor", notificationProfessor).catch(err => console.error(err));
    saveToDB("digestEnabled", digestEnabled).catch(err => console.error(err));
    saveToDB("digestTime", digestTime).catch(err => console.error(err));
    saveToDB("realtimeEnabled", realtimeEnabled).catch(err => console.error(err));
  }, [notificationsEnabled, notificationSection, notificationProfessor, digestEnabled, digestTime, realtimeEnabled, settingsLoaded]);

  useEffect(() => {
    if (notificationsEnabled && pushSubscription) updatePreferencesOnBackend();
  }, [notificationSection, notificationProfessor, digestEnabled, digestTime, realtimeEnabled]);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    if (navigator.vibrate) navigator.vibrate(type === "error" ? 200 : 100);
    setTimeout(() => setNotification(null), 3000);
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showNotification("Le notifiche non sono supportate su questo browser", "error");
      return null;
    }
    if (!("serviceWorker" in navigator)) {
      showNotification("Service Worker non supportato", "error");
      return null;
    }
    if (!vapidPublicKey) {
      showNotification("Chiave VAPID non disponibile. Riprova.", "error");
      return null;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showNotification("Devi abilitare le notifiche nelle impostazioni del browser", "error");
        return null;
      }
      console.log("✅ Notification permission granted");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      console.log("✅ Push subscription created");
      return subscription;
    } catch (error) {
      console.error("❌ Error requesting notification permission:", error);
      showNotification("Errore nell'attivazione delle notifiche: " + error.message, "error");
      return null;
    }
  };

  const registerSubscriptionWithBackend = async (subscription) => {
    try {
      const payload = {
        subscription: subscription,
        section: notificationSection.trim() || null,
        professor: notificationProfessor.trim() || null,
        digestEnabled,
        digestTime,
        realtimeEnabled
      };
      console.log("📤 Registering subscription with backend");
      const response = await fetch(`${BACKEND_URL}/register-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log("✅ Backend registration successful");
      return true;
    } catch (error) {
      console.error("❌ Backend registration failed:", error);
      throw error;
    }
  };

  const unregisterSubscriptionFromBackend = async (subscription) => {
    try {
      await fetch(`${BACKEND_URL}/unregister-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: subscription.endpoint })
      });
      console.log("✅ Subscription unregistered");
    } catch (error) {
      console.error("❌ Failed to unregister:", error);
    }
  };

  const updatePreferencesOnBackend = async () => {
    if (!pushSubscription) return;
    try {
      await fetch(`${BACKEND_URL}/update-preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: pushSubscription.endpoint,
          section: notificationSection || null,
          professor: notificationProfessor || null,
          digestEnabled,
          digestTime,
          realtimeEnabled
        })
      });
      console.log("✅ Preferences updated");
    } catch (error) {
      console.error("❌ Failed to update preferences:", error);
    }
  };

  const toggleNotifications = async (enabled) => {
    if (enabled) {
      try {
        const subscription = await requestNotificationPermission();
        if (!subscription) return;
        const subscriptionJSON = subscription.toJSON();
        setPushSubscription(subscriptionJSON);
        await saveToDB("pushSubscription", subscriptionJSON);
        await registerSubscriptionWithBackend(subscription);
        setNotificationsEnabled(true);
        showNotification("Notifiche attivate! Configura classe o professore.", "info");
      } catch (error) {
        console.error("❌ Notification setup failed:", error);
        setNotificationsEnabled(false);
        setPushSubscription(null);
        showNotification("Errore nell'attivazione delle notifiche", "error");
      }
    } else {
      try {
        if (pushSubscription) {
          await unregisterSubscriptionFromBackend(pushSubscription);
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
        setNotificationsEnabled(false);
        setPushSubscription(null);
        await saveToDB("pushSubscription", null);
        showNotification("Notifiche disattivate", "info");
      } catch (error) {
        console.error("❌ Error disabling notifications:", error);
      }
    }
  };

  const fetchEvents = React.useCallback(async (isRefresh = false, targetSection, targetProfessor, targetDate) => {
    const sectionToFetch = (targetSection || section).toUpperCase();
    const professorToFetch = (targetProfessor || professor).toUpperCase();
    const dateToFetch = targetDate || dateFilter;
    if (viewMode === "section" && !sectionToFetch.trim()) {
      showNotification("Inserisci una classe", "info");
      return;
    }
    if (viewMode === "professor" && !professorToFetch.trim()) {
      showNotification("Inserisci un professore", "info");
      return;
    }
    if (!isOnline) {
      showNotification("Nessuna connessione internet", "error");
      return;
    }
    setLoading(true);
    try {
      const today = new Date();
      const targetDateObj = dateToFetch === "tomorrow" ? new Date(today.getTime() + 24 * 60 * 60 * 1000) : today;
      const dateStr = targetDateObj.toISOString().split("T")[0];
      const params = new URLSearchParams({ date: dateStr });
      if (viewMode === "section") params.append("section", sectionToFetch);
      const response = await fetch(`${BACKEND_URL}/events?${params}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let filteredEvents = data.filter((event) => {
        const eventDate = new Date(event.start).toISOString().split("T")[0];
        return eventDate === dateStr;
      });
      if (viewMode === "section") {
        filteredEvents = filterEventsByClass(filteredEvents, sectionToFetch);
      } else if (viewMode === "professor") {
        filteredEvents = filterEventsByProfessor(filteredEvents, professorToFetch);
      }
      filteredEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setEvents(filteredEvents);
    } catch (err) {
      console.error("Fetch error:", err);
      showNotification("Impossibile caricare le variazioni.", "error");
    } finally {
      setLoading(false);
    }
  }, [section, professor, dateFilter, viewMode, isOnline]);

  const addSection = () => {
    const trimmedSection = section.trim().toUpperCase();
    if (trimmedSection && !savedSections.includes(trimmedSection)) {
      setSavedSections([...savedSections, trimmedSection]);
      showNotification("Classe aggiunta!", "info");
    }
  };

  const removeSection = (sectionToRemove) => {
    setSavedSections(savedSections.filter((s) => s !== sectionToRemove));
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const addProfessor = () => {
    const trimmedProfessor = professor.trim().toUpperCase();
    if (trimmedProfessor && !savedProfessors.includes(trimmedProfessor)) {
      setSavedProfessors([...savedProfessors, trimmedProfessor]);
      showNotification("Professore aggiunto!", "info");
    }
  };

  const removeProfessor = (professorToRemove) => {
    setSavedProfessors(savedProfessors.filter((p) => p !== professorToRemove));
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const handleQuickSectionSelect = (sec) => {
    setSection(sec);
    setViewMode("section");
    setTimeout(() => fetchEvents(false, sec, undefined, dateFilter), 50);
  };

  const handleQuickProfessorSelect = (prof) => {
    setProfessor(prof);
    setViewMode("professor");
    setTimeout(() => fetchEvents(false, undefined, prof, dateFilter), 50);
  };

  useEffect(() => {
    if (viewMode === "all") {
      fetchEvents();
    } else if (viewMode === "section" && section.trim()) {
      fetchEvents();
    } else if (viewMode === "professor" && professor.trim()) {
      fetchEvents();
    } else {
      setEvents([]);
    }
  }, [dateFilter, viewMode]);

  const getSubtitle = () => {
    const dateText = dateFilter === "today" ? "Oggi" : "Domani";
    let modeText = "";
    if (viewMode === "all") modeText = "Tutte le classi";
    else if (viewMode === "section") modeText = section || "Seleziona classe";
    else modeText = professor || "Seleziona prof.";
    return `${dateText} - ${modeText}`;
  };

  return (
    <>
      {hasCompletedOnboarding === null ? (
        // Loading state
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-zinc-950" : "bg-white"}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : hasCompletedOnboarding === false ? (
        // Show onboarding
        <OnboardingScreen onComplete={handleOnboardingComplete} isDark={isDark} />
      ) : (
        // Main app
        <div className={`min-h-screen transition-colors duration-200 ${isDark ? "text-white" : "bg-gray-50 text-gray-900"}`} style={{ willChange: "background-color, color", paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className={`sticky z-40 transition-colors duration-200 ${isDark ? "bg-zinc-900" : "bg-white"} shadow-sm`} style={{ top: 'env(safe-area-inset-top)' }}>
            <div className="px-6 pt-4 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Variazioni</h1>
                  <p className={`text-base mt-1 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{getSubtitle()}</p>
                </div>
                <button onClick={() => setShowSettings(true)} aria-label="Settings" className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}>
                  <Settings className="w-7 h-7" />
                </button>
              </div>
            </div>
          </div>

          <div className={`sticky z-30 transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-white"} border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`} style={{ top: 'calc(88px + env(safe-area-inset-top))' }}>
            <div className="px-6 py-3 flex gap-2">
              <button onClick={() => setViewMode("section")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${viewMode === "section" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                <BookOpen className="w-4 h-4" />Classe
              </button>
              <button onClick={() => setViewMode("professor")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${viewMode === "professor" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                <User className="w-4 h-4" />Prof.
              </button>
              <button onClick={() => setViewMode("all")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${viewMode === "all" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                <List className="w-4 h-4" />Tutti
              </button>
            </div>
          </div>

          {viewMode === "section" && (
            <div className={`transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-white"} px-6 py-5 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Classe</label>
                  <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="es. 5AIIN, 3B..." className={`w-full px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${isDark ? "bg-zinc-800 text-white placeholder-gray-500 focus:bg-zinc-700" : "bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-50"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => fetchEvents()} className="bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2">
                    <Search className="w-5 h-5" />Cerca
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === "professor" && (
            <div className={`transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-white"} px-6 py-5 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Prof.</label>
                  <input type="text" value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder="es. ROSSI" className={`w-full px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${isDark ? "bg-zinc-800 text-white placeholder-gray-500 focus:bg-zinc-700" : "bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-50"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => fetchEvents()} className="bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2">
                    <Search className="w-5 h-5" />Cerca
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === "section" && savedSections.length > 0 && (
            <div className={`transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-white"} px-6 py-3 border-b ${isDark ? "border-zinc-800" : "border-gray-200"} overflow-x-auto`}>
              <div className="flex gap-2">
                {savedSections.map((sec) => (
                  <button key={sec} onClick={() => handleQuickSectionSelect(sec)} className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 ${section === sec ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : isDark ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {sec}
                  </button>
                ))}
              </div>
            </div>
          )}

          {viewMode === "professor" && savedProfessors.length > 0 && (
            <div className={`transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-white"} px-6 py-3 border-b ${isDark ? "border-zinc-800" : "border-gray-200"} overflow-x-auto`}>
              <div className="flex gap-2">
                {savedProfessors.map((prof) => (
                  <button key={prof} onClick={() => handleQuickProfessorSelect(prof)} className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 ${professor === prof ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : isDark ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {prof}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`transition-colors duration-300 ${isDark ? "bg-zinc-900" : "bg-white"} px-6 py-3 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}>
            <div className="flex gap-2">
              <button onClick={() => setDateFilter("today")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${dateFilter === "today" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                <Calendar className="w-4 h-4" />Oggi
              </button>
              <button onClick={() => setDateFilter("tomorrow")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${dateFilter === "tomorrow" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                <Calendar className="w-4 h-4" />Domani
              </button>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                <p className={`mt-4 font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Loading...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8">
                <Calendar className={`w-16 h-16 mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                <h3 className="text-2xl font-bold mb-2">Tutto a posto!</h3>
                <p className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Nessuna variazione trovata per {viewMode === "all" ? "oggi" : viewMode === "professor" ? professor || "il professore" : section || "la tua classe"}.
                </p>
              </div>
            ) : (
              <div>
                {events.map((event, index) => (
                  <EventCard key={`${event.id}-${index}`} item={event} index={index} isDark={isDark} />
                ))}
              </div>
            )}
          </div>

          {showSettings && (
            <>
              <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setShowSettings(false)}></div>
              <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center animate-slide-up">
                <div className={`w-full sm:max-w-lg sm:rounded-2xl ${isDark ? "bg-zinc-900" : "bg-white"} rounded-t-3xl sm:rounded-b-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
                  <div className={`sticky top-0 ${isDark ? "bg-zinc-900" : "bg-white"} px-6 py-4 border-b ${isDark ? "border-zinc-800" : "border-gray-200"} flex justify-between items-center`}>
                    <h2 className="text-2xl font-bold">Impostazioni</h2>
                    <button onClick={() => setShowSettings(false)} className={`p-2 rounded-lg hover:scale-110 ${isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}>
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    <div className="p-6 space-y-6">
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                          <div>
                            <p className="font-bold text-lg">Tema</p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {themeMode === "auto" ? "Automatico (segue il sistema)" : themeMode === "dark" ? "Scuro" : "Chiaro"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setThemeMode("light")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${themeMode === "light" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                            <Sun className="w-4 h-4" />Chiaro
                          </button>
                          <button onClick={() => setThemeMode("auto")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${themeMode === "auto" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                            <Settings className="w-4 h-4" />Auto
                          </button>
                          <button onClick={() => setThemeMode("dark")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 ${themeMode === "dark" ? "bg-indigo-500 text-white scale-105" : isDark ? "bg-zinc-800 text-gray-400 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                            <Moon className="w-4 h-4" />Scuro
                          </button>
                        </div>
                      </div>
                      <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>

                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <Bell className="w-6 h-6" />
                          <div>
                            <p className="font-bold text-lg">Notifiche Push</p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Ricevi notifiche sulle variazioni</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            {notificationsEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
                            <div>
                              <p className="font-semibold">Abilita notifiche</p>
                              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Ricevi notifiche su variazioni</p>
                            </div>
                          </div>
                          <button onClick={() => toggleNotifications(!notificationsEnabled)} className={`w-14 h-8 rounded-full ${notificationsEnabled ? "bg-indigo-500" : "bg-gray-300"} relative`}>
                            <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform duration-300 ${notificationsEnabled ? "translate-x-7" : "translate-x-1"}`}></div>
                          </button>
                        </div>

                        {notificationsEnabled && (
                          <div className="space-y-4">
                            <div>
                              <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Classe per notifiche</label>
                              <input type="text" value={notificationSection} onChange={(e) => setNotificationSection(e.target.value)} placeholder="es. 5AIIN" className={`w-full px-4 py-3 rounded-xl font-semibold ${isDark ? "bg-zinc-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-900 placeholder-gray-400"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
                            </div>

                            <div>
                              <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Prof. per notifiche (opzionale)</label>
                              <input type="text" value={notificationProfessor} onChange={(e) => setNotificationProfessor(e.target.value)} placeholder="es. ROSSI" className={`w-full px-4 py-3 rounded-xl font-semibold ${isDark ? "bg-zinc-800 text-white placeholder-gray-500" : "bg-gray-100 text-gray-900 placeholder-gray-400"} focus:outline-none focus:ring-2 focus:ring-indigo-500`} />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Clock className="w-6 h-6" />
                                <div>
                                  <p className="font-semibold">Riepilogo giornaliero</p>
                                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Notifica con le variazioni del giorno</p>
                                </div>
                              </div>
                              <button onClick={() => setDigestEnabled(!digestEnabled)} className={`w-14 h-8 rounded-full ${digestEnabled ? "bg-indigo-500" : "bg-gray-300"} relative`}>
                                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform duration-300 ${digestEnabled ? "translate-x-7" : "translate-x-1"}`}></div>
                              </button>
                            </div>

                            {digestEnabled && (
                              <div>
                                <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Orario riepilogo</label>
                                <div className="flex gap-2">
                                  {['06:00', '07:00', '08:00'].map((time) => (
                                    <button key={time} onClick={() => setDigestTime(time)} className={`flex-1 py-3 rounded-xl font-semibold ${digestTime === time ? "bg-indigo-500 text-white" : isDark ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                      {time}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Bell className="w-6 h-6" />
                                <div>
                                  <p className="font-semibold">Notifiche in tempo reale</p>
                                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Notifica quando vengono aggiunte nuove variazioni</p>
                                </div>
                              </div>
                              <button onClick={() => setRealtimeEnabled(!realtimeEnabled)} className={`w-14 h-8 rounded-full ${realtimeEnabled ? "bg-indigo-500" : "bg-gray-300"} relative`}>
                                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform duration-300 ${realtimeEnabled ? "translate-x-7" : "translate-x-1"}`}></div>
                              </button>
                            </div>

                            {(!notificationSection && !notificationProfessor) && (
                              <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-yellow-900/20 border border-yellow-900/50" : "bg-yellow-50 border border-yellow-200"}`}>
                                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                <p className={`text-sm ${isDark ? "text-yellow-300" : "text-yellow-800"}`}>Inserisci almeno una classe o un professore per ricevere notifiche</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>

                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <Bookmark className="w-6 h-6" />
                          <div>
                            <p className="font-bold text-lg">Classi salvate</p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Accesso rapido alle tue classi preferite</p>
                          </div>
                        </div>

                        {savedSections.map((sec) => (
                          <div key={sec} className={`flex items-center justify-between p-4 rounded-xl mb-2 hover:scale-[1.02] ${isDark ? "bg-zinc-800" : "bg-gray-100"}`}>
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5" />
                              <span className="font-semibold">{sec}</span>
                            </div>
                            <button onClick={() => removeSection(sec)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg hover:scale-110 active:scale-95">
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                          </div>
                        ))}

                        <button onClick={addSection} className="w-full mt-3 bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95">
                          <Plus className="w-5 h-5" />Aggiungi classe corrente
                        </button>
                      </div>

                      <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>

                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <User className="w-6 h-6" />
                          <div>
                            <p className="font-bold text-lg">Prof. salvati</p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Accesso rapido per i prof.</p>
                          </div>
                        </div>

                        {savedProfessors.map((prof) => (
                          <div key={prof} className={`flex items-center justify-between p-4 rounded-xl mb-2 hover:scale-[1.02] ${isDark ? "bg-zinc-800" : "bg-gray-100"}`}>
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5" />
                              <span className="font-semibold">{prof}</span>
                            </div>
                            <button onClick={() => removeProfessor(prof)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg hover:scale-110 active:scale-95">
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                          </div>
                        ))}

                        <button onClick={addProfessor} className="w-full mt-3 bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95">
                          <Plus className="w-5 h-5" />Aggiungi prof. corrente
                        </button>
                      </div>

                      <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>

                      <button 
                        onClick={async () => {
                          await saveToDB("onboardingComplete", false);
                          setHasCompletedOnboarding(false);
                          setShowSettings(false);
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                          isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Info className="w-6 h-6" />
                          <div className="text-left">
                            <p className="font-semibold">Rivedi introduzione</p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Mostra di nuovo la schermata iniziale
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                      </button>

                      <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>

                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <Info className="w-6 h-6" />
                          <p className="font-bold text-lg">About</p>
                        </div>
                        <p className="font-semibold mb-2">FermiToday</p>
                        <p className={`text-sm leading-relaxed mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Visualizza le variazioni dell'orario giornaliero della tua classe, dei tuoi professori, o quella dei tuoi amici. Basta inserire la classe o il nome del professore per vedere eventuali modifiche all'orario di oggi. NON UFFICIALE
                        </p>
                        <p className={`text-xs italic ${isDark ? "text-gray-500" : "text-gray-500"}`}>Version 0.8.5</p>
                      </div>

                      <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>

                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <History className="w-6 h-6" />
                          <p className="font-bold text-lg">Changelog</p>
                        </div>
                        <div className={`p-4 rounded-xl ${isDark ? "bg-zinc-800" : "bg-gray-100"}`}>
                          <p className="font-bold text-indigo-500 mb-1">v0.9.0</p>
                          <p className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>19 Novembre 2025</p>
                          <ul className={`list-disc list-inside text-sm space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            <li>Ora mostra eventi che riguardano più classi</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <a href="https://github.com/aamritt0/fermitoday-pwa" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}>
                          <Github className="w-6 h-6" />
                        </a>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Made with</p>
                          <Heart className="w-4 h-4 text-red-500" />
                        </div>
                      </div>

                      {showInstallPrompt && (
                        <>
                          <div className={`h-px ${isDark ? "bg-zinc-800" : "bg-gray-200"}`}></div>
                          <button onClick={handleInstallClick} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95">
                            <Plus className="w-5 h-5" />Installa App
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {notification && (
            <div className={`fixed top-20 left-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-2xl animate-slide-down ${notification.type === "error" ? "bg-red-500 text-white" : "bg-indigo-500 text-white"}`}>
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <p className="font-semibold flex-1">{notification.message}</p>
            </div>
          )}

          {!isOnline && (
            <div className="fixed bottom-4 left-4 right-4 bg-orange-500 text-white p-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Modalità offline</span>
            </div>
          )}

          {showIOSInstall && (
            <>
              <div className="fixed inset-0 z-50 bg-black/50" onClick={() => { setShowIOSInstall(false); localStorage.setItem("iosInstallPromptDismissed", "true"); }}></div>
              <div className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? "bg-zinc-900" : "bg-white"} rounded-t-3xl p-6 shadow-2xl`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-xl">FT</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Installa FermiToday</h3>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Aggiungi alla schermata Home</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowIOSInstall(false); localStorage.setItem("iosInstallPromptDismissed", "true"); }} className={`p-2 rounded-lg ${isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className={`space-y-3 mb-4 p-4 rounded-xl ${isDark ? "bg-zinc-800" : "bg-gray-50"}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Tocca il pulsante Condividi</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>In basso al centro (icona con freccia verso l'alto)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Scorri e seleziona "Aggiungi a Home"</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Cerca l'icona con il "+"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Conferma</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Tocca "Aggiungi" in alto a destra</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <button onClick={() => { setShowIOSInstall(false); localStorage.setItem("iosInstallPromptDismissed", "true"); }} className="text-indigo-500 font-semibold text-sm">
                    Non mostrare più
                  </button>
                </div>
              </div>
            </>
          )}

          <style jsx>{`
            @keyframes slide-down {
              from { transform: translateY(-100px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slide-up {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-slide-down { animation: slide-down 0.3s ease-out; }
            .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
          `}</style>
        </div>
      )}
    </>
  );
}