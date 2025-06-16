// src/pages/Announcements.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import dayjs from "dayjs";
import { Bell, ChevronDown, Search } from "lucide-react";

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

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "BCA Hub | Achievements";
  }, []);


  // Fetch announcements from Firebase
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const announcementsCol = collection(db, "announcements");
        const q = query(announcementsCol, orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const announcementList = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            announcementList.push({
              id: doc.id,
              title: data.title,
              description: data.description,
              createdAt: data.createdAt?.toDate 
                ? data.createdAt.toDate() 
                : new Date(data.createdAt.seconds * 1000)
            });
          });
          
          setAnnouncements(announcementList);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        console.error("Error fetching announcements:", err);
        toast.error("Failed to load announcements");
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Sort announcements based on selection
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (sortBy === "recent") {
      return b.createdAt - a.createdAt;
    } else if (sortBy === "oldest") {
      return a.createdAt - b.createdAt;
    }
    return 0;
  });

  // Filter announcements based on search
  const filteredAnnouncements = sortedAnnouncements.filter(announcement => 
    announcement.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-800 dark:text-zinc-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 py-20 px-4 text-center">
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
            Announcements
          </motion.h1>
          <motion.p
            className="text-xl font-medium text-blue-100 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Important updates, news, and platform information
          </motion.p>
        </motion.div>
      </section>

      {/* Announcements Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Latest Updates
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search announcements..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="recent">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-t-4 border-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
              <Bell className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No announcements found</h3>
            <p className="text-zinc-600 dark:text-zinc-300">
              {searchQuery ? "Try a different search term" : "No announcements available yet"}
            </p>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 gap-6"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            viewport={{ once: true }}
          >
            {/* Announcement Cards */}
            {filteredAnnouncements.map((announcement) => (
              <motion.div
                key={announcement.id}
                variants={slideUp}
                className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {dayjs(announcement.createdAt).format("MMMM D, YYYY - h:mm A")}
                      </p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg flex-shrink-0">
                      <Bell className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                  </div>
                  
                  <div className="prose prose-blue dark:prose-invert max-w-none">
                    <p className="text-zinc-700 dark:text-zinc-300">
                      {announcement.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800/50 dark:to-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Announcement Stats
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              variants={slideUp}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 text-center"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-white">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-1">{announcements.length}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">Total Announcements</p>
            </motion.div>
            
            <motion.div
              variants={slideUp}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 text-center"
            >
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {announcements.length > 0 
                  ? dayjs(announcements[0].createdAt).format("MMM D")
                  : "N/A"
                }
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">Most Recent Update</p>
            </motion.div>
            
            <motion.div
              variants={slideUp}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 text-center"
            >
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {new Set(announcements.map(a => 
                  dayjs(a.createdAt).format("YYYY-MM-DD")
                )).size}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">Days with Updates</p>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}