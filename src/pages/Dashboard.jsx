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
  TrendingUp
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

  // Check if tutorial was shown before
  useEffect(() => {
    const tutorialShown = localStorage.getItem("dashboardTutorialShown");
    if (!tutorialShown) {
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
      selector: null,
    },
    {
      title: "Profile Management",
      content: "Update your personal information and profile picture here.",
      selector: "#profile-card",
    },
    {
      title: "Performance Insights",
      content: "Track your progress with visual metrics and statistics.",
      selector: "#performance-section",
    },
    {
      title: "Mock Test History",
      content:
        "Review all your past test attempts and analyze your performance.",
      selector: "#history-section",
    },
  ];

  // ======== User Info State ========
  const [userInfo, setUserInfo] = useState({
    name: "",
    batch: "",
    roll: "",
    pfpUrl: "/avatar-placeholder.png",
  });

  // ======== Quote of the Day ========
  const [quote, setQuote] = useState({ 
    content: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", 
    author: "Malcolm X" 
  });

  // ======== Mock History State ========
  const [history, setHistory] = useState([]);

  // ======== Performance Stats ========
  const [performanceStats, setPerformanceStats] = useState({
    avgScore: 0,
    bestScore: 0,
    testsTaken: 0,
    improvement: 0
  });

  // ======== Profile Edit Fields ========
  const [editData, setEditData] = useState({
    name: "",
    batch: "",
    roll: "",
  });

  // ======== PFP Upload ========
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // ======== Custom DP Library ========
  const dpOptions = [
    "/dps/dp1.png",
    "/dps/dp2.png",
    "/dps/dp3.png",
    "/dps/dp4.png",
    "/dps/dp5.png",
  ];

  // ======== Initialize User Info from localStorage / Firestore ========
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    const { roll, name } = JSON.parse(stored);
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", roll));
        if (userDoc.exists()) {
          const data = userDoc.data();
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
        }
      } catch (e) {
        console.error("Error fetching user doc:", e);
      }
    })();
  }, [navigate]);

  // ======== Fetch Quote of the Day ========
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        // Using a reliable quotes API with fallback
        const res = await fetch("https://api.quotable.io/random");
        const data = await res.json();
        setQuote({ content: data.content, author: data.author });
      } catch {
        // Fallback quotes if API fails
        const fallbackQuotes = [
          { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
          { content: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
          { content: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" }
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        setQuote(randomQuote);
      }
    };
    fetchQuote();
  }, []);

  // ======== Handle Input Changes ========
  const handleChange = (e) => {
    setEditData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ======== Save Profile Data ========
  const handleSaveProfile = async () => {
    setUserInfo((prev) => ({
      ...prev,
      name: editData.name,
    }));
    toast.success("Profile updated!");
    try {
      await updateDoc(doc(db, "users", userInfo.roll), {
        name: editData.name,
        pfpUrl: userInfo.pfpUrl,
      });
    } catch (err) {
      console.error("Error saving user info:", err);
    }
  };

  // ======== Handle File Upload ========
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("No file selected.");
      return;
    }

    // Validate file type and size
    if (!file.type.match("image.*")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size too large (max 2MB)");
      return;
    }

    setUploading(true);
    try {
      const uid = userInfo.roll;
      const uniqueName = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`;
      const imgRef = storageRef(
        storage,
        `profile_pictures/${uid}/${uniqueName}`
      );
      await uploadBytes(imgRef, file);
      const downloadURL = await getDownloadURL(imgRef);

      setUserInfo((prev) => ({ ...prev, pfpUrl: downloadURL }));
      await updateDoc(doc(db, "users", uid), { pfpUrl: downloadURL });
      toast.success("Profile picture updated!");
    } catch (err) {
      console.error("Upload PFP error:", err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    }
  };

  // ======== Handle Selecting from DP Library ========
  const handleSelectDP = async (url) => {
    setUserInfo((prev) => ({ ...prev, pfpUrl: url }));
    toast.success("Profile picture updated!");
    try {
      await updateDoc(doc(db, "users", userInfo.roll), { pfpUrl: url });
    } catch (err) {
      console.error("Error updating DP URL:", err);
    }
  };

  // ======== Fetch Mock Test History ========
  useEffect(() => {
    const fetchMockTestHistory = async () => {
      try {
        const historyQuery = query(
          collection(db, "mocktests"),
          where("uid", "==", userInfo.roll),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(historyQuery);
        const historyData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(historyData);
        
        // Calculate performance stats
        if (historyData.length > 0) {
          const scores = historyData.map(item => item.score);
          const bestScore = Math.max(...scores);
          const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
          
          // Calculate improvement (last 3 tests vs first 3 tests)
          let improvement = 0;
          if (historyData.length >= 6) {
            const firstThreeAvg = (historyData.slice(-3).reduce((sum, test) => sum + test.score, 0) / 3);
            const lastThreeAvg = (historyData.slice(0, 3).reduce((sum, test) => sum + test.score, 0) / 3);
            improvement = ((lastThreeAvg - firstThreeAvg) / firstThreeAvg * 100).toFixed(1);
          }
          
          setPerformanceStats({
            avgScore,
            bestScore,
            testsTaken: scores.length,
            improvement
          });
        }
      } catch (error) {
        console.error("Error fetching mock test history:", error);
      }
    };

    if (userInfo.roll) {
      fetchMockTestHistory();
    }
  }, [userInfo.roll]);

  // Prepare data for the progress chart
  const chartData = {
    labels: history.map(
      (item) => item.createdAt?.toDate().toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) || "Test"
    ).reverse(),
    datasets: [
      {
        label: "Test Scores",
        data: history.map((item) => item.score).reverse(),
        borderColor: "rgba(99, 102, 241, 0.9)",
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
        pointBorderColor: "#fff",
        pointHoverRadius: 6
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: "rgba(30, 30, 40, 0.9)",
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        callbacks: {
          label: function (context) {
            return `Score: ${context.raw}/40`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 40,
        grid: {
          color: "rgba(200, 200, 220, 0.2)"
        },
        ticks: {
          stepSize: 5,
          color: "rgba(100, 100, 120, 0.8)"
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: "rgba(100, 100, 120, 0.8)"
        }
      }
    },
  };

  // Get performance rating
  const getPerformanceRating = (score) => {
    const percentage = (score / 40) * 100;
    if (percentage >= 85) return "Exceptional";
    if (percentage >= 70) return "Excellent";
    if (percentage >= 55) return "Good";
    if (percentage >= 40) return "Average";
    return "Needs Improvement";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Learning Dashboard</h1>
            <p className="text-indigo-200">Welcome back, {userInfo.name || "Student"}!</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/attendance")}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all"
            >
              <Calendar size={18} />
              View Attendance
            </button>
            
            <button
              onClick={() => setShowTutorial(true)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Show tutorial"
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
            {/* Quote Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl"
            >
              <Sparkles className="mb-3 text-yellow-300" size={28} />
              <p className="text-xl italic font-light mb-4">"{quote.content}"</p>
              <p className="text-right font-medium text-indigo-100">— {quote.author}</p>
            </motion.div>

            {/* Performance Section */}
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
                  <BookOpen size={18} />
                  Take Test
                </button>
              </div>

              {history.length > 0 ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">Avg. Score</p>
                      <p className="text-2xl font-bold">{performanceStats.avgScore}/40</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                      <p className="text-sm text-purple-700 dark:text-purple-300">Best Score</p>
                      <p className="text-2xl font-bold">{performanceStats.bestScore}/40</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl">
                      <p className="text-sm text-rose-700 dark:text-rose-300">Tests Taken</p>
                      <p className="text-2xl font-bold">{performanceStats.testsTaken}</p>
                    </div>
                    <div className={`${
                      performanceStats.improvement > 0 
                        ? "bg-green-50 dark:bg-green-900/20" 
                        : "bg-amber-50 dark:bg-amber-900/20"
                    } p-4 rounded-xl`}>
                      <p className="text-sm">Improvement</p>
                      <p className="text-2xl font-bold">
                        {performanceStats.improvement > 0 ? '+' : ''}{performanceStats.improvement}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Chart */}
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
                  <button 
                    onClick={() => navigate("/mock-tests")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg"
                  >
                    Start Your First Test
                  </button>
                </div>
              )}
            </motion.div>

            {/* History Section */}
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
                  <h3 className="text-lg font-medium mb-2">No Tests Taken Yet</h3>
                  <p className="text-gray-500 mb-6">Start your learning journey with a mock test</p>
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
                          {test.createdAt?.toDate().toLocaleDateString("en-US", {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {test.subject || "General Test"}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg">{test.score}/40</p>
                        <p className={`text-sm ${
                          getPerformanceRating(test.score) === "Exceptional" ? "text-green-600" :
                          getPerformanceRating(test.score) === "Excellent" ? "text-blue-600" :
                          getPerformanceRating(test.score) === "Good" ? "text-indigo-600" :
                          getPerformanceRating(test.score) === "Average" ? "text-amber-600" : "text-rose-600"
                        }`}>
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

              {/* Profile Picture */}
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

                {/* Avatar Library */}
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

              {/* Profile Form */}
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

            {/* Achievements Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-start gap-3">
                <Award className="mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-bold mb-2">Learning Achievements</h3>
                  <p className="mb-4">Complete challenges to unlock achievements and badges</p>
                  <div className="flex gap-3">
                    <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🏆</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">⭐</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center opacity-50">
                      <span className="text-2xl">🚀</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

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
                  className="flex items-center gap-1 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <div className="flex gap-2">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        currentTutorialStep === index
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
                    Next
                    <ChevronRight size={18} />
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