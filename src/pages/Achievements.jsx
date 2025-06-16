// src/pages/Achievements.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Trophy,
  Star,
  CheckCircle,
  Clock,
  Calendar,
  BookOpen,
  X,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

const allAchievements = [
  {
    id: "first-schedule",
    title: "First Step",
    description: "Create your first study schedule",
    icon: <Calendar size={24} />,
    type: "scheduleCreated",
    target: 1,
    reward: "Beginner Badge",
    color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300",
  },
  {
    id: "schedule-streak",
    title: "Consistent Learner",
    description: "Maintain a 3-day study streak",
    icon: <Clock size={24} />,
    type: "currentStreak",
    target: 3,
    reward: "Consistency Badge",
    color: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300",
  },
  {
    id: "five-schedules",
    title: "Dedicated Planner",
    description: "Create 5 study schedules",
    icon: <BookOpen size={24} />,
    type: "scheduleCreated",
    target: 5,
    reward: "Planner Badge",
    color: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300",
  },
  {
    id: "perfect-score",
    title: "Perfect Score",
    description: "Score 100% on a mock test",
    icon: <Star size={24} />,
    type: "perfectTests",
    target: 1,
    reward: "Perfection Badge",
    color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-300",
  },
  {
    id: "test-taker",
    title: "Test Explorer",
    description: "Complete 3 mock tests",
    icon: <Award size={24} />,
    type: "testsTaken",
    target: 3,
    reward: "Explorer Badge",
    color: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-300",
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Complete a schedule before 8 AM",
    icon: <Clock size={24} className="rotate-90" />,
    type: "earlyMornings",
    target: 1,
    reward: "Early Riser Badge",
    color: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300",
  },
  {
    id: "completionist",
    title: "Completionist",
    description: "Complete 10 schedules",
    icon: <CheckCircle size={24} />,
    type: "schedulesCompleted",
    target: 10,
    reward: "Master Planner Badge",
    color: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300",
  },
  {
    id: "high-scorer",
    title: "High Scorer",
    description: "Score above 90% on a mock test",
    icon: <Trophy size={24} />,
    type: "highTests",
    target: 1,
    reward: "High Achiever Badge",
    color: "bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300",
  },
];

