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
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { ArrowUpCircle, HelpCircle, X, ChevronRight, ChevronLeft } from "lucide-react";
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
} from 'chart.js';

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
    const tutorialShown = localStorage.getItem('dashboardTutorialShown');
    if (!tutorialShown) {
      setShowTutorial(true);
    }
  }, []);

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('dashboardTutorialShown', 'true');
  };

  const tutorialSteps = [
    {
      title: "Welcome to Your Dashboard!",
      content: "This is your central hub for tracking progress and managing your profile.",
      selector: null
    },
    {
      title: "Profile Tab",
      content: "Update your personal information and profile picture here.",
      selector: "#profile-tab"
    },
    {
      title: "Mock Test History",
      content: "View all your past test attempts and track your progress over time.",
      selector: "#history-tab"
    },
    {
      title: "Progress Graph",
      content: "Visual representation of your test scores to help identify trends.",
      selector: "#progress-graph"
    }
  ];

  // ======== User Info State ========
  const [userInfo, setUserInfo] = useState({
    name: "",
    batch: "",
    roll: "",
    pfpUrl: "/avatar-placeholder.png",
  });

  // ======== Quote of the Day ========
  const [quote, setQuote] = useState({ content: "", author: "" });

  // ======== Mock History State ========
  const [history, setHistory] = useState([]);

  // ======== Tabs ========
  const [activeTab, setActiveTab] = useState("profile");

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
      const todayKey = `quote_${new Date().toISOString().slice(0, 10)}`;
      const storedQuote = localStorage.getItem(todayKey);
      if (storedQuote) {
        setQuote(JSON.parse(storedQuote));
      } else {
        try {
          const res = await fetch("https://api.quotable.io/random");
          const data = await res.json();
          const q = { content: data.content, author: data.author };
          setQuote(q);
          localStorage.setItem(todayKey, JSON.stringify(q));
        } catch {
          setQuote({
            content: "Stay positive, work hard, make it happen.",
            author: "Unknown",
          });
        }
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
      batch: editData.batch,
    }));
    toast.success("Profile updated!");
    try {
      await updateDoc(doc(db, "users", userInfo.roll), {
        name: editData.name,
        batch: editData.batch,
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
      toast.error("Failed to upload image.");
    } finally {
      setUploading(false);
      fileInputRef.current.value = ""; // Reset file input
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
          where("uid", "==", userInfo.roll)
        );
        const querySnapshot = await getDocs(historyQuery);
        const historyData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(historyData);
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
    labels: history.map((item) => 
      item.createdAt?.toDate().toLocaleDateString() || 'Test'
    ),
    datasets: [
      {
        label: 'Test Scores',
        data: history.map((item) => item.score),
        borderColor: 'rgba(59, 130, 246, 0.8)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Score: ${context.raw}/40`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 40,
        ticks: {
          stepSize: 5
        }
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with tutorial button */}
        <div className="flex justify-between items-center">
          <div className="text-center space-y-2">
            <motion.h1 
              className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Hello, {userInfo.name || "Student"}.
            </motion.h1>
            <motion.p 
              className="text-lg text-zinc-600 dark:text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Welcome to your learning dashboard
            </motion.p>
          </div>
          <button 
            onClick={() => setShowTutorial(true)}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Show tutorial"
          >
            <HelpCircle className="text-blue-600 dark:text-blue-400" size={24} />
          </button>
        </div>

        {/* Quote Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 max-w-3xl mx-auto"
        >
          <p className="italic text-lg text-center">"{quote.content}"</p>
          <p className="mt-2 text-right font-medium text-blue-600 dark:text-blue-400">
            — {quote.author}
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center gap-6 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          <button
            id="profile-tab"
            onClick={() => setActiveTab("profile")}
            className={`py-2 px-4 font-medium transition flex items-center gap-1 ${
              activeTab === "profile"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <span>Profile</span>
          </button>
          <button
            id="history-tab"
            onClick={() => setActiveTab("history")}
            className={`py-2 px-4 font-medium transition flex items-center gap-1 ${
              activeTab === "history"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <span>Mock Test History</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="relative">
          {/* Tutorial Overlay */}
          <AnimatePresence>
            {showTutorial && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  ref={tutorialRef}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl p-6 max-w-md w-full relative"
                >
                  <button
                    onClick={closeTutorial}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <X size={20} />
                  </button>
                  
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">
                      {tutorialSteps[currentTutorialStep].title}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {tutorialSteps[currentTutorialStep].content}
                    </p>
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setCurrentTutorialStep(prev => Math.max(0, prev - 1))}
                      disabled={currentTutorialStep === 0}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {tutorialSteps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentTutorialStep(index)}
                          className={`w-2 h-2 rounded-full ${currentTutorialStep === index ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                          aria-label={`Go to step ${index + 1}`}
                        />
                      ))}
                    </div>
                    
                    {currentTutorialStep < tutorialSteps.length - 1 ? (
                      <button
                        onClick={() => setCurrentTutorialStep(prev => prev + 1)}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white"
                      >
                        Next
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={closeTutorial}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                      >
                        Got it!
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== PROFILE TAB ===== */}
          {activeTab === "profile" && (
            <motion.div
              key="profileTab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 space-y-8"
            >
              <h2 className="text-2xl font-semibold">My Profile</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Picture Section */}
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-32 h-32">
                      <img
                        src={userInfo.pfpUrl}
                        alt="Profile"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/avatar-placeholder.png";
                        }}
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 dark:border-blue-800/50 shadow-md"
                      />
                      <button
                        className="absolute bottom-0 right-0 bg-white dark:bg-zinc-700 rounded-full p-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-md"
                        onClick={() => fileInputRef.current.click()}
                      >
                        <ArrowUpCircle
                          size={24}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {uploading ? "Uploading..." : "Click to upload new photo"}
                    </p>

                    {/* DP Library */}
                    <div className="w-full">
                      <h3 className="text-sm font-medium mb-3 text-center">Choose from library:</h3>
                      <div className="grid grid-cols-5 gap-2">
                        {dpOptions.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectDP(url)}
                            className={`w-10 h-10 rounded-full overflow-hidden border-2 ${userInfo.pfpUrl === url ? 'border-blue-500' : 'border-transparent hover:border-blue-300'}`}
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
                </div>

                {/* Profile Form */}
                <div className="md:col-span-2">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label htmlFor="name" className="block text-sm font-medium">
                          Full Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          value={editData.name}
                          onChange={handleChange}
                          className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="batch" className="block text-sm font-medium">
                          Batch Year
                        </label>
                        <input
                          id="batch"
                          name="batch"
                          value={editData.batch}
                          onChange={handleChange}
                          className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="roll" className="block text-sm font-medium">
                        Roll Number
                      </label>
                      <input
                        id="roll"
                        name="roll"
                        value={editData.roll}
                        disabled
                        className="w-full border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-4 py-2 cursor-not-allowed opacity-80"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleSaveProfile}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === "history" && (
            <motion.div
              key="historyTab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Mock Test History</h2>
                  <button
                    onClick={() => navigate("/mock-tests")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    Take New Test
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
                      You haven't taken any tests yet.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Progress Graph */}
                    <div id="progress-graph" className="mb-8">
                      <h3 className="text-lg font-medium mb-4">Your Progress</h3>
                      <div className="bg-zinc-50 dark:bg-zinc-700/30 p-4 rounded-lg">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    </div>

                    {/* History Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                        <thead className="bg-zinc-50 dark:bg-zinc-700/30">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Test Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Percentage
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Performance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                          {history.map((entry) => {
                            const percentage = ((entry.score / 40) * 100).toFixed(1);
                            let performanceClass = "";
                            let performanceText = "";
                            
                            if (percentage >= 80) {
                              performanceClass = "text-green-600 dark:text-green-400";
                              performanceText = "Excellent";
                            } else if (percentage >= 60) {
                              performanceClass = "text-blue-600 dark:text-blue-400";
                              performanceText = "Good";
                            } else if (percentage >= 40) {
                              performanceClass = "text-yellow-600 dark:text-yellow-400";
                              performanceText = "Average";
                            } else {
                              performanceClass = "text-red-600 dark:text-red-400";
                              performanceText = "Needs Improvement";
                            }

                            return (
                              <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {entry.createdAt?.toDate().toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  }) || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-300">
                                  {entry.score}/40
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-300">
                                  {percentage}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`font-medium ${performanceClass}`}>
                                    {performanceText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}