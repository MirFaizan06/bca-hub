// src/pages/AttendanceAdmin.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Copy, Shield } from 'lucide-react';

export default function AttendanceAdmin() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [url, setUrl] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  // Check if token exists for today
  useEffect(() => {
    const fetchToken = async () => {
      setLoading(true);
      try {
        const tokenDoc = await getDoc(doc(db, 'attendance', today));
        if (tokenDoc.exists()) {
          setToken(tokenDoc.data().token);
        } else {
          setToken('');
        }
      } catch (err) {
        console.error('Error fetching token:', err);
        toast.error('Failed to load attendance token');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [today]);

  // Update URL when token changes
  useEffect(() => {
    if (token) {
      const attendanceUrl = `${window.location.origin}/attendance/mark?date=${today}&token=${token}`;
      setUrl(attendanceUrl);
    } else {
      setUrl('');
    }
  }, [token, today]);

  const generateToken = async () => {
    setGenerating(true);
    try {
      // Generate 6-character token
      const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await setDoc(doc(db, 'attendance', today), {
        token: newToken,
        createdAt: new Date(),
      });
      
      setToken(newToken);
      toast.success('Token generated successfully');
    } catch (err) {
      console.error('Token generation failed:', err);
      toast.error('Failed to generate token');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    toast.info('URL copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 space-y-6"
        >
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="text-blue-600" /> 
              Attendance QR Generator
            </h1>
            <div className="text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              {today}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : token ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border border-zinc-200">
                  <QRCodeSVG value={url} size={200} />
                </div>
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Scan this QR to mark attendance
                </p>
              </div>

              <div className="mt-4 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-4 flex items-center justify-between">
                <p className="text-sm font-mono break-all">{url}</p>
                <button
                  onClick={copyToClipboard}
                  className="ml-4 p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg mb-6">No token generated for today.</p>
              <button
                onClick={generateToken}
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center mx-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Generate Token
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}