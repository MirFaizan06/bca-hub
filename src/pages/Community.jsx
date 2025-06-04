// src/pages/Community.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  BarChart2, 
  Trophy, 
  Star, 
  Award,
  Search,
  ChevronDown
} from "lucide-react";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where
} from "firebase/firestore";
import dayjs from "dayjs";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Community() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("score");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users and their mock test results
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get all users
        const usersCol = collection(db, "users");
        const usersSnapshot = await getDocs(usersCol);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          mockTests: []
        }));

        // Get all mock tests
        const mockTestsCol = collection(db, "mocktests");
        const mockTestsSnapshot = await getDocs(mockTestsCol);
        const mockTestsData = mockTestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Combine user data with their latest mock test
        const combinedData = usersData.map(user => {
          // Find user's mock tests
          const userTests = mockTestsData
            .filter(test => test.uid === user.id)
            .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
          
          // Get latest test if exists
          const latestTest = userTests.length > 0 ? userTests[0] : null;
          
          return {
            ...user,
            mockTests: userTests,
            latestTest: latestTest,
            bestScore: userTests.length > 0 
              ? Math.max(...userTests.map(t => (t.score / t.total) * 100))
              : 0
          };
        });

        setUsers(combinedData);
      } catch (err) {
        console.error("Error fetching community data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up real-time listener for new mock tests
    const mockTestsCol = collection(db, "mocktests");
    const q = query(mockTestsCol, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(prev => {
        return prev.map(user => {
          const userTests = snapshot.docs
            .filter(doc => doc.data().uid === user.id)
            .map(doc => ({ id: doc.id, ...doc.data() }));
          
          const latestTest = userTests.length > 0 
            ? userTests[0] 
            : user.latestTest;
            
          const bestScore = userTests.length > 0
            ? Math.max(...userTests.map(t => (t.score / t.total) * 100))
            : user.bestScore;
            
          return {
            ...user,
            mockTests: userTests,
            latestTest: latestTest,
            bestScore: bestScore
          };
        });
      });
    });
    
    return () => unsubscribe();
  }, []);

  // Sort users based on selection
  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === "score") {
      return (b.latestTest?.percentage || 0) - (a.latestTest?.percentage || 0);
    } else if (sortBy === "best") {
      return b.bestScore - a.bestScore;
    } else if (sortBy === "recent") {
      if (!a.latestTest && !b.latestTest) return 0;
      if (!a.latestTest) return 1;
      if (!b.latestTest) return -1;
      return b.latestTest.createdAt.toDate() - a.latestTest.createdAt.toDate();
    }
    return 0;
  });

  // Filter users based on search
  const filteredUsers = sortedUsers.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-800 dark:text-zinc-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-800 dark:to-purple-900 py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <motion.h1 
            className="text-4xl sm:text-5xl font-extrabold mb-6 text-white"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            BCA Community Hub
          </motion.h1>
          <motion.p
            className="text-xl font-medium text-indigo-100 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Connect with peers, track progress, and compete in mock tests
          </motion.p>
        </motion.div>
      </section>

      {/* Leaderboard Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-0.5 bg-indigo-600 dark:bg-indigo-500"></div>
            <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Performance Leaderboard</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
              >
                <option value="score">Sort by: Latest Score</option>
                <option value="best">Sort by: Best Score</option>
                <option value="recent">Sort by: Recent Test</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-t-4 border-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Loading community data...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
            <div className="bg-indigo-100 dark:bg-indigo-900/20 p-4 rounded-full inline-block mb-4">
              <Users className="text-indigo-600 dark:text-indigo-400" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No users found</h3>
            <p className="text-zinc-600 dark:text-zinc-300">
              {searchQuery ? "Try a different search term" : "No users have taken mock tests yet"}
            </p>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 gap-6"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Top 3 performers */}
            {filteredUsers.slice(0, 3).map((user, index) => (
              <motion.div
                key={user.id}
                variants={slideUp}
                className="relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6 shadow-lg"
              >
                {/* Medal badge */}
                <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                  index === 0 ? "bg-gradient-to-r from-yellow-500 to-amber-600" :
                  index === 1 ? "bg-gradient-to-r from-gray-400 to-gray-600" :
                  "bg-gradient-to-r from-amber-700 to-amber-900"
                }`}>
                  {index === 0 ? <Trophy size={24} /> : index + 1}
                </div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 w-20 h-20 rounded-full flex items-center justify-center text-white">
                    <span className="text-2xl font-bold">{user.name?.charAt(0) || "U"}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                      <h3 className="text-xl font-bold">{user.name || "Unknown User"}</h3>
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full text-sm">
                        {user.id}
                      </span>
                    </div>
                    
                    {user.latestTest ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">Latest Score</p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {user.latestTest.percentage?.toFixed(1) || "0"}%
                          </p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">Best Score</p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {user.bestScore?.toFixed(1) || "0"}%
                          </p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">Tests Taken</p>
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {user.mockTests.length}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                        <p className="text-indigo-700 dark:text-indigo-300">
                          No mock tests taken yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Other users */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {filteredUsers.slice(3).map((user, index) => (
                <motion.div
                  key={user.id}
                  variants={slideUp}
                  className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-700 dark:to-purple-800 w-14 h-14 rounded-full flex items-center justify-center text-white">
                      <span className="text-xl font-bold">{user.name?.charAt(0) || "U"}</span>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold">{user.name || "Unknown User"}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{user.id}</p>
                      
                      {user.latestTest ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-zinc-600 dark:text-zinc-300">Latest Score</span>
                              <span className="font-medium">{user.latestTest.percentage?.toFixed(1) || "0"}%</span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                                style={{ width: `${user.latestTest.percentage || 0}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-zinc-600 dark:text-zinc-300">Best Score</span>
                              <span className="font-medium">{user.bestScore?.toFixed(1) || "0"}%</span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                                style={{ width: `${user.bestScore || 0}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
                            <span>Tests: {user.mockTests.length}</span>
                            <span>
                              {user.latestTest.createdAt 
                                ? dayjs(user.latestTest.createdAt.toDate()).format("DD MMM YYYY")
                                : "No tests"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                          <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                            No mock tests taken yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-800/50 dark:to-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-0.5 bg-indigo-600 dark:bg-indigo-500"></div>
            <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Community Stats</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { 
                value: users.length, 
                label: "Total Members", 
                icon: <Users className="w-8 h-8" />,
                color: "from-indigo-500 to-indigo-600"
              },
              { 
                value: users.filter(u => u.mockTests.length > 0).length, 
                label: "Active Test Takers", 
                icon: <BarChart2 className="w-8 h-8" />,
                color: "from-purple-500 to-purple-600"
              },
              { 
                value: users.length > 0 
                  ? Math.max(...users.map(u => u.bestScore)).toFixed(1) + "%"
                  : "0%", 
                label: "Highest Score", 
                icon: <Star className="w-8 h-8" />,
                color: "from-amber-500 to-amber-600"
              },
              { 
                value: users.reduce((acc, user) => acc + user.mockTests.length, 0), 
                label: "Total Tests Taken", 
                icon: <Award className="w-8 h-8" />,
                color: "from-emerald-500 to-emerald-600"
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={slideUp}
                className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 text-center"
              >
                <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-white`}>
                  {stat.icon}
                </div>
                <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}