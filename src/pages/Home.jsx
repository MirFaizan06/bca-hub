// src/pages/Home.jsx
import { useState, useEffect } from "react";
import { Typewriter } from "react-simple-typewriter";
import { motion } from "framer-motion";
import { GraduationCap, FileText, TimerReset, Users, Bell, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../utils/firebase";
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

export default function Home() {
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);

  useEffect(() => {
    const announcementsCol = collection(db, "announcements");
    const q = query(announcementsCol, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setLatestAnnouncement({ id: docSnap.id, ...docSnap.data() });
      } else {
        setLatestAnnouncement(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-800 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 px-4 py-8">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-3 space-y-12">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-3xl shadow-xl overflow-hidden py-16 px-6 text-center">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-grid-white/10"></div>
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
            
            <motion.div 
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-white"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-400">BCA Hub</span>
              </motion.h1>
              <motion.p
                className="text-xl font-medium text-blue-100 max-w-2xl mx-auto mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                A portal made for you, by one of you.{" "}
                <span className="font-bold text-white">
                  <Typewriter
                    words={["Notes.", "Mock Tests.", "Resources.", "Survival. 😅"]}
                    loop
                    cursor
                    cursorStyle="|"
                    typeSpeed={70}
                    deleteSpeed={50}
                    delaySpeed={1500}
                  />
                </span>
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-zinc-900 font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started <ChevronRight size={20} />
                </Link>
              </motion.div>
            </motion.div>
          </section>

          {/* Why BCA Hub? */}
          <section className="py-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Why Choose BCA Hub?</h2>
              </div>
              
              <motion.div 
                className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
                variants={staggerChildren}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
              >
                {[
                  {
                    icon: <GraduationCap className="w-10 h-10" />,
                    label: "Verified Notes",
                    desc: "All notes curated from toppers and faculty.",
                    color: "from-blue-500 to-blue-600"
                  },
                  {
                    icon: <FileText className="w-10 h-10" />,
                    label: "Mock Tests",
                    desc: "Test yourself with real pattern MCQs.",
                    color: "from-indigo-500 to-indigo-600"
                  },
                  {
                    icon: <Users className="w-10 h-10" />,
                    label: "Class Community",
                    desc: "Join WhatsApp groups by batch/topic.",
                    color: "from-purple-500 to-purple-600"
                  },
                  {
                    icon: <TimerReset className="w-10 h-10" />,
                    label: "Personal Dashboard",
                    desc: "Track your scores, notes, and profile.",
                    color: "from-rose-500 to-rose-600"
                  },
                ].map(({ icon, label, desc, color }, i) => (
                  <motion.div
                    key={i}
                    variants={slideUp}
                    className="group relative h-full"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500 group-hover:duration-200 animate-tilt"></div>
                    <div className="relative bg-white dark:bg-zinc-800 rounded-xl p-6 h-full flex flex-col items-center text-center border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all">
                      <div className={`bg-gradient-to-r ${color} p-3 rounded-full mb-4 text-white`}>
                        {icon}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{label}</h3>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        {desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Our Impact</h2>
              </div>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  ["+50", "Registered Students", "bg-gradient-to-r from-blue-500 to-blue-600"],
                  ["+30", "Mock Tests", "bg-gradient-to-r from-indigo-500 to-indigo-600"],
                  ["+120", "Lecture Notes", "bg-gradient-to-r from-purple-500 to-purple-600"],
                  ["4.8★", "Student Rating", "bg-gradient-to-r from-amber-500 to-amber-600"],
                ].map(([count, label, gradient], i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className={`${gradient} rounded-xl shadow-lg overflow-hidden text-white`}
                  >
                    <div className="p-6">
                      <h3 className="text-4xl font-bold mb-2">{count}</h3>
                      <p className="text-blue-100">{label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="py-8">
            <div className="bg-gradient-to-tr from-indigo-100 to-purple-200 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl shadow-xl overflow-hidden">
              <div className="max-w-5xl mx-auto px-8 py-12 text-center">
                <motion.h2
                  className="text-3xl font-bold mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  Ready to Elevate Your Learning?
                </motion.h2>
                <motion.p
                  className="text-lg text-zinc-700 dark:text-zinc-300 mb-8 max-w-2xl mx-auto"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  Join thousands of students who are already acing their exams with BCA Hub.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Start Learning Now <ChevronRight size={20} />
                  </Link>
                </motion.div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar - Right Column */}
        <div className="lg:col-span-1 space-y-8">
          {/* Announcement Section */}
          <motion.div
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 py-4 px-6 flex items-center gap-3">
              <Bell className="text-white" />
              <h2 className="text-xl font-bold text-white">Announcements</h2>
            </div>
            <div className="p-6">
              {latestAnnouncement ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <Bell className="text-blue-600 dark:text-blue-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{latestAnnouncement.title}</h3>
                      <div
                        className="mt-2 text-zinc-600 dark:text-zinc-300"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {latestAnnouncement.description}
                      </div>
                      <Link
                        to="/announcements"
                        className="mt-2 inline-block text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Read more in announcements section
                      </Link>
                      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>Posted:</span>
                        <span className="font-medium">
                          {dayjs(latestAnnouncement.createdAt.toDate()).format(
                            "DD MMM YYYY, hh:mm A"
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                    <Bell className="text-blue-600 dark:text-blue-400" size={32} />
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    No announcements at the moment. Check back later!
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="text-xl font-bold mb-4">Quick Access</h2>
            <div className="space-y-3">
              {[
                { label: "Mock Tests", path: "/mock-tests", icon: <FileText size={18} /> },
                { label: "Study Notes", path: "/notes", icon: <GraduationCap size={18} /> },
                { label: "Resources", path: "/resources", icon: <Users size={18} /> },
                { label: "Community", path: "/community", icon: <Users size={18} /> },
              ].map((link, index) => (
                <Link
                  key={index}
                  to={link.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-zinc-700/50 transition-colors group"
                >
                  <span className="text-blue-600 dark:text-blue-400">{link.icon}</span>
                  <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {link.label}
                  </span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-blue-600 dark:text-blue-400" />
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Testimonial */}
          <motion.div
            className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl shadow-lg p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-2 rounded-full">
                <Users className="text-white" size={20} />
              </div>
              <h2 className="text-xl font-bold">What Students Say</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 shadow-sm">
                <p className="italic text-zinc-700 dark:text-zinc-300 mb-2">
                  "BCA Hub completely transformed how I prepare for exams. The mock tests are incredibly realistic!"
                </p>
                <p className="text-sm font-medium">- Faizan Lite, BCA 2024</p>
              </div>
              <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 shadow-sm">
                <p className="italic text-zinc-700 dark:text-zinc-300 mb-2">
                  "Finally found a platform that understands what BCA students actually need. The notes are lifesavers!"
                </p>
                <p className="text-sm font-medium">- Faizan, BCA 2024</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
