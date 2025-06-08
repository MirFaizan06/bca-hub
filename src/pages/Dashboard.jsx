// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
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
  CheckCircle
} from "lucide-react";
import { db, storage } from "../utils/firebase";
import { auth } from "../utils/firebase";
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
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const tutorialRef = useRef(null);

  // === Tutorial ===
  useEffect(() => {
    if (!localStorage.getItem("dashboardTutorialShown")) {
      setShowTutorial(true);
    }
  }, []);
  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("dashboardTutorialShown", "true");
  };
  const tutorialSteps = [
    {
      title: "Welcome to Your Dashboard!",
      content:
        "This is your central hub for tracking progress and managing your profile.",
    },
    {
      title: "Profile Management",
      content: "Update your personal information and profile picture here.",
    },
    {
      title: "Performance Insights",
      content: "Track your progress with visual metrics and statistics.",
    },
    {
      title: "Mock Test History",
      content:
        "Review all your past test attempts and analyze your performance.",
    },
  ];

  // === User Info State ===
  const [userInfo, setUserInfo] = useState({
    name: "",
    batch: "",
    roll: "",
    pfpUrl: "/avatar-placeholder.png",
  });

  // === Recent Achievement Snapshot ===
  const [recentAch, setRecentAch] = useState(null);

  // === Quote of the Day ===
  const [quote, setQuote] = useState({
    content:
      "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
    author: "Malcolm X",
  });

  // === Mock History & Stats ===
  const [history, setHistory] = useState([]);
  const [performanceStats, setPerformanceStats] = useState({
    avgScore: 0,
    bestScore: 0,
    testsTaken: 0,
    improvement: 0,
  });

  // === Profile Edit Fields ===
  const [editData, setEditData] = useState({
    name: "",
    batch: "",
    roll: "",
  });

  // === PFP Upload ===
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // === Custom DP Library ===
  const dpOptions = [
    "/dps/dp1.png",
    "/dps/dp2.png",
    "/dps/dp3.png",
    "/dps/dp4.png",
    "/dps/dp5.png",
  ];

  // === Initialize User Info & Achievements ===
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    const { roll, name, batch } = JSON.parse(stored);
    setUserInfo((u) => ({ ...u, roll, name, batch }));
    (async () => {
      // Fetch full profile
      try {
        const userRef = doc(db, "users", roll);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserInfo({
            name: data.name,
            batch: data.batch || "",
            roll,
            pfpUrl: data.pfpUrl || "/avatar-placeholder.png",
          });
          setEditData({
            name: data.name,
            batch: data.batch || "",
            roll,
          });
          // Grab the last achievement, if any
          const achArr = data.achievements || [];
          if (achArr.length) setRecentAch(achArr[achArr.length - 1]);
        }
      } catch (e) {
        console.error("Error fetching user doc:", e);
      }
    })();
  }, [navigate]);

  // === Fetch Quote ===
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch("https://api.quotable.io/random");
        const data = await res.json();
        setQuote({ content: data.content, author: data.author });
      } catch {
        const fallbacks = [
          {
            content:
              "The future belongs to those who believe in the beauty of their dreams.",
            author: "Eleanor Roosevelt",
          },
          {
            content:
              "Success is not final, failure is not fatal: It is the courage to continue that counts.",
            author: "Winston Churchill",
          },
        ];
        setQuote(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      }
    };
    fetchQuote();
  }, []);

  // === Fetch Mock History & Stats ===
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "mocktests"),
          where("uid", "==", userInfo.roll),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const hist = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistory(hist);
        if (hist.length) {
          const scores = hist.map((h) => h.score);
          const best = Math.max(...scores);
          const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
          let imp = 0;
          if (hist.length >= 6) {
            const firstAvg =
              hist.slice(-3).reduce((s, t) => s + t.score, 0) / 3;
            const lastAvg = hist.slice(0, 3).reduce((s, t) => s + t.score, 0) / 3;
            imp = ((lastAvg - firstAvg) / firstAvg * 100).toFixed(1);
          }
          setPerformanceStats({
            avgScore: avg,
            bestScore: best,
            testsTaken: scores.length,
            improvement: imp,
          });
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };
    if (userInfo.roll) fetchHistory();
  }, [userInfo.roll]);

  // === Chart Data ===
  const chartData = {
    labels: history
      .map((i) =>
        i.createdAt
          ?.toDate()
          .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      )
      .reverse(),
    datasets: [
      {
        label: "Test Scores",
        data: history.map((i) => i.score).reverse(),
        borderColor: "rgba(99, 102, 241, 0.9)",
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(30,30,40,0.9)",
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        callbacks: {
          label: (ctx) => `Score: ${ctx.raw}/40`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, max: 40, ticks: { stepSize: 5 } },
      x: { grid: { display: false } },
    },
  };

  // === Profile Handlers ===
  const handleChange = (e) =>
    setEditData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleSaveProfile = async () => {
    toast.success("Profile updated!");
    try {
      await updateDoc(doc(db, "users", userInfo.roll), {
        name: editData.name,
        pfpUrl: userInfo.pfpUrl,
      });
      setUserInfo((u) => ({ ...u, name: editData.name }));
    } catch (err) {
      console.error(err);
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.match("image.*")) {
      toast.error("Select a valid image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Max 2MB.");
      return;
    }
    setUploading(true);
    try {
      const uid = userInfo.roll;
      const name = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`;
      const ref = storageRef(storage, `profile_pictures/${uid}/${name}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      await updateDoc(doc(db, "users", uid), { pfpUrl: url });
      setUserInfo((u) => ({ ...u, pfpUrl: url }));
      toast.success("Uploaded!");
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
      toast.success("Avatar set!");
    } catch {
      toast.error("Failed.");
    }
  };

  // === Performance Rating ===
  const getPerformanceRating = (s) => {
    const p = (s / 40) * 100;
    if (p >= 85) return "Exceptional";
    if (p >= 70) return "Excellent";
    if (p >= 55) return "Good";
    if (p >= 40) return "Average";
    return "Needs Improvement";
  };

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
            <button
              onClick={() => setShowTutorial(true)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <HelpCircle size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quote */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl"
            >
              <Sparkles className="mb-3 text-yellow-300" size={28} />
              <p className="text-xl italic mb-4">"{quote.content}"</p>
              <p className="text-right font-medium">— {quote.author}</p>
            </motion.div>

            {/* Performance */}
            <motion.div
              id="performance-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" size={24} />
                  Performance Overview
                </h2>
                <button
                  onClick={() => navigate("/mock-tests")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
                >
                  <BookOpen size={18} /> Take Test
                </button>
              </div>
              {history.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        Avg. Score
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceStats.avgScore}/40
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Best Score
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceStats.bestScore}/40
                      </p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl">
                      <p className="text-sm text-rose-700 dark:text-rose-300">
                        Tests Taken
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceStats.testsTaken}
                      </p>
                    </div>
                    <div
                      className={`${
                        performanceStats.improvement > 0
                          ? "bg-green-50 dark:bg-green-900/20"
                          : "bg-amber-50 dark:bg-amber-900/20"
                      } p-4 rounded-xl`}
                    >
                      <p className="text-sm">Improvement</p>
                      <p className="text-2xl font-bold">
                        {performanceStats.improvement > 0
                          ? `+${performanceStats.improvement}%`
                          : `${performanceStats.improvement}%`}
                      </p>
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
                  <h3 className="text-lg font-medium mb-2">
                    No Test Data Yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Take your first mock test to see performance insights
                  </p>
                  <button
                    onClick={() => navigate("/mock-tests")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg"
                  >
                    Start Your First Test
                  </button>
                </div>
              )}
            </motion.div>

            {/* History */}
            <motion.div
              id="history-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Clock className="text-indigo-600" size={24} />
                Recent Mock Tests
              </h2>
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="text-gray-500" size={28} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    No Tests Taken Yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Start your learning journey with a mock test
                  </p>
                  <button
                    onClick={() => navigate("/mock-tests")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg"
                  >
                    Take a Mock Test
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.slice(0, 5).map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700"
                    >
                      <div>
                        <p className="font-medium">
                          {test.createdAt
                            ?.toDate()
                            .toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {test.subject || "General Test"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {test.score}/40
                        </p>
                        <p
                          className={`text-sm ${
                            getPerformanceRating(test.score) ===
                            "Exceptional"
                              ? "text-green-600"
                              : getPerformanceRating(test.score) ===
                                "Excellent"
                              ? "text-blue-600"
                              : getPerformanceRating(test.score) === "Good"
                              ? "text-indigo-600"
                              : getPerformanceRating(test.score) ===
                                "Average"
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {getPerformanceRating(test.score)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate("/mock-tests/history")}
                    className="w-full py-3 text-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-700 mt-4"
                  >
                    View All Test History
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Profile Card */}
            <motion.div
              id="profile-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <User className="text-indigo-600" size={24} />
                My Profile
              </h2>
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 p-1">
                    <img
                      src={userInfo.pfpUrl}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-800"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/avatar-placeholder.png";
                      }}
                    />
                  </div>
                  <button
                    className="absolute bottom-2 right-2 bg-white dark:bg-gray-700 rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Upload size={18} className="text-indigo-600" />
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {uploading ? "Uploading..." : "Click camera to upload photo"}
                </p>
                <div className="w-full">
                  <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    Choose an avatar:
                  </h3>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {dpOptions.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDP(url)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                          userInfo.pfpUrl === url
                            ? "border-indigo-500 scale-110"
                            : "border-transparent hover:border-indigo-300"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`dp-${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={editData.name}
                    onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Batch Year
                  </label>
                  <input
                    name="batch"
                    value={editData.batch}
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 opacity-80 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Roll Number
                  </label>
                  <input
                    name="roll"
                    value={editData.roll}
                    disabled
                    className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 opacity-80 cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-md hover:shadow-lg transition-all mt-4"
                >
                  Update Profile
                </button>
              </div>
            </motion.div>

            {/* Recent Achievement Snapshot */}
            {recentAch && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-l-4 border-amber-400"
              >
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <CheckCircle className="text-amber-500" size={24} />
                  New Achievement!
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <Award size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{recentAch.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reward: {recentAch.reward}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/study-materials")}
                  className="bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 p-4 rounded-xl transition-colors"
                >
                  <div className="text-indigo-600 dark:text-indigo-400 mb-2">
                    <BookOpen size={20} />
                  </div>
                  <span>Study Materials</span>
                </button>
                <button
                  onClick={() => navigate("/schedule")}
                  className="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 p-4 rounded-xl transition-colors"
                >
                  <div className="text-purple-600 dark:text-purple-400 mb-2">
                    <Calendar size={20} />
                  </div>
                  <span>My Schedule</span>
                </button>
                <button
                  onClick={() => navigate("/progress")}
                  className="bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-4 rounded-xl transition-colors"
                >
                  <div className="text-rose-600 dark:text-rose-400 mb-2">
                    <TrendingUp size={20} />
                  </div>
                  <span>Progress Report</span>
                </button>
                <button
                  onClick={() => navigate("/resources")}
                  className="bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 p-4 rounded-xl transition-colors"
                >
                  <div className="text-amber-600 dark:text-amber-400 mb-2">
                    <BookOpen size={20} />
                  </div>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              ref={tutorialRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full relative"
            >
              <button
                onClick={closeTutorial}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">
                  {tutorialSteps[currentTutorialStep].title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {tutorialSteps[currentTutorialStep].content}
                </p>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() =>
                    setCurrentTutorialStep((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentTutorialStep === 0}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <div className="flex gap-2">
                  {tutorialSteps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${
                        idx === currentTutorialStep
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
                {currentTutorialStep < tutorialSteps.length - 1 ? (
                  <button
                    onClick={() =>
                      setCurrentTutorialStep((prev) => prev + 1)
                    }
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 text-white"
                  >
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={closeTutorial}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
                  >
                    Got it!
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
