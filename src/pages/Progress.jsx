// src/pages/Progress.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  collection, 
  query, 
  where, 
  getDocs
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import { 
  BarChart, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp 
} from "lucide-react";
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

export default function Progress() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
      document.title = "BCA Hub | Progress";
    }, []);
  
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
          const data = doc.data();
          schedulesData.push({ 
            id: doc.id, 
            ...data,
            date: data.date ? new Date(data.date) : new Date()
          });
        });
        
        // Sort schedules by date
        schedulesData.sort((a, b) => b.date - a.date);
        setSchedules(schedulesData);
      } catch (error) {
        console.error("Error fetching schedules:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [userData]);

  // Calculate statistics
  const totalSchedules = schedules.length;
  const completedSchedules = schedules.filter(s => s.completed).length;
  const completionRate = totalSchedules > 0 
    ? Math.round((completedSchedules / totalSchedules) * 100)
    : 0;
  
  const upcomingSchedules = schedules
    .filter(s => !s.completed && s.date > new Date())
    .slice(0, 3);
  
  const recentCompleted = schedules
    .filter(s => s.completed)
    .slice(0, 3);

  // Calculate streaks
  const calculateStreak = () => {
    if (schedules.length === 0) return 0;
    
    const completedDates = [...new Set(
      schedules
        .filter(s => s.completed)
        .map(s => s.date.toDateString())
    )].sort().reverse();
    
    if (completedDates.length === 0) return 0;
    
    let streak = 1;
    let prevDate = new Date(completedDates[0]);
    
    for (let i = 1; i < completedDates.length; i++) {
      const currentDate = new Date(completedDates[i]);
      const diffTime = Math.abs(prevDate - currentDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
        prevDate = currentDate;
      } else if (diffDays > 1) {
        break;
      }
    }
    
    return streak;
  };
  
  const currentStreak = calculateStreak();
  
  // Prepare chart data
  const getChartData = () => {
    const now = new Date();
    const labels = [];
    const data = [];
    
    if (timeRange === "week") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(dateStr);
        
        const completedCount = schedules.filter(s => 
          s.completed && 
          s.date.toDateString() === date.toDateString()
        ).length;
        
        data.push(completedCount);
      }
    } else {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (i * 7) - 6);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - (i * 7));
        
        labels.push(`Week ${4 - i}`);
        
        const completedCount = schedules.filter(s => 
          s.completed && 
          s.date >= startDate && 
          s.date <= endDate
        ).length;
        
        data.push(completedCount);
      }
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Completed Sessions',
          data: data,
          borderColor: 'rgba(99, 102, 241, 0.9)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.4,
          fill: true,
        }
      ]
    };
  };
  
  const chartData = getChartData();
  
  const chartOptions = {
    responsive: true,
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
          label: function(context) {
            return `${context.parsed.y} session${context.parsed.y !== 1 ? 's' : ''}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          color: "rgba(200, 200, 220, 0.2)"
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <TrendingUp className="text-indigo-600" size={32} />
            Study Progress
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your learning journey and achievements
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-3xl font-bold text-indigo-600">{totalSchedules}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Sessions</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-3xl font-bold text-green-500">{completedSchedules}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completed</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-3xl font-bold text-purple-500">{completionRate}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completion Rate</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-3xl font-bold text-amber-500">{currentStreak}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Streak</div>
          </div>
        </motion.div>

        {/* Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-10"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold">Study Activity</h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange("week")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  timeRange === "week" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeRange("month")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  timeRange === "month" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Upcoming and Recent Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upcoming Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-amber-500" size={24} />
              Upcoming Sessions
            </h2>
            
            {upcomingSchedules.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-amber-100 dark:bg-amber-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-amber-600" size={28} />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No upcoming study sessions scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSchedules.map((schedule) => (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30"
                  >
                    <div>
                      <p className="font-medium">{schedule.title}</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {schedule.date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
          
          {/* Recently Completed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-500" size={24} />
              Recently Completed
            </h2>
            
            {recentCompleted.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-green-100 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-600" size={28} />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No completed study sessions yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCompleted.map((schedule) => (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30"
                  >
                    <div>
                      <p className="font-medium">{schedule.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {schedule.subject}
                      </p>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {schedule.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}