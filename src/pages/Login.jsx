import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../utils/firebase";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || "/dashboard";

  const [roll, setRoll] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    document.title = "BCA Hub | Login";
    const storedRoll = localStorage.getItem("rememberedRoll");
    if (storedRoll) {
      setRoll(storedRoll);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.isApproved) {
          navigate(fromPath, { replace: true });
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }, [navigate, fromPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const trimmedRoll = roll.trim();
    if (!trimmedRoll || !password) {
      toast.error("Roll number and password are required");
      setLoading(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem("rememberedRoll", trimmedRoll);
    } else {
      localStorage.removeItem("rememberedRoll");
    }

    const email = `${trimmedRoll}@bca-hub.com`;

    try {
      // Sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      
      // Get user document from Firestore
      const userRef = doc(db, "users", trimmedRoll);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast.error("User record not found");
        setLoading(false);
        return;
      }

      const data = userSnap.data();
      
      // Check if user is approved
      if (!data.isApproved && trimmedRoll !== "2401306") {
        toast.info("Your account is pending admin approval");
        setLoading(false);
        return;
      }

      // Store user data locally
      const userObj = {
        roll: trimmedRoll,
        name: data.name,
        batch: data.batch,
        isAdmin: data.isAdmin || (trimmedRoll === "2401306"),
        isApproved: true,
      };
      localStorage.setItem("user", JSON.stringify(userObj));
      
      toast.success("Login successful!");
      navigate(fromPath, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.message || "Invalid credentials. Please try again.");
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
            Welcome Back
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Sign in to your BCA Hub account
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
              <div className="flex items-center justify-between mb-1">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <a 
                  href="/forgot-password" 
                  className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-zinc-500" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-600 rounded dark:bg-zinc-700"
                />
                <label 
                  htmlFor="remember-me" 
                  className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Remember me
                </label>
              </div>
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Don't have an account?{" "}
              <a 
                href="/register" 
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Register now
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}