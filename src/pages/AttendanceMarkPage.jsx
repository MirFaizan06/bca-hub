// src/pages/AttendanceMarkPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

// Generate device ID (persists in localStorage)
const generateDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export default function AttendanceMarkPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('checking'); // checking, valid, invalid, alreadyMarked, marked
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkTokenAndMark = async () => {
      // Check if user is logged in
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser) {
        navigate('/login', { state: { from: location.pathname + location.search } });
        return;
      }
      setUser(storedUser);

      const params = new URLSearchParams(location.search);
      const date = params.get('date');
      const token = params.get('token');

      // Validate params
      if (!date || !token) {
        setStatus('invalid');
        return;
      }

      // Check if date is today
      if (!isToday(new Date(date))) {
        setStatus('invalid');
        toast.error('This QR code has expired');
        return;
      }

      try {
        // Validate token
        const tokenDoc = await getDoc(doc(db, 'attendance', date));
        if (!tokenDoc.exists() || tokenDoc.data().token !== token) {
          setStatus('invalid');
          return;
        }

        // Check if attendance already marked
        const deviceId = generateDeviceId();
        const recordId = `${storedUser.roll}-${date}`;
        const recordRef = doc(db, 'attendanceRecords', recordId);
        const recordSnap = await getDoc(recordRef);

        if (recordSnap.exists()) {
          setStatus('alreadyMarked');
          return;
        }

        // Create attendance record
        await setDoc(recordRef, {
          userId: storedUser.roll,
          name: storedUser.name,
          date: date,
          deviceId: deviceId,
          timestamp: new Date(),
        });

        setStatus('marked');
        toast.success('Attendance marked successfully!');
      } catch (err) {
        console.error('Error marking attendance:', err);
        toast.error('Failed to mark attendance');
        setStatus('invalid');
      }
    };

    checkTokenAndMark();
  }, [navigate, location]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="mx-auto bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 w-16 h-16 rounded-xl flex items-center justify-center shadow-lg mb-4"
          >
            <span className="text-2xl font-bold text-white">BH</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-white mb-2">
            Mark Attendance
          </h1>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
          {status === 'checking' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
              <p className="text-lg">Verifying attendance request...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg mb-6">Invalid or expired QR code.</p>
              <button
                onClick={handleGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'alreadyMarked' && (
            <div className="flex flex-col items-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg mb-6">Attendance already marked for today.</p>
              <button
                onClick={handleGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'marked' && (
            <div className="flex flex-col items-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg mb-6">Attendance marked successfully!</p>
              <button
                onClick={handleGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center"
              >
                Continue to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}