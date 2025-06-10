import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  MapPin,
  AlertTriangle,
  Info
} from 'lucide-react';

// Persisted device ID generator
const generateDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const COLLEGE_LOCATION = {
  latitude: 34.080264121003225,
  longitude: 74.77766561630118,
  radius: 200 // Radius in meters
};
 
// college address: 34.080264121003225, 74.77766561630118

export default function AttendanceMarkPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState('checking'); // checking, validating, invalid, alreadyMarked, marked, locationError, outsideRange
  const [user, setUser] = useState(null);
  const [positionError, setPositionError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  // Haversine distance (m)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2)**2 +
              Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Entry point: verify login, then check if already marked, then check location
  useEffect(() => {
    const checkAttendance = async () => {
      // Check if user is logged in
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser) {
        navigate('/login', { state: { from: location.pathname + location.search } });
        return;
      }
      setUser(storedUser);

      // Get and validate URL parameters
      const params = new URLSearchParams(location.search);
      const date = params.get('date');
      const token = params.get('token');

      if (!date || !token) {
        setStatus('invalid');
        return;
      }

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
        const recordId = `${storedUser.roll}-${date}`;
        const recordRef = doc(db, 'attendanceRecords', recordId);
        const recordSnap = await getDoc(recordRef);

        if (recordSnap.exists()) {
          setStatus('alreadyMarked');
          return;
        }

        // Only check location if not already marked
        setStatus('validating');
        checkLocation(date, token, storedUser);
      } catch (err) {
        console.error('Error checking attendance:', err);
        toast.error('Failed to verify attendance status');
        setStatus('invalid');
      }
    };

    checkAttendance();
  }, [navigate, location]);

  // Check user's location after confirming attendance isn't already marked
  const checkLocation = (date, token, user) => {
    if (!navigator.geolocation) {
      setStatus('locationError');
      setPositionError({ code: 0, message: 'Your device does not support location services. Please contact the developer.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        const dist = calculateDistance(
          latitude,
          longitude,
          COLLEGE_LOCATION.latitude,
          COLLEGE_LOCATION.longitude
        );
        setCurrentLocation({ latitude, longitude });
        setAccuracy(accuracy);
        setDistance(dist);

        // Consider both distance and accuracy for location validation
        if (dist + accuracy <= COLLEGE_LOCATION.radius) {
          markAttendance(date, token, user, { latitude, longitude, accuracy, dist });
        } else {
          setStatus('outsideRange');
        }
      },
      err => {
        console.error('Geolocation error:', err);
        setPositionError(err);
        setStatus('locationError');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Mark attendance after location is verified
  const markAttendance = async (date, token, user, locationData) => {
    try {
      const deviceId = generateDeviceId();
      const recordId = `${user.roll}-${date}`;
      const recordRef = doc(db, 'attendanceRecords', recordId);

      await setDoc(recordRef, {
        userId: user.roll,
        name: user.name,
        date,
        deviceId,
        timestamp: new Date(),
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          distance: locationData.dist,
          withinRange: true
        }
      });

      setStatus('marked');
      toast.success('Attendance marked successfully!');
    } catch (err) {
      console.error('Error marking attendance:', err);
      toast.error('Failed to mark attendance');
      setStatus('invalid');
    }
  };

  const handleGoToDashboard = () => navigate('/dashboard');
  const handleRetry = () => window.location.reload();

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
              <p className="text-lg">Verifying attendance status...</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Please wait while we check your records
              </p>
            </div>
          )}

          {status === 'validating' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
              <p className="text-lg">Verifying your location...</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Please allow location access when prompted
              </p>
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg w-full">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    You must be within {COLLEGE_LOCATION.radius} meters of the classroom to mark attendance
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'locationError' && (
            <div className="flex flex-col items-center py-12">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-lg mb-2">Location access required</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">
                {positionError?.message === 'User denied Geolocation' 
                  ? 'You must allow location access to mark attendance. This helps verify you are physically present in class.'
                  : positionError?.message || 'We need your location to verify you are at the college.'}  
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-6 w-full">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    If you denied permission, you'll need to enable location in your browser settings and try again
                  </p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'outsideRange' && (
            <div className="flex flex-col items-center py-12">
              <MapPin className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg mb-2">Not in attendance zone</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">
                You must be physically present in the classroom to mark attendance
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 w-full">
                <div className="flex flex-col">
                  <p className="text-sm text-red-800 dark:text-red-300 mb-1">
                    <strong>Your distance:</strong> {Math.round(distance)} meters from classroom
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>GPS accuracy:</strong> ±{Math.round(accuracy)} meters
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                    You need to be within {COLLEGE_LOCATION.radius} meters to mark attendance
                  </p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md mb-2"
              >
                Try Again
              </button>
              <button
                onClick={handleGoToDashboard}
                className="text-blue-600 hover:text-blue-700 font-medium py-2 px-6"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg mb-2">Invalid QR Code</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">
                This QR code is invalid or has expired. Please scan a current QR code.
              </p>
              <button
                onClick={handleGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'alreadyMarked' && (
            <div className="flex flex-col items-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg mb-2">Already Marked Present</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">
                Your attendance has already been recorded for today's class.
              </p>
              <button
                onClick={handleGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'marked' && (
            <div className="flex flex-col items-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg mb-2">Attendance Marked!</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">
                Your attendance has been successfully recorded for today's class.
              </p>
              <button
                onClick={handleGoToDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md flex items-center"
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