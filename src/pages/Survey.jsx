import { useState } from "react";
import { db } from "../utils/firebase";
import { collection, addDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  Hash, 
  Smile, 
  Star, 
  Lightbulb, 
  ThumbsUp, 
  MessageSquare,
  CheckCircle
} from "lucide-react";

export default function Survey() {
  const [form, setForm] = useState({
    rollNumber: "",
    overallSatisfaction: "",
    favoriteFeature: "",
    improvementSuggestion: "",
    recommend: "",
    generalFeedback: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const questions = [
    { name: "rollNumber", label: "Roll Number", icon: <Hash size={18} /> },
    { name: "overallSatisfaction", label: "Overall Satisfaction", icon: <Smile size={18} /> },
    { name: "favoriteFeature", label: "Favorite Feature", icon: <Star size={18} /> },
    { name: "improvementSuggestion", label: "Improvement Suggestion", icon: <Lightbulb size={18} /> },
    { name: "recommend", label: "Recommend to Others", icon: <ThumbsUp size={18} /> },
    { name: "generalFeedback", label: "General Feedback", icon: <MessageSquare size={18} /> },
  ];

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    for (let key of Object.keys(form)) {
      if (!form[key].trim()) {
        setError("Please answer all questions before submitting.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const rollNumber = form.rollNumber.trim() || "Unknown";

      const surveyData = {
        rollNumber: rollNumber,
        overallSatisfaction: form.overallSatisfaction,
        favoriteFeature: form.favoriteFeature,
        improvementSuggestion: form.improvementSuggestion,
        recommend: form.recommend,
        generalFeedback: form.generalFeedback,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "survey_responses"), surveyData);
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (err) {
      console.error("Error submitting survey:", err);
      setError("Failed to submit survey. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
              <CheckCircle className="text-green-600 dark:text-green-400" size={48} />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
          <p className="text-zinc-700 dark:text-zinc-300 mb-6">
            Your feedback has been submitted successfully. We appreciate your time and will use your suggestions to improve BCA Hub.
          </p>
          
          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
          >
            Back to Home
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950 py-16 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 py-6 px-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Star className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-white">Website Survey</h1>
          </div>
          <p className="mt-2 text-indigo-100">
            Help us improve BCA Hub by answering these quick questions
          </p>
        </div>

        <div className="p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
              <motion.div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dynamic Question */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                  {questions[currentQuestion].icon}
                </div>
                <h3 className="text-xl font-semibold">
                  {currentQuestion + 1}. {questions[currentQuestion].label}
                </h3>
              </div>

              {(() => {
                switch (questions[currentQuestion].name) {
                  case "rollNumber":
                    return (
                      <div className="relative">
                        <input
                          id="rollNumber"
                          name="rollNumber"
                          value={form.rollNumber}
                          onChange={handleChange}
                          required
                          className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Enter your roll number"
                        />
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                      </div>
                    );
                  
                  case "overallSatisfaction":
                    return (
                      <div className="grid grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <label 
                            key={num} 
                            className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
                              form.overallSatisfaction === num.toString() 
                                ? "bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500" 
                                : "bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="overallSatisfaction"
                              value={num}
                              checked={form.overallSatisfaction === num.toString()}
                              onChange={handleChange}
                              className="hidden"
                            />
                            <span className="text-xl font-bold">{num}</span>
                            <span className="text-xs mt-1">
                              {num === 1 ? "Poor" : num === 5 ? "Excellent" : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  
                  case "favoriteFeature":
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { value: "Resources", label: "Resources" },
                          { value: "MockTests", label: "Mock Tests" },
                          { value: "Dashboard", label: "Dashboard" },
                          { value: "News", label: "News & Announcements" },
                        ].map((feature) => (
                          <label 
                            key={feature.value}
                            className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                              form.favoriteFeature === feature.value 
                                ? "bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500" 
                                : "bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="favoriteFeature"
                              value={feature.value}
                              checked={form.favoriteFeature === feature.value}
                              onChange={handleChange}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{feature.label}</span>
                          </label>
                        ))}
                      </div>
                    );
                  
                  case "improvementSuggestion":
                    return (
                      <textarea
                        id="improvementSuggestion"
                        name="improvementSuggestion"
                        value={form.improvementSuggestion}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                        placeholder="Your suggestion…"
                      />
                    );
                  
                  case "recommend":
                    return (
                      <div className="flex items-center gap-6">
                        {["Yes", "No"].map((option) => (
                          <label 
                            key={option} 
                            className="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            <input
                              type="radio"
                              name="recommend"
                              value={option}
                              checked={form.recommend === option}
                              onChange={handleChange}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    );
                  
                  case "generalFeedback":
                    return (
                      <textarea
                        id="generalFeedback"
                        name="generalFeedback"
                        value={form.generalFeedback}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="w-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                        placeholder="Share your thoughts..."
                      />
                    );
                  
                  default:
                    return null;
                }
              })()}
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              {currentQuestion > 0 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-medium py-2 px-6 rounded-lg transition"
                >
                  Previous
                </button>
              ) : (
                <div></div>
              )}

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  Next Question
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    "Submit Survey"
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </main>
  );
}