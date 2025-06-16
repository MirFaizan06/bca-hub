// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  ArrowUpCircle,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  User,
  BarChart,
  Calendar,
  BookOpen,
  Upload,
  Sparkles,
  Award,
  Clock,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { db, storage } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const navigate = useNavigate();

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const tutorialRef = useRef(null);
  const tutorialSteps = [
    { title: "Welcome to Your Dashboard!", content: "This is your hub for tracking progress and managing your profile." },
    { title: "Profile Management", content: "Update your personal info and avatar here." },
    { title: "Performance Insights", content: "View your test statistics and improvement over time." },
    { title: "Mock Test History", content: "Review all your past tests and performance ratings." },
  ];
  useEffect(() => {
    if (!localStorage.getItem("dashboardTutorialShown")) {
      setShowTutorial(true);
    }
  }, []);
  const closeTutorial = () => {
    localStorage.setItem("dashboardTutorialShown", "true");
    setShowTutorial(false);
  };

  // User info & profile
  const [userInfo, setUserInfo] = useState({ name: "", batch: "", roll: "", pfpUrl: "/avatar-placeholder.png" });
  const [editData, setEditData] = useState({ name: "", batch: "", roll: "" });
  const [recentAch, setRecentAch] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const dpOptions = ["/dps/dp1.png", "/dps/dp2.png", "/dps/dp3.png", "/dps/dp4.png", "/dps/dp5.png"];

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    const { roll } = JSON.parse(stored);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", roll));
        if (!snap.exists()) return;
        const data = snap.data();
        setUserInfo({
          name: data.name,
          batch: data.batch || "",
          roll,
          pfpUrl: data.pfpUrl || "/avatar-placeholder.png",
        });
        setEditData({ name: data.name, batch: data.batch || "", roll });
        const ach = data.achievements || [];
        if (ach.length) setRecentAch(ach[ach.length - 1]);
      } catch (e) {
        console.error("Error fetching user doc:", e);
      }
    })();
  }, [navigate]);

  const handleChange = (e) => setEditData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleSaveProfile = async () => {
    try {
      await updateDoc(doc(db, "users", userInfo.roll), { name: editData.name, pfpUrl: userInfo.pfpUrl });
      setUserInfo((u) => ({ ...u, name: editData.name }));
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file?.type.match("image.*")) return toast.error("Select a valid image.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Max size is 2 MB.");
    setUploading(true);
    try {
      const filename = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`;
      const ref = storageRef(storage, `profile_pictures/${userInfo.roll}/${filename}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      await updateDoc(doc(db, "users", userInfo.roll), { pfpUrl: url });
      setUserInfo((u) => ({ ...u, pfpUrl: url }));
      toast.success("Avatar uploaded!");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      fileInputRef.current.value = "";
    }
  };
  const handleSelectDP = async (url) => {
    try {
      await updateDoc(doc(db, "users", userInfo.roll), { pfpUrl: url });
      setUserInfo((u) => ({ ...u, pfpUrl: url }));
      toast.success("Avatar selected!");
    } catch {
      toast.error("Failed to set avatar.");
    }
  };

  // Quotes (type.fit API + fallback)
  const fallbackQuotes = [
    { content: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { content: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { content: "Dream big and dare to fail.", author: "Norman Vaughan" },
    { content: "Act as if what you do makes a difference. It does.", author: "William James" },
    { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { content: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
    { content: "Everything you’ve ever wanted is on the other side of fear.", author: "George Addair" },
    { content: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
    { content: "Dream it. Wish it. Do it.", author: "Unknown" },
    { content: "Stay foolish to stay sane.", author: "Maxime Lagacé" },
    { content: "When nothing goes right, go left.", author: "Unknown" },
    { content: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { content: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
    { content: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { content: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
    { content: "Everything you can imagine is real.", author: "Pablo Picasso" },
    { content: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { content: "Opportunities don't happen, you create them.", author: "Chris Grosser" },
    { content: "The best revenge is massive success.", author: "Frank Sinatra" },
    { content: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  ];
  const [quote, setQuote] = useState({ content: "", author: "" });
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://type.fit/api/quotes");
        const all = await res.json();
        const valid = all.filter((q) => q.text && q.author);
        const pick = valid[Math.floor(Math.random() * valid.length)];
        setQuote({ content: pick.text, author: pick.author });
      } catch {
        const pick = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        setQuote(pick);
      }
    })();
  }, []);

  // Real‐time mock test history & stats
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ avgPct: 0, bestPct: 0, testsTaken: 0, improvementPct: 0 });

  useEffect(() => {
    if (!userInfo.roll) return;
    const q = query(
      collection(db, "mocktests"),
      where("rollNumber", "==", userInfo.roll),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const tests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistory(tests);
        if (tests.length) {
          const pcts = tests.map((t) => (t.score / t.total) * 100);
          const bestPct = Math.max(...pcts).toFixed(1);
          const avgPct = (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1);
          let imp = 0;
          if (tests.length >= 6) {
            const firstAvg = tests
              .slice(-3)
              .reduce((s, t) => s + ((t.score / t.total) * 100), 0) / 3;
            const lastAvg = tests
              .slice(0, 3)
              .reduce((s, t) => s + ((t.score / t.total) * 100), 0) / 3;
            imp = (((lastAvg - firstAvg) / firstAvg) * 100).toFixed(1);
          }
          setStats({ avgPct, bestPct, testsTaken: tests.length, improvementPct: imp });
        } else {
          setStats({ avgPct: 0, bestPct: 0, testsTaken: 0, improvementPct: 0 });
        }
      },
      (err) => {
        console.error("History listener error:", err);
        toast.error("Failed to load test history.");
      }
    );
    return () => unsub();
  }, [userInfo.roll]);

  // Chart configuration
  const chartData = {
    labels: history.map((t) => t.createdAt.toDate().toLocaleDateString("en-GB")).reverse(),
    datasets: [
      {
        label: "Score %",
        data: history.map((t) => ((t.score / t.total) * 100).toFixed(1)).reverse(),
        borderColor: "rgba(99,102,241,0.9)",
        backgroundColor: "rgba(99,102,241,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 }, x: { grid: { display: false } } },
  };

  const getRating = (pct) =>
    pct >= 85
      ? "Exceptional"
      : pct >= 70
      ? "Excellent"
      : pct >= 55
      ? "Good"
      : pct >= 40
      ? "Average"
      : "Needs Improvement";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Learning Dashboard</h1>
            <p className="text-indigo-200">Welcome back, {userInfo.name}!</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/attendance")}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all"
            >
              <Calendar size={18} /> View Attendance
            </button>
            <button onClick={() => setShowTutorial(true)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <HelpCircle size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quote */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl">
              <Sparkles className="mb-3 text-yellow-300" size={28} />
              <p className="text-xl italic mb-4">"{quote.content}"</p>
              <p className="text-right font-medium">— {quote.author}</p>
            </motion.div>

            {/* Performance Overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" size={24} /> Performance Overview
                </h2>
                <button onClick={() => navigate("/mock-tests")} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2">
                  <BookOpen size={18} /> Take Test
                </button>
              </div>

              {stats.testsTaken > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">Avg. %</p>
                      <p className="text-2xl font-bold">{stats.avgPct}%</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                      <p className="text-sm text-purple-700 dark:text-purple-300">Best %</p>
                      <p className="text-2xl font-bold">{stats.bestPct}%</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl">
                      <p className="text-sm text-rose-700 dark:text-rose-300">Tests Taken</p>
                      <p className="text-2xl font-bold">{stats.testsTaken}</p>
                    </div>
                    <div className={`${stats.improvementPct > 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"} p-4 rounded-xl`}>
                      <p className="text-sm">Improvement</p>
                      <p className="text-2xl font-bold">{stats.improvementPct > 0 ? `+${stats.improvementPct}%` : `${stats.improvementPct}%`}</p>
                    </div>
                  </div>
                  <div className="h-80">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart className="text-gray-500" size={28} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Test Data Yet</h3>
                  <p className="text-gray-500 mb-6">Take your first mock test to see performance insights</p>
                  <button onClick={() => navigate("/mock-tests")} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg">Start Your First Test</button>
                </div>
              )}
            </motion.div>

            {/* Recent History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Clock className="text-indigo-600" size={24} /> Recent Mock Tests
              </h2>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.slice(0, 5).map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="font-medium">
                          {test.createdAt.toDate().toLocaleDateString("en-US", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{test.topicName || "General Test"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{((test.score / test.total) * 100).toFixed(1)}%</p>
                        <p
                          className={`text-sm ${
                            getRating((test.score / test.total) * 100) === "Exceptional"
                              ? "text-green-600"
                              : getRating((test.score / test.total) * 100) === "Excellent"
                              ? "text-blue-600"
                              : getRating((test.score / test.total) * 100) === "Good"
                              ? "text-indigo-600"
                              : getRating((test.score / test.total) * 100) === "Average"
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {getRating((test.score / test.total) * 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => navigate("/mock-tests/history")} className="w-full py-3 text-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-700 mt-4">
                    View All Test History
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="text-gray-500" size={28} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Tests Taken Yet</h3>
                  <p className="text-gray-500 mb-6">Start your learning journey with a mock test</p>
                  <button onClick={() => navigate("/mock-tests")} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg">
                    Take a Mock Test
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><User className="text-indigo-600" size={24} /> My Profile</h2>
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 p-1">
                    <img src={userInfo.pfpUrl} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-800" onError={(e) => { e.target.onerror = null; e.target.src = "/avatar-placeholder.png"; }} />
                  </div>
                  <button onClick={() => fileInputRef.current.click()} className="absolute bottom-2 right-2 bg-white dark:bg-gray-700 rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <Upload size={18} className="text-indigo-600" />
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">{uploading ? "Uploading..." : "Click camera to upload photo"}</p>
                <div className="w-full">
                  <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Choose an avatar:</h3>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {dpOptions.map((url, idx) => (
                      <button key={idx} onClick={() => handleSelectDP(url)} className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${userInfo.pfpUrl === url ? "border-indigo-500 scale-110" : "border-transparent hover:border-indigo-300"}`}>
                        <img src={url} alt={`dp-${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input name="name" value={editData.name} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Year</label>
                  <input name="batch" value={editData.batch} disabled className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 opacity-80 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roll Number</label>
                  <input name="roll" value={editData.roll} disabled className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 opacity-80 cursor-not-allowed" />
                </div>
                <button onClick={handleSaveProfile} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all mt-4">Update Profile</button>
              </div>
            </motion.div>

            {/* Recent Achievement Snapshot */}
            {recentAch && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-l-4 border-amber-400">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><CheckCircle className="text-amber-500" size={24} /> New Achievement!</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center"><Award size={20} className="text-amber-600" /></div>
                  <div>
                    <p className="font-semibold">{recentAch.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reward: {recentAch.reward}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => navigate("/study-materials")} className="bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 p-4 rounded-xl transition-colors">
                  <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400 mb-2" />
                  <span>Study Materials</span>
                </button>
                <button onClick={() => navigate("/schedule")} className="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 p-4 rounded-xl transition-colors">
                  <Calendar size={20} className="text-purple-600 dark:text-purple-400 mb-2" />
                  <span>My Schedule</span>
                </button>
                <button onClick={() => navigate("/progress")} className="bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-4 rounded-xl transition-colors">
                  <TrendingUp size={20} className="text-rose-600 dark:text-rose-400 mb-2" />
                  <span>Progress Report</span>
                </button>
                <button onClick={() => navigate("/resources")} className="bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 p-4 rounded-xl transition-colors">
                  <BookOpen size={20} className="text-amber-600 dark:text-amber-400 mb-2" />
                  <span>Resources</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <motion.div
              ref={tutorialRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full relative"
            >
              <button onClick={closeTutorial} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{tutorialSteps[currentTutorialStep].title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{tutorialSteps[currentTutorialStep].content}</p>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button onClick={() => setCurrentTutorialStep((s) => Math.max(0, s - 1))} disabled={currentTutorialStep === 0} className="flex items-center gap-1 px-4 py-2 rounded-lg disabled:opacity-50">
                  <ChevronLeft size={18} /> Previous
                </button>
                <div className="flex gap-2">
                  {tutorialSteps.map((_, idx) => (
                    <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentTutorialStep ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`} />
                  ))}
                </div>
                {currentTutorialStep < tutorialSteps.length - 1 ? (
                  <button onClick={() => setCurrentTutorialStep((s) => s + 1)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 text-white">
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button onClick={closeTutorial} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Got it!</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