export default function Achievements() {
  const navigate = useNavigate();
  const tutorialRef = useRef(null);

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const tutorialSteps = [
    { title: "Achievements Hub", content: "Track and unlock your learning milestones." },
    { title: "Achievement Cards", content: "See your earned badges and progress bars." },
    { title: "Real-time Progress", content: "This page computes your stats live from Firestore." },
    { title: "Rewards & Badges", content: "Earn visual rewards to celebrate your progress." },
  ];

  // User & state
  const [roll, setRoll] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    scheduleCreated: 0,
    schedulesCompleted: 0,
    testsTaken: 0,
    perfectTests: 0,
    earlyMornings: 0,
    currentStreak: 0,
    highTests: 0
  });
  const [newAch, setNewAch] = useState(null);

  useEffect(() => {
    document.title = "BCA Hub | Achievements";
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) {
        toast.error("Please log in to view achievements.");
        navigate("/login");
      } else {
        setRoll(user.email.split("@")[0].toLowerCase());
      }
    });
    return () => unsub();
  }, [navigate]);

  // Fetch data and compute stats
  useEffect(() => {
    if (!roll) return;
    (async () => {
      setLoading(true);
      // fetch existing achievements
      const userRef = doc(db, "users", roll);
      const userSnap = await getDoc(userRef);
      const earned = userSnap.exists() ? userSnap.data().achievements || [] : [];
      setAchievements(earned);

      // fetch schedules
      const schedSnap = await getDocs(
        query(collection(db, "schedules"), where("userId", "==", roll))
      );
      const schedules = schedSnap.docs.map(d => d.data());
      const created = schedules.length;
      const completed = schedules.filter(s => s.completed).length;
      const early = schedules.filter(s => {
        if (!s.completed || !s.startTime) return false;
        const [h] = s.startTime.split(":").map(Number);
        return h < 8;
      }).length;
      // compute streak
      const days = Array.from(new Set(
        schedules.filter(s => s.completed)
          .map(s => new Date(s.date).toDateString())
      )).sort((a,b) => new Date(b) - new Date(a));
      let streak = 0, prev = new Date();
      for (const ds of days) {
        const d = new Date(ds);
        if (streak === 0 || (prev - d) / 86400000 === 1) {
          streak++; prev = d;
        } else break;
      }

      // fetch tests
      const testSnap = await getDocs(
        query(collection(db, "mocktests"), where("rollNumber", "==", roll))
      );
      const tests = testSnap.docs.map(d => d.data());
      const taken = tests.length;
      const perfect = tests.filter(t => t.percentage === 100).length;
      const high = tests.filter(t => t.percentage >= 90).length;

      setStats({
        scheduleCreated: created,
        schedulesCompleted: completed,
        testsTaken: taken,
        perfectTests: perfect,
        earlyMornings: early,
        currentStreak: streak,
        highTests: high
      });
      setLoading(false);
    })();
  }, [roll]);

  // Award new achievements
  useEffect(() => {
    if (loading) return;
    (async () => {
      const userRef = doc(db, "users", roll);
      for (const ach of allAchievements) {
        if (achievements.find(a => a.id === ach.id)) continue;
        const val = stats[ach.type] || 0;
        if (val >= ach.target) {
          const newData = {
            id: ach.id,
            title: ach.title,
            earnedAt: Timestamp.now(),
            reward: ach.reward
          };
          await updateDoc(userRef, { achievements: arrayUnion(newData) });
          setAchievements(prev => [...prev, newData]);
          setNewAch(ach);
          break;
        }
      }
    })();
  }, [loading, achievements, stats, roll]);

  // Toast on new
  useEffect(() => {
    if (!newAch) return;
    toast.success(
      <div className="flex flex-col">
        <span className="font-bold">Unlocked: {newAch.title}</span>
        <span>{newAch.reward}</span>
      </div>, {
        icon: <Sparkles className="text-yellow-400"/>,
        duration: 4000
      }
    );
    setNewAch(null);
  }, [newAch]);

  const progress = ach => {
    const val = stats[ach.type] || 0;
    return Math.min(100, (val / ach.target) * 100);
  };
  const isEarned = id => achievements.some(a => a.id === id);

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("achTutorialShown", "true");
  };
  useEffect(() => {
    if (!localStorage.getItem("achTutorialShown")) setShowTutorial(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Trophy className="text-amber-500"/> Achievements
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Unlock badges as you progress</p>
          </div>
          <button onClick={()=>setShowTutorial(true)} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg">
            <HelpCircle size={18}/> Tutorial
          </button>
        </motion.div>

        {/* Stats Summary */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 mb-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Your Journey</h2>
              <p className="mt-1">Badges: {achievements.length}/{allAchievements.length}</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-sm">Schedules</p>
                <p className="text-2xl font-bold">{stats.scheduleCreated}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-sm">Tests</p>
                <p className="text-2xl font-bold">{stats.testsTaken}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements Grid */}
        {loading
          ? <div className="text-center py-16">Loading…</div>
          : <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allAchievements.map(ach => {
                const earned = isEarned(ach.id);
                const pct = progress(ach);
                return (
                  <motion.div key={ach.id} whileHover={{ scale:1.03 }} className={`rounded-2xl shadow-lg p-5 border-2 ${earned ? "border-amber-400" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800`}>
                    <div className="flex gap-4">
                      <div className={`${ach.color} w-14 h-14 rounded-xl flex items-center justify-center`}>
                        {ach.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{ach.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{ach.description}</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{width:`${pct}%`}} />
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {Math.round(pct)}% complete
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Reward:</span>
                        <div className="font-medium">{ach.reward}</div>
                      </div>
                      {earned
                        ? <div className="flex items-center gap-1 text-amber-500"><CheckCircle size={18}/> Earned</div>
                        : <div className="text-gray-400 dark:text-gray-500 text-sm">Locked</div>}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
        }

        {/* Tutorial Overlay */}
        <AnimatePresence>
          {showTutorial && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
              <motion.div ref={tutorialRef} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.8,opacity:0}} transition={{type:"spring",damping:25}} className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full relative">
                <button onClick={closeTutorial} className="absolute top-4 right-4"><X size={20}/></button>
                <div className="text-center mb-6">
                  <HelpCircle className="mx-auto mb-4 text-indigo-600" size={24}/>
                  <h3 className="text-xl font-bold mb-2">{tutorialSteps[currentTutorialStep].title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{tutorialSteps[currentTutorialStep].content}</p>
                </div>
                <div className="flex justify-between items-center">
                  <button onClick={()=>setCurrentTutorialStep(i=>Math.max(0,i-1))} disabled={currentTutorialStep===0} className="px-4 py-2 rounded-lg disabled:opacity-50">Previous</button>
                  <div className="flex gap-2">
                    {tutorialSteps.map((_,i)=><div key={i} className={`w-2 h-2 rounded-full ${i===currentTutorialStep?"bg-indigo-600":"bg-gray-300 dark:bg-gray-600"}`}/>)}
                  </div>
                  {currentTutorialStep < tutorialSteps.length-1
                    ? <button onClick={()=>setCurrentTutorialStep(i=>i+1)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Next</button>
                    : <button onClick={closeTutorial} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Got it</button>}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
