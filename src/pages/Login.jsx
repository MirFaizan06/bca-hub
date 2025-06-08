import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { auth, db } from "../utils/firebase";

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
      } catch {}
    }
  }, [navigate, fromPath]);

  const handleLogin = async (e) => {
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
      await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "users", trimmedRoll);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        toast.error("User data not found. Please register first.");
        setLoading(false);
        return;
      }

      const data = snap.data();
      if (!data.isApproved && trimmedRoll !== "2401306") {
        toast.info("Account pending approval by admin.");
        setLoading(false);
        return;
      }

      const userData = {
        roll: trimmedRoll,
        name: data.name,
        batch: data.batch,
        isAdmin: data.isAdmin || trimmedRoll === "2401306",
        isApproved: true,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Login successful!");
      navigate(fromPath, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        toast.error("User not found. Please register first.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-lg"
          >
            BH
          </motion.div>
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-white mt-4">Welcome Back</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Sign in to your BCA Hub account</p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="roll" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Roll Number
              </label>
              <div className="relative">
                <input
                  id="roll"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  required
                  placeholder="e.g., 2401306"
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-500">#</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <Link
                  to="/reset-password"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium py-3 rounded-lg flex justify-center items-center hover:from-blue-700 hover:to-indigo-800 transition disabled:opacity-70"
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
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">
              Register now
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}