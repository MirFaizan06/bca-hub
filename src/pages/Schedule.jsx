// src/pages/Schedule.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, Check, X, Clock, BookOpen, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Schedule() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    subject: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
    completed: false
  });
  const [showForm, setShowForm] = useState(false);

  // Get user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    setUserData(JSON.parse(storedUser));
  }, [navigate]);

  // Fetch schedules from Firebase
  useEffect(() => {
    if (!userData) return;
    
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "schedules"),
          where("userId", "==", userData.roll)
        );
        const querySnapshot = await getDocs(q);
        const schedulesData = [];
        
        querySnapshot.forEach((doc) => {
          schedulesData.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort schedules by date
        schedulesData.sort((a, b) => new Date(a.date) - new Date(b.date));
        setSchedules(schedulesData);
      } catch (error) {
        console.error("Error fetching schedules:", error);
        toast.error("Failed to load schedules");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSchedule({ ...newSchedule, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userData) {
      toast.error("Please sign in to create schedules");
      return;
    }
    
    try {
      const scheduleData = {
        ...newSchedule,
        userId: userData.roll,
        createdAt: serverTimestamp(),
        completed: false
      };
      
      const docRef = await addDoc(collection(db, "schedules"), scheduleData);
      setSchedules([...schedules, { id: docRef.id, ...scheduleData }]);
      
      toast.success("Schedule created successfully!");
      setNewSchedule({
        title: "",
        subject: "",
        date: "",
        startTime: "",
        endTime: "",
        description: "",
        completed: false
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast.error("Failed to create schedule");
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      const scheduleRef = doc(db, "schedules", id);
      await updateDoc(scheduleRef, { completed: !currentStatus });
      
      setSchedules(schedules.map(schedule => 
        schedule.id === id ? { ...schedule, completed: !currentStatus } : schedule
      ));
      
      toast.success(`Schedule marked as ${!currentStatus ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await deleteDoc(doc(db, "schedules", id));
      setSchedules(schedules.filter(schedule => schedule.id !== id));
      toast.success("Schedule deleted successfully");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  // Group schedules by date
  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const date = schedule.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {});

  // Calculate progress statistics
  const totalSchedules = schedules.length;
  const completedSchedules = schedules.filter(s => s.completed).length;
  const completionRate = totalSchedules > 0 
    ? Math.round((completedSchedules / totalSchedules) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Calendar className="text-indigo-600" size={32} />
              Study Schedule
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Plan your study sessions and track your progress
            </p>
          </div>
          
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-md transition-all"
          >
            <Plus size={20} />
            Add New Schedule
          </button>
        </motion.div>

        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-10"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                <TrendingUp className="text-green-500" size={24} />
                Your Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Track your completion rate and stay motivated
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl min-w-[120px]">
                <p className="text-sm text-indigo-700 dark:text-indigo-300">Total</p>
                <p className="text-2xl font-bold">{totalSchedules}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl min-w-[120px]">
                <p className="text-sm text-green-700 dark:text-green-300">Completed</p>
                <p className="text-2xl font-bold">{completedSchedules}</p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl min-w-[120px]">
                <p className="text-sm text-purple-700 dark:text-purple-300">Completion</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </motion.div>

        {/* Add Schedule Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-10"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="text-indigo-600" size={20} />
              Create New Schedule
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={newSchedule.title}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Study session title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={newSchedule.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Subject or topic"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={newSchedule.date}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={newSchedule.startTime}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={newSchedule.endTime}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newSchedule.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Add details about this study session"
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Schedules List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            Your Study Plans
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-indigo-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">No Study Schedules Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create your first study schedule to get started
              </p>
              <button 
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-md"
              >
                Create Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSchedules).map(([date, dateSchedules]) => (
                <div key={date} className="mb-8">
                  <h3 className="text-lg font-bold mb-4 text-indigo-700 dark:text-indigo-300">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  
                  <div className="space-y-4">
                    {dateSchedules.map((schedule) => (
                      <div 
                        key={schedule.id}
                        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border-l-4 ${
                          schedule.completed 
                            ? "border-green-500" 
                            : new Date(schedule.date) < new Date()
                              ? "border-rose-500"
                              : "border-indigo-500"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-lg">{schedule.title}</h4>
                              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">
                                {schedule.subject}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <Clock size={16} />
                              <span>
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                            </div>
                            
                            {schedule.description && (
                              <p className="text-gray-700 dark:text-gray-300">
                                {schedule.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleComplete(schedule.id, schedule.completed)}
                              className={`p-2 rounded-full ${
                                schedule.completed 
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              }`}
                              title={schedule.completed ? "Mark as incomplete" : "Mark as complete"}
                            >
                              <Check size={18} />
                            </button>
                            
                            <button
                              onClick={() => deleteSchedule(schedule.id)}
                              className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                              title="Delete schedule"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            schedule.completed 
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                              : new Date(schedule.date) < new Date()
                                ? "bg-rose-100 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300"
                                : "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300"
                          }`}>
                            {schedule.completed 
                              ? "Completed" 
                              : new Date(schedule.date) < new Date()
                                ? "Missed"
                                : "Upcoming"}
                          </span>
                          
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Created: {new Date().toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}