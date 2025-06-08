// src/pages/Attendance.jsx
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Check, X, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Attendance() {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    
    // Get user from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    try {
      const recordsRef = collection(db, 'attendanceRecords');
      const recordsSnapshot = await getDocs(recordsRef);
      
      // Filter client-side
      const records = [];
      recordsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId === storedUser.roll) {
          records.push({ id: doc.id, ...data });
        }
      });

      // Sort by date (newest first)
      records.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      setAttendance(records);
      
      // Calculate stats
      const presentDays = records.length;
      const totalPossible = 30; // Adjust based on your needs
      const percentage = Math.round((presentDays / totalPossible) * 100);
      
      setStats({
        total: totalPossible,
        present: presentDays,
        percentage: percentage
      });
    } catch (err) {
      console.error('Error fetching attendance:', err);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 space-y-8"
        >
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">My Attendance</h1>
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              <BarChart2 size={18} />
              <span>{stats.percentage}% ({stats.present}/{stats.total})</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <p className="text-lg">No attendance records found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">Present</p>
                  <p className="text-2xl font-bold">{stats.present} days</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">Absent</p>
                  <p className="text-2xl font-bold">{stats.total - stats.present} days</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">Percentage</p>
                  <p className="text-2xl font-bold">{stats.percentage}%</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-700/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                    {attendance.map((record) => {
                      // Handle both Firestore Timestamp and JS Date formats
                      let dateObj;
                      if (record.timestamp?.seconds) {
                        dateObj = new Date(record.timestamp.seconds * 1000);
                      } else if (record.timestamp instanceof Date) {
                        dateObj = record.timestamp;
                      } else {
                        dateObj = new Date(record.timestamp);
                      }
                      
                      const dateString = dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {dateString}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Present
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-300">
                            {timeString}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}