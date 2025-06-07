// src/pages/Attendance.jsx

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Attendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const db = getFirestore();

  // Build today's date and base token
  const today = new Date().toISOString().slice(0, 10);
  const rawToken = btoa(`ATTEND:${today}:bca-hub`);

  // Attendance URL: clicking it will hit this same page with ?token=...
  const attendanceUrl = `${window.location.origin}/attendance?token=${rawToken}`;

  // State
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState("");
  const [roll, setRoll] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  const html5QrCodeRef = useRef(null);

  // If user arrived via generic scanner link, check token param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");
    if (tokenParam === rawToken) {
      setScanned(true);
    }
  }, [location.search, rawToken]);

  // Start in-site camera scanner if still not scanned
  useEffect(() => {
    if (scanned) return;

    const onScanSuccess = (decoded) => {
      let token = decoded;
      try {
        // If scanner reads a URL, extract token param
        const url = new URL(decoded);
        token = url.searchParams.get("token");
      } catch {
        // Not a URL, leave token as-is
      }

      if (token === rawToken) {
        html5QrCodeRef.current
          .stop()
          .catch(() => {})
          .finally(() => setScannerActive(false));
        setScanned(true);
      } else {
        setScanError("Scanned QR is invalid for today.");
      }
    };

    const qrRegionId = "qr-reader";
    html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
    html5QrCodeRef.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        (_err) => {}
      )
      .then(() => setScannerActive(true))
      .catch((err) => {
        console.error("Unable to start scanner:", err);
        setScanError("Cannot access camera. Please use the link above.");
      });

    return () => {
      if (scannerActive && html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [scanned, rawToken, scannerActive]);

  // Handle form-based check-in
  const handleCheckIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    const trimmedRoll = roll.trim().replace(/[^a-zA-Z0-9]/g, "");
    const trimmedPwd = password.trim();
    if (!trimmedRoll || !trimmedPwd) {
      toast.error("Roll number and password are required.");
      setLoading(false);
      return;
    }

    const email = `${trimmedRoll}@bca-hub.com`;

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, trimmedPwd);
      const uid = user.uid;

      // Prevent multiple check-ins per day
      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("uid", "==", uid),
        where("date", "==", today)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("You have already checked in today.");
        setLoading(false);
        return;
      }

      // Record attendance
      await setDoc(doc(db, "attendance", `${today}_${uid}`), {
        uid,
        roll: trimmedRoll,
        date: today,
        timestamp: serverTimestamp(),
      });

      toast.success("Attendance recorded successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Authentication failed or attendance error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-4 space-y-8">
      {/* Always show the QR code link */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Today's Attendance</h1>
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Scan this QR or&nbsp;
          <a
            href={attendanceUrl}
            className="text-blue-600 hover:underline"
          >
            click here
          </a>
          &nbsp;to open on your device.
        </p>
        <QRCode
          value={attendanceUrl}
          size={180}
          bgColor="transparent"
          fgColor="#2563eb"
          className="mx-auto"
        />
      </div>

      {!scanned ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 text-center"
        >
          <div
            id="qr-reader"
            className="w-64 h-64 mx-auto border rounded-lg overflow-hidden"
          />
          {scanError && <p className="text-red-600">{scanError}</p>}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Align your camera with the QR code.
          </p>
        </motion.div>
      ) : (
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onSubmit={handleCheckIn}
          className="w-full max-w-sm bg-zinc-50 dark:bg-zinc-800 p-6 rounded-xl shadow-lg space-y-4"
        >
          <h2 className="text-xl font-semibold text-center">
            Confirm Your Identity
          </h2>

          <div className="flex flex-col">
            <label htmlFor="roll" className="text-sm font-medium mb-1">
              Roll Number
            </label>
            <input
              id="roll"
              value={roll}
              onChange={(e) =>
                setRoll(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
              }
              required
              className="border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-400"
              placeholder="2401306"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="pwd" className="text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md disabled:opacity-50 transition"
          >
            {loading ? "Checking In…" : "Check In"}
          </button>
        </motion.form>
      )}
    </main>
);
}
