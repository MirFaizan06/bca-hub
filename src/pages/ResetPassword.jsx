import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "../utils/firebase";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { httpsCallable } from "firebase/functions";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: Roll number, 1: Security Q/A, 2: New password
  const [rollNumber, setRollNumber] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userData, setUserData] = useState(null);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    alphanumeric: true,
  });

  useEffect(() => {
    document.title = "BCA Hub | Reset Password";
  }, []);

  const handlePasswordChange = (value) => {
    setNewPassword(value);
    setPasswordChecks({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      alphanumeric: /^[a-zA-Z0-9]*$/.test(value)
    });
  };

  const isPasswordValid = () => {
    return passwordChecks.length && 
           passwordChecks.uppercase && 
           passwordChecks.alphanumeric;
  };

  const handleVerifyUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    const trimmedRoll = rollNumber.trim().toLowerCase();
    if (!trimmedRoll) {
      toast.error("Please enter your roll number");
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, "users", trimmedRoll);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (!data.securityQuestion || !data.securityAnswer) {
          toast.error("Security question not set for this account");
          setLoading(false);
          return;
        }
        setUserData(data);
        setStep(1);
        toast.success("User verified! Please answer your security question.");
      } else {
        toast.error("User not found. Please check your roll number.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      toast.error("Failed to verify user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!securityAnswer.trim()) {
      toast.error("Please enter your security answer");
      setLoading(false);
      return;
    }

    try {
      // Case-insensitive comparison
      if (securityAnswer.trim().toLowerCase() === userData.securityAnswer.toLowerCase()) {
        setStep(2);
        toast.success("Security question verified! You can now reset your password.");
      } else {
        toast.error("Incorrect security answer. Please try again.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      toast.error("Failed to verify answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isPasswordValid()) {
      toast.error("Password doesn't meet requirements");
      setLoading(false);
      return;
    }

    try {
      const resetPassword = httpsCallable(functions, 'resetUserPassword');
      const result = await resetPassword({
        rollNumber: rollNumber.trim().toLowerCase(),
        securityAnswer: securityAnswer.trim(),
        newPassword: newPassword
      });

      if (result.data.success) {
        toast.success("Password reset successfully!");
        navigate("/login");
      } else {
        toast.error("Password reset failed. Please try again.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      
      // Handle specific Firebase errors
      if (err.code === "permission-denied") {
        toast.error("Incorrect security answer. Please try again.");
      } else if (err.code === "not-found") {
        toast.error("User not found. Please register first.");
      } else {
        toast.error(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordStrengthIndicator = () => (
    <div className="mt-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
        Password must contain:
      </p>
      <ul className="space-y-1">
        <li className={`flex items-center text-xs ${passwordChecks.length ? 'text-green-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {passwordChecks.length ? 
            <Check className="h-4 w-4 mr-1.5" /> : 
            <X className="h-4 w-4 mr-1.5" />
          }
          At least 8 characters
        </li>
        <li className={`flex items-center text-xs ${passwordChecks.uppercase ? 'text-green-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {passwordChecks.uppercase ? 
            <Check className="h-4 w-4 mr-1.5" /> : 
            <X className="h-4 w-4 mr-1.5" />
          }
          At least one uppercase letter
        </li>
        <li className={`flex items-center text-xs ${passwordChecks.alphanumeric ? 'text-green-500' : 'text-amber-500 dark:text-amber-400'}`}>
          {passwordChecks.alphanumeric ? 
            <Check className="h-4 w-4 mr-1.5" /> : 
            <X className="h-4 w-4 mr-1.5" />
          }
          Alphanumeric characters only
        </li>
      </ul>
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-6">
      <div className="flex items-center">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= index 
                  ? "bg-blue-600 text-white" 
                  : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
              }`}
            >
              {index + 1}
            </div>
            {index < 2 && (
              <div className={`w-12 h-1 ${step > index ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-600"}`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
          <button 
            onClick={() => step > 0 ? setStep(step - 1) : navigate("/login")}
            className="flex items-center text-blue-600 dark:text-blue-400 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-white mb-2">Reset Password</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {step === 0 
              ? "Enter your roll number to start" 
              : step === 1 
              ? "Answer your security question" 
              : "Set a new password"}
          </p>
          
          {renderStepIndicator()}
          
          {step === 0 && (
            <form onSubmit={handleVerifyUser} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Roll Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your roll number"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500">#</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium py-3 rounded-lg transition duration-300 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-70 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            </form>
          )}
          
          {step === 1 && userData && (
            <form onSubmit={handleVerifyAnswer} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Security Question
                </label>
                <div className="bg-zinc-50 dark:bg-zinc-700/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-600">
                  <p className="text-zinc-800 dark:text-zinc-200">{userData.securityQuestion}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Answer
                </label>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your answer"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium py-3 rounded-lg transition duration-300 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-70 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Answer"
                  )}
                </button>
              </div>
            </form>
          )}
          
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg py-3 px-4 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5 text-zinc-500" /> : <Eye className="h-5 w-5 text-zinc-500" />}
                  </div>
                </div>
                <PasswordStrengthIndicator />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium py-3 rounded-lg transition duration-300 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-70 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
              Remember your password?{" "}
              <button 
                onClick={() => navigate("/login")} 
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}