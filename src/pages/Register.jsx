import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../utils/firebase";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || "/dashboard";

  const [roll, setRoll] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [batch, setBatch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "BCA Hub | Register";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const trimmedRoll = roll.trim();
    const trimmedName = name.trim();
    const trimmedPwd = password.trim();
    const trimmedBatch = batch.trim();

    if (!trimmedRoll || !trimmedName || !trimmedPwd || !trimmedBatch) {
      toast.error("All fields are required");
      setLoading(false);
      return;
    }

    const email = `${trimmedRoll}@bca-hub.com`;
    const isSuperAdmin = trimmedRoll === "2401306";
    const userRef = doc(db, "users", trimmedRoll);

    try {
      // Check if Firestore document already exists under "users/<roll>"
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        toast.error("Roll number already registered");
        setLoading(false);
        return;
      }

      // Try creating a Firebase Auth user
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, trimmedPwd);
      } catch (authErr) {
        if (authErr.code === "auth/email-already-in-use") {
          toast.error("Roll number already registered");
          setLoading(false);
          return;
        }
        throw authErr;
      }

      const { uid } = userCredential.user;

      // Now create Firestore document under "users/<roll>"
      await setDoc(userRef, {
        uid: uid,
        name: trimmedName,
        rollNumber: trimmedRoll,
        isApproved: isSuperAdmin,
        isAdmin: isSuperAdmin,
        batch: trimmedBatch,
        registeredAt: new Date(),
        pfpUrl: `/dps/dp${Math.floor(Math.random() * 10) + 1}.png`,
      });

      if (isSuperAdmin) {
        // Automatically log in super-admin
        const userObj = {
          roll: trimmedRoll,
          name: trimmedName,
          batch: trimmedBatch,
          isAdmin: true,
          isApproved: true,
        };
        localStorage.setItem("user", JSON.stringify(userObj));
        toast.success("Super-admin account created!");
        navigate(fromPath, { replace: true });
      } else {
        toast.info("Registration successful! Awaiting admin approval.");
        navigate("/login", { state: { from: fromPath } });
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
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
            Create an Account
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Join the BCA Hub community
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="roll"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Roll Number
              </label>
              <div className="relative">
                <input
                  id="roll"
                  name="roll"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="e.g., 2401306"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-500">#</span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Your full name"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-zinc-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="batch"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Batch Year
              </label>
              <div className="relative">
                <select
                  id="batch"
                  name="batch"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Select your batch</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-zinc-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-zinc-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Create a password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-zinc-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Use 8+ characters with a mix of letters, numbers & symbols
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
