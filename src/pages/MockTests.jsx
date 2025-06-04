import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  Flag, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  BarChart2,
  Trophy,
  RefreshCw,
  Home,
  AlertCircle,
  ChevronLeft,
  LayoutGrid,
  LibraryBig
} from "lucide-react";
import { toast } from "sonner";
import { db, auth } from "../utils/firebase";
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const TEST_DURATION_SECONDS = 30 * 60; // 30 minutes

export default function MockTests() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("intro");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionSet, setQuestionSet] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [isReviewPass, setIsReviewPass] = useState(false);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topicError, setTopicError] = useState("");
  const timerRef = useRef(null);

  // On auth state changed
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (!currentUser) {
        toast.error("To participate in mock test, you need to login/create account first");
        navigate("/login");
        setLoading(false);
        return;
      }
      const email = currentUser.email || "";
      const roll = email.split("@")[0];
      setUser({ uid: currentUser.uid, roll: roll.toLowerCase() });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch topics on component mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const topicsCol = collection(db, "mockTestTopics");
        const topicsSnapshot = await getDocs(topicsCol);
        const topicsData = topicsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        if (topicsData.length === 0) {
          setTopicError("No mock test topics available");
        } else {
          setTopics(topicsData);
        }
      } catch (err) {
        console.error("Error fetching topics:", err);
        toast.error("Failed to load topics");
        setTopicError("Failed to load topics. Please try again later.");
      } finally {
        setLoadingTopics(false);
      }
    };
    
    fetchTopics();
  }, []);

  // Shuffle utility
  function shuffleArray(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Start quiz
  const startQuiz = async () => {
    try {
      // Fetch questions for selected topic
      const questionsCol = collection(db, `mockTestTopics/${selectedTopicId}/questions`);
      const questionsSnapshot = await getDocs(questionsCol);
      
      if (questionsSnapshot.empty) {
        toast.error("No questions available for this topic");
        return;
      }
      
      let questions = questionsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Shuffle and select up to 40 questions
      questions = shuffleArray(questions).slice(0, 40);
      
      // Format for our component
      const formattedQuestions = questions.map((q, idx) => ({
        id: idx,
        question: q.question,
        options: q.options,
        answerIndex: q.correctIndex
      }));
      
      setQuestionSet(formattedQuestions);
      setMarkedQuestions([]);
      setCurrentIndex(0);
      setAnswers({});
      setIsReviewPass(false);
      setScore(0);
      setTimeLeft(TEST_DURATION_SECONDS);
      setScreen("quiz");
    } catch (err) {
      console.error("Error starting quiz:", err);
      toast.error("Failed to start test");
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (screen !== "quiz") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2,"0");
    const s = String(seconds % 60).padStart(2,"0");
    return `${m}:${s}`;
  };

  const selectAnswer = (qid, idx) => {
    setAnswers(a => ({ ...a, [qid]: idx }));
  };

  const markForReview = () => {
    const question = questionSet[currentIndex];
    if (!markedQuestions.some(q => q.id === question.id)) {
      setMarkedQuestions(m => [...m, question]);
    }
    goNext();
  };

  const goNext = () => {
    if (currentIndex < questionSet.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (!isReviewPass && markedQuestions.length > 0) {
      setQuestionSet(markedQuestions);
      setMarkedQuestions([]);
      setCurrentIndex(0);
      setIsReviewPass(true);
    } else {
      handleSubmit();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Submit results
  async function handleSubmit() {
    clearInterval(timerRef.current);
    let correctCount = 0;
    questionSet.forEach(q => {
      if (answers[q.id] === q.answerIndex) correctCount++;
    });
    setScore(correctCount);
    setScreen("result");

    if (user) {
      try {
        const selectedTopic = topics.find(t => t.id === selectedTopicId);
        if (!selectedTopic) {
          throw new Error("Selected topic not found");
        }
        
        // Include rollNumber in lowercase to match Firestore rules
        await setDoc(doc(collection(db, "mocktests")), {
          uid: user.uid,
          rollNumber: user.roll, // Required by Firestore rules
          topicId: selectedTopicId,
          topicName: selectedTopic.name,
          score: correctCount,
          total: questionSet.length,
          percentage: (correctCount / questionSet.length) * 100,
          createdAt: Timestamp.now(),
        });
        
        toast.success("Your result has been saved.");
      } catch (error) {
        console.error("Error saving mock test result:", error);
        toast.error("Failed to save test result.");
      }
    }
  }

  const restartQuiz = () => {
    setScore(0);
    setAnswers({});
    setQuestionSet([]);
    setCurrentIndex(0);
    setMarkedQuestions([]);
    setIsReviewPass(false);
    setTimeLeft(TEST_DURATION_SECONDS);
    setScreen("intro");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading test environment...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100">
      <AnimatePresence mode="wait">
        {/* Intro Screen */}
        {screen === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
          >
            <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xl p-8 max-w-lg w-full text-center">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="text-white" size={48} />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 bg-clip-text text-transparent">
                BCA Mock Tests
              </h1>
              
              <p className="mb-8 text-zinc-600 dark:text-zinc-300">
                Test your knowledge with randomized questions from various topics. 
                Challenge yourself with a 30-minute timed test and track your progress.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: <Clock size={24} />, label: "30 Minutes", desc: "Timed test" },
                  { icon: <BookOpen size={24} />, label: "40 Questions", desc: "Random selection" },
                  { icon: <BarChart2 size={24} />, label: "Track Progress", desc: "Save results" },
                ].map((item, index) => (
                  <div key={index} className="bg-blue-50 dark:bg-zinc-700/30 p-4 rounded-lg">
                    <div className="text-blue-600 dark:text-blue-400 mb-2">{item.icon}</div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setScreen("topicSelection")}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                Start Test
              </button>
            </div>
          </motion.div>
        )}

        {/* Topic Selection Screen */}
        {screen === "topicSelection" && (
          <motion.div
            key="topicSelection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center min-h-screen px-4 py-8 w-full"
          >
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => setScreen("intro")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <LayoutGrid size={24} className="text-blue-600 dark:text-blue-400" />
                  Select Test Topic
                </h2>
                <div></div> {/* Spacer */}
              </div>
              
              {loadingTopics ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 border-t-4 border-blue-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p>Loading topics...</p>
                </div>
              ) : topicError ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full inline-block mb-4">
                    <AlertCircle className="text-orange-600 dark:text-orange-400" size={32} />
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 text-center mb-6">
                    {topicError}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-2 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topics.map(topic => (
                    <motion.div
                      key={topic.id}
                      whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        setScreen("instructions");
                      }}
                      className="bg-white dark:bg-zinc-800 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-700 overflow-hidden cursor-pointer transition-all"
                    >
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 h-32 flex items-center justify-center">
                        <LibraryBig className="text-white" size={48} />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-2">{topic.name}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                          <BookOpen size={16} />
                          <span>{topic.questionCount || "Multiple"} questions</span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300 text-sm line-clamp-2">
                          {topic.description || "Test your knowledge on this subject"}
                        </p>
                        <div className="mt-4 flex justify-end">
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-3 py-1 rounded-full">
                            Start Test
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Instructions Screen */}
        {screen === "instructions" && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
          >
            <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xl p-8 max-w-xl w-full">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setScreen("topicSelection")}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                  Test Instructions
                </h2>
                <div></div> {/* Spacer */}
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mt-1">
                    <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Time Limit</h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      You have <span className="font-semibold">30 minutes</span> to complete all 40 questions. 
                      The timer will be visible throughout the test.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mt-1">
                    <Flag className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Mark for Review</h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Use the <span className="font-semibold">"Mark for Review"</span> button to flag questions 
                      you want to revisit later. You'll get a second pass through these questions.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mt-1">
                    <CheckCircle className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Answering Questions</h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Select one answer per question. You can change your answer at any time 
                      before submitting. Unanswered questions will be marked as incorrect.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mt-1">
                    <BarChart2 className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Results</h3>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Your score and performance will be saved to your dashboard. 
                      You can retake the test as many times as you want.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setScreen("topicSelection")}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 font-medium py-3 px-6 rounded-lg transition"
                >
                  Choose Different Topic
                </button>
                <button
                  onClick={startQuiz}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  Begin Test
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quiz Screen */}
        {screen === "quiz" && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen px-4 py-8"
          >
            <div className="max-w-4xl mx-auto">
              {/* Timer and progress */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full">
                  <Clock size={20} />
                  <span className="font-medium">{formatTime(timeLeft)}</span>
                </div>
                
                <div className="flex-1 w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Progress: {currentIndex + 1} / {questionSet.length}
                    </span>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      {Math.round(((currentIndex + 1) / questionSet.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
                    <motion.div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentIndex + 1) / questionSet.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                </div>
              </div>

              {/* Question */}
              {questionSet.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={questionSet[currentIndex].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-sm font-medium text-blue-600 dark:text-blue-400">
                        Question {currentIndex + 1}
                      </div>
                      {markedQuestions.some(q => q.id === questionSet[currentIndex].id) && (
                        <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full text-sm font-medium text-orange-600 dark:text-orange-400">
                          <Flag size={14} /> Marked
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-6">
                      {questionSet[currentIndex].question}
                    </h3>
                    
                    <div className="space-y-3">
                      {questionSet[currentIndex].options.map((opt, idx) => (
                        <motion.div
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <label 
                            className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition ${
                              answers[questionSet[currentIndex].id] === idx
                                ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                                : "bg-zinc-100 dark:bg-zinc-700/50 border border-transparent hover:border-blue-300"
                            }`}
                          >
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              answers[questionSet[currentIndex].id] === idx
                                ? "border-blue-600 bg-blue-600"
                                : "border-zinc-400 dark:border-zinc-500"
                            }`}>
                              {answers[questionSet[currentIndex].id] === idx && (
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                              )}
                            </div>
                            <input 
                              type="radio" 
                              name={`q_${questionSet[currentIndex].id}`} 
                              checked={answers[questionSet[currentIndex].id] === idx}
                              onChange={() => selectAnswer(questionSet[currentIndex].id, idx)}
                              className="hidden"
                            />
                            <span className="text-md">{opt}</span>
                          </label>
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
                      <button 
                        onClick={goPrev} 
                        disabled={currentIndex === 0} 
                        className={`flex items-center justify-center gap-2 py-3 px-6 rounded-lg transition ${
                          currentIndex === 0 
                            ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-400"
                            : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                        }`}
                      >
                        <ArrowLeft size={18} /> Previous
                      </button>
                      
                      <button 
                        onClick={markForReview} 
                        className="flex items-center justify-center gap-2 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-800/30 text-orange-600 dark:text-orange-400 py-3 px-6 rounded-lg transition"
                      >
                        <Flag size={18} /> Mark for Review
                      </button>
                      
                      <button 
                        onClick={goNext} 
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        {currentIndex === questionSet.length - 1 ? "Submit" : "Next"} 
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}

        {/* Result Screen */}
        {screen === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
          >
            <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Trophy className="text-white" size={48} />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-4">Test Completed!</h2>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6">
                <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 bg-clip-text text-transparent">
                  {((score / questionSet.length) * 100).toFixed(1)}%
                </div>
                <p className="text-lg mb-1">
                  {score} out of {questionSet.length} correct
                </p>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {score >= questionSet.length * 0.8 ? "Excellent work!" : 
                   score >= questionSet.length * 0.6 ? "Good job!" : 
                   "Keep practicing!"}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-zinc-100 dark:bg-zinc-700/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{score}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Correct</div>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-700/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{questionSet.length - score}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Incorrect</div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={restartQuiz} 
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <RefreshCw size={18} /> Take Test Again
                </button>
                
                <button 
                  onClick={() => navigate("/dashboard")} 
                  className="flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 py-3 px-6 rounded-lg transition"
                >
                  <Home size={18} /> Back to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}