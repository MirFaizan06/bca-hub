import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { httpsCallable, getFunctions } from "firebase/functions";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ArrowLeft,
  Smile,
  Paperclip,
  Mic,
  MoreVertical,
  Check,
  CheckCheck,
  User,
  MessageSquare,
} from "lucide-react";

// Helper: Count words
const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;

export default function Chats() {
  const auth = getAuth();
  const db = getFirestore();
  const functions = getFunctions();
  const sendChatMessage = httpsCallable(functions, "sendChatMessage");

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newText, setNewText] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate("/login");
      } else {
        console.log("Authenticated user:", u.email);
        setUser(u);
        // Add user to online list
        setOnlineUsers(prev => [...new Set([...prev, u.displayName || u.email])]);
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  // 2. Realtime Firestore listener
  useEffect(() => {
    const q = query(collection(db, "chat_messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(chatList);

      // Scroll to bottom after messages update
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsubscribe();
  }, [db]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 3. Send message
  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setError("");

    if (!user) {
      setError("You must be logged in to send messages.");
      setIsSending(false);
      return;
    }

    const trimmed = newText.trim();
    if (!trimmed) {
      setError("Cannot send an empty message.");
      setIsSending(false);
      return;
    }

    const wordCount = countWords(trimmed);
    if (wordCount > 500) {
      setError("Message cannot exceed 500 words.");
      setIsSending(false);
      return;
    }

    try {
      await sendChatMessage({ text: trimmed });
      setNewText("");
    } catch (err) {
      console.error("Error sending chat:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // Format time for messages
  const formatTime = (date) => {
    return dayjs(date).format("hh:mm A");
  };

  // Check if message is from current user
  const isCurrentUser = (msg) => {
    return msg.userId === user?.uid;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950">
      {/* Chat Header */}
      <header className="bg-white dark:bg-zinc-800 shadow-sm py-4 px-6 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        
        <div className="text-center">
          <h1 className="text-xl font-bold">Study Chat Room</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white dark:border-zinc-800"></div>
            <div className="bg-blue-100 dark:bg-blue-900/30 w-8 h-8 rounded-full flex items-center justify-center">
              <User size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Display */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 pb-20 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to the Chat Room!</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md text-center">
              This is the beginning of your conversation. Say hello to your classmates and start collaborating!
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${isCurrentUser(msg) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] flex gap-3 ${isCurrentUser(msg) ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.avatarURL ? (
                      <img
                        src={msg.avatarURL}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {msg.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-4 ${
                      isCurrentUser(msg)
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${isCurrentUser(msg) ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                        {msg.name || msg.rollNumber || "Anonymous"}
                      </span>
                      <span className={`text-xs ${isCurrentUser(msg) ? 'text-blue-200' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {formatTime(msg.createdAt?.toDate?.() || new Date())}
                      </span>
                    </div>
                    
                    <p>{msg.text}</p>
                    
                    <div className={`mt-2 flex items-center ${isCurrentUser(msg) ? 'justify-end' : 'justify-start'}`}>
                      {isCurrentUser(msg) && (
                        <div className="text-blue-200 flex items-center gap-1">
                          <CheckCheck size={14} />
                          <span className="text-xs">Delivered</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Online Users Bar */}
      <div className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Online:</span>
          {onlineUsers.map((user, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium whitespace-nowrap">{user}</span>
              {index < onlineUsers.length - 1 && (
                <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Send Form */}
      <div className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 p-4 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm p-3 rounded-lg mb-3"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                className="p-2 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
              >
                <Smile size={20} />
              </button>
              <button
                type="button"
                className="p-2 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
              >
                <Paperclip size={20} />
              </button>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type your message…"
                className="w-full border dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-700 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = (e.target.scrollHeight) + 'px';
                }}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {500 - countWords(newText)}
                </span>
                <button
                  type="button"
                  className="p-1 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
                >
                  <Mic size={18} />
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSending || !newText.trim()}
              className={`p-3 rounded-full flex items-center justify-center transition ${
                isSending || !newText.trim()
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}