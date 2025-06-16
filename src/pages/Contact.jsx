import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "../utils/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Mail, User, Hash, MessageSquare, BarChart2 } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", rollNumber: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "BCA Hub | Contact";
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const rollNumber = form.rollNumber.trim() || "Unknown";

      await addDoc(collection(db, "contact_requests"), {
        name: form.name,
        rollNumber: rollNumber,
        message: form.message,
        createdAt: new Date(),
      });

      setSubmitted(true);
      toast.success("Your message has been sent successfully!");
      setForm({ name: "", rollNumber: "", message: "" });

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Failed to send your message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950 py-16 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 py-6 px-8">
          <div className="flex items-center gap-4">
            <Mail className="text-white" size={32} />
            <h1 className="text-3xl font-bold text-white">Contact Us</h1>
          </div>
          <p className="mt-2 text-blue-100">
            Have questions or feedback? We'd love to hear from you!
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="flex flex-col">
              <label
                htmlFor="name"
                className="text-sm font-medium mb-2 flex items-center gap-2"
              >
                <User size={16} className="text-blue-600 dark:text-blue-400" />{" "}
                Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Your Name"
                />
                <User
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500"
                  size={18}
                />
              </div>
            </div>

            {/* Roll Number */}
            <div className="flex flex-col">
              <label
                htmlFor="rollNumber"
                className="text-sm font-medium mb-2 flex items-center gap-2"
              >
                <Hash size={16} className="text-blue-600 dark:text-blue-400" />{" "}
                Roll Number
              </label>
              <div className="relative">
                <input
                  id="rollNumber"
                  name="rollNumber"
                  value={form.rollNumber}
                  onChange={handleChange}
                  required
                  className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="e.g., 2401306"
                />
                <Hash
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500"
                  size={18}
                />
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col">
              <label
                htmlFor="message"
                className="text-sm font-medium mb-2 flex items-center gap-2"
              >
                <MessageSquare
                  size={16}
                  className="text-blue-600 dark:text-blue-400"
                />{" "}
                Message
              </label>
              <div className="relative">
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  placeholder="Write your message here..."
                />
                <MessageSquare
                  className="absolute left-3 top-4 text-zinc-500"
                  size={18}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </div>
              ) : (
                "Send Message"
              )}
            </button>

            {submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg border border-green-200 dark:border-green-800 text-center"
              >
                ✅ Your message has been sent successfully!
              </motion.div>
            )}
          </form>

          {/* “Take Survey” Button */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <div className="text-center">
              <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                Help us improve BCA Hub by taking a quick survey
              </p>
              <Link
                to="/survey"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-medium py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                <BarChart2 size={18} />
                Take a Survey
              </Link>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Your feedback helps us create a better experience
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
