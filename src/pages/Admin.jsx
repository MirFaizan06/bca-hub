import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  addDoc,
  getDoc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Trash2,
  Edit,
  Save,
  X,
  Pencil,
  Plus,
  User,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  FileText,
  Bell,
  ChevronDown,
  Clipboard,
  Calendar,
  Download,
  Loader2,
  Search,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const TABS = [
  { key: "approvals", label: "Approvals", icon: <AlertCircle size={18} /> },
  { key: "showUsers", label: "Show Users", icon: <User size={18} /> },
  { key: "responses", label: "Responses", icon: <MessageSquare size={18} /> },
  { key: "logs", label: "Logs", icon: <FileText size={18} /> },
  { key: "cms", label: "CMS", icon: <FileText size={18} /> },
  { key: "announcements", label: "Announcements", icon: <Bell size={18} /> },
  { key: "mockTests", label: "Mock Tests", icon: <Clipboard size={18} /> },
  { key: "attendance", label: "Attendance", icon: <Calendar size={18} /> },
];

// Roll numbers for the class
const ROLL_NUMBERS = Array.from({ length: 40 }, (_, i) => `24013${(i + 1).toString().padStart(2, '0')}`);

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("approvals");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [contactResponses, setContactResponses] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [isAdmin, setIsAdmin] = useState(null);
  const editorRef = useRef(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [mockTestTopics, setMockTestTopics] = useState([]);
  const [selectedMockTestTopic, setSelectedMockTestTopic] = useState(null);
  const [newMockTopicName, setNewMockTopicName] = useState("");
  const [mockQuestions, setMockQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  });
  
  // Attendance states
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [exportLoading, setExportLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [manualRecords, setManualRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      if (isMobileDevice) {
        setShowMobileWarning(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    const user = JSON.parse(stored);
    if (!user.isAdmin) {
      navigate("/dashboard");
      return;
    }
  }, [navigate]);

  // ───────────────────────── APPROVALS TAB ─────────────────────────
  useEffect(() => {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("isApproved", "==", false));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users = [];
      querySnapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPendingUsers(users);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (rollId) => {
    try {
      const userRef = doc(db, "users", rollId);
      await updateDoc(userRef, { isApproved: true });
      await logAction(`Admin approved user ${rollId}`);
      toast.success("User approved successfully");
    } catch (err) {
      console.error("Error approving user:", err);
      toast.error("Failed to approve user");
    }
  };

  const handleReject = async (rollId) => {
    try {
      const userRef = doc(db, "users", rollId);
      await deleteDoc(userRef);
      localStorage.removeItem(rollId);
      toast.success("User rejected successfully");
    } catch (err) {
      console.error("Error rejecting user:", err);
      toast.error("Failed to reject user");
    }
  };

  // ───────────────────────── SHOW USERS TAB ────────────────────────
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersCol = collection(db, "users");
        const userSnapshot = await getDocs(usersCol);

        const users = userSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Unknown",
            email: data.email || "Unknown",
            batch: data.batch || "Not specified",
            isApproved: data.isApproved || false,
            isAdmin: data.isAdmin || false,
            registeredAt: data.registeredAt
              ? data.registeredAt.toDate
                ? data.registeredAt.toDate()
                : new Date(data.registeredAt)
              : null,
          };
        });

        setAllUsers(users);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    };

    if (activeTab === "showUsers") {
      fetchAllUsers();
    }
  }, [activeTab]);

  const handleRoleChange = async (userId, makeAdmin) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isAdmin: makeAdmin });
      await logAction(
        `Changed role for ${userId} to ${makeAdmin ? "Admin" : "User"}`
      );

      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: makeAdmin } : u))
      );

      toast.success(
        `User role updated to ${makeAdmin ? "Admin" : "Regular User"}`
      );
    } catch (err) {
      console.error("Error updating user role:", err);
      toast.error("Failed to update user role");
    }
  };

  // ───────────────────────── RESPONSES TAB ─────────────────────────
  useEffect(() => {
    const fetchResponses = async () => {
      setLoadingResponses(true);
      try {
        // Contact responses
        const contactCol = collection(db, "contact_requests");
        const contactSnapshot = await getDocs(contactCol);

        const contactData = contactSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000)
            : new Date();

          return {
            id: docSnap.id,
            name: data.name || "Unknown",
            email: data.email || "Unknown",
            message: data.message || "",
            rollNumber: data.rollNumber || "Unknown",
            createdAt,
          };
        });

        setContactResponses(contactData);

        // Survey responses
        const surveyCol = collection(db, "survey_responses");
        const surveySnapshot = await getDocs(surveyCol);

        const surveyData = surveySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000)
            : new Date();

          return {
            id: docSnap.id,
            rollNumber: data.rollNumber || "Unknown",
            overallSatisfaction: data.overallSatisfaction || "N/A",
            favoriteFeature: data.favoriteFeature || "N/A",
            improvementSuggestion: data.improvementSuggestion || "N/A",
            recommend: data.recommend || "N/A",
            generalFeedback: data.generalFeedback || "N/A",
            createdAt,
          };
        });

        setSurveyResponses(surveyData);
      } catch (err) {
        console.error("Error fetching responses:", err);
        toast.error("Failed to load responses");
      } finally {
        setLoadingResponses(false);
      }
    };

    if (activeTab === "responses") {
      fetchResponses();
    }
  }, [activeTab]);

  const handleDeleteContact = async (docId) => {
    try {
      await deleteDoc(doc(db, "contact_requests", docId));
      setContactResponses((prev) => prev.filter((resp) => resp.id !== docId));
      toast.success("Contact response deleted");
    } catch (err) {
      console.error("Error deleting contact response:", err);
      toast.error("Failed to delete contact response");
    }
  };

  const handleDeleteSurvey = async (docId) => {
    try {
      await deleteDoc(doc(db, "survey_responses", docId));
      setSurveyResponses((prev) => prev.filter((resp) => resp.id !== docId));
      toast.success("Survey response deleted");
    } catch (err) {
      console.error("Error deleting survey response:", err);
      toast.error("Failed to delete survey response");
    }
  };

  // ───────────────────────── LOGS TAB ─────────────────────────────
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logsCol = collection(db, "logs");
        const logSnapshot = await getDocs(logsCol);

        const logData = logSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const timestamp = data.timestamp?.toDate
            ? data.timestamp.toDate()
            : data.timestamp?.seconds
            ? new Date(data.timestamp.seconds * 1000)
            : new Date();

          return {
            id: docSnap.id,
            message: data.message || "",
            timestamp,
          };
        });

        setLogs(logData);
      } catch (err) {
        console.error("Error fetching logs:", err);
        toast.error("Failed to load logs");
      }
    };

    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  const handleDeleteLog = async (logId) => {
    try {
      await deleteDoc(doc(db, "logs", logId));
      setLogs(prev => prev.filter(log => log.id !== logId));
      toast.success("Log deleted successfully");
    } catch (err) {
      console.error("Error deleting log:", err);
      toast.error("Failed to delete log");
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to delete all logs? This cannot be undone.")) {
      return;
    }
    
    try {
      const batch = writeBatch(db);
      const logsCol = collection(db, "logs");
      const logSnapshot = await getDocs(logsCol);
      
      logSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setLogs([]);
      toast.success("All logs deleted successfully");
    } catch (err) {
      console.error("Error clearing logs:", err);
      toast.error("Failed to clear logs");
    }
  };

  // ───────────────────────── ANNOUNCEMENTS TAB ────────────────────
  useEffect(() => {
    const announcementsCol = collection(db, "announcements");
    const q = query(announcementsCol);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000)
          : new Date();

        list.push({
          id: docSnap.id,
          title: data.title || "",
          description: data.description || "",
          createdAt,
        });
      });
      setAnnouncements(list);
    });
    return () => unsubscribe();
  }, []);

  // ───────────────────────── LOGGING ACTIONS ──────────────────────
  const logAction = async (message) => {
    try {
      const logRef = collection(db, "logs");
      await addDoc(logRef, {
        message,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to log action:", err);
    }
  };

  // ───────────────────────── CMS TAB ──────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error("User not authenticated.");
        setIsAdmin(false);
        return;
      }

      try {
        const email = user.email || "";
        const roll = email.split("@")[0];
        const userDocRef = doc(db, "users", roll);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setIsAdmin(!!userDocSnap.data().isAdmin);
        } else {
          toast.error("User record not found.");
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to fetch user data");
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const resourcesCol = collection(db, "resources");
        const snapshot = await getDocs(resourcesCol);

        const arr = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            topic: data.topic || "",
            semester: data.semester || "",
            content: data.content || "",
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(),
          };
        });

        setResources(arr);
        if (arr.length) {
          setSelectedTopicId(arr[0].id);
          setHtmlContent(arr[0].content);
        }
      } catch (err) {
        console.error("Failed to load resources:", err);
        toast.error("Failed to load resources");
      }
    };

    if (activeTab === "cms") {
      loadResources();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedTopicId) return;
    const resource = resources.find((r) => r.id === selectedTopicId);
    setHtmlContent(resource?.content || "");
    setIsEditing(false);
  }, [selectedTopicId, resources]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      editorRef.current.focus();
    }
  }, [isEditing]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    if (!selectedTopicId) return;
    if (!htmlContent.trim()) {
      toast.error("Content cannot be empty.");
      return;
    }

    try {
      const resourceRef = doc(db, "resources", selectedTopicId);
      await updateDoc(resourceRef, { content: htmlContent });

      setResources((prev) =>
        prev.map((r) =>
          r.id === selectedTopicId ? { ...r, content: htmlContent } : r
        )
      );

      setIsEditing(false);
      toast.success("Content saved!");
    } catch (err) {
      console.error("Error saving resource:", err);
      toast.error("Failed to save content");
    }
  };

  const handleAddTopic = async () => {
    const trimmedName = newTopicName.trim();
    const trimmedSem = newSemester.trim();

    if (!trimmedName || !trimmedSem) {
      toast.error("Topic name and semester are required.");
      return;
    }

    if (
      resources.some(
        (r) =>
          r.topic.toLowerCase() === trimmedName.toLowerCase() &&
          r.semester === trimmedSem
      )
    ) {
      toast.error("Topic already exists for this semester.");
      return;
    }

    try {
      const colRef = collection(db, "resources");
      const docRef = await addDoc(colRef, {
        topic: trimmedName,
        semester: trimmedSem,
        content: "",
        createdAt: new Date(),
      });

      const newRes = {
        id: docRef.id,
        topic: trimmedName,
        semester: trimmedSem,
        content: "",
        createdAt: new Date(),
      };

      setResources((prev) => [...prev, newRes]);
      setNewTopicName("");
      setNewSemester("");
      setSelectedTopicId(docRef.id);
      setHtmlContent("");
      setIsEditing(true);
      toast.success("New topic added!");
    } catch (err) {
      console.error("Error adding topic:", err);
      toast.error("Failed to add topic");
    }
  };

  const handleDeleteTopic = async () => {
    if (!selectedTopicId) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this topic? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "resources", selectedTopicId));
      const filtered = resources.filter((r) => r.id !== selectedTopicId);

      setResources(filtered);
      if (filtered.length) {
        setSelectedTopicId(filtered[0].id);
        setHtmlContent(filtered[0].content || "");
      } else {
        setSelectedTopicId(null);
        setHtmlContent("");
      }

      toast.success("Topic deleted.");
    } catch (err) {
      console.error("Error deleting topic:", err);
      toast.error("Failed to delete topic");
    }
  };

  // -------------- MOCK TESTS ----------------------------
  useEffect(() => {
    if (activeTab === "mockTests") {
      const fetchTopics = async () => {
        const topicsCol = collection(db, "mockTestTopics");
        const topicsSnapshot = await getDocs(topicsCol);
        const topics = topicsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMockTestTopics(topics);
      };
      fetchTopics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "mockTests" && selectedMockTestTopic) {
      const fetchQuestions = async () => {
        const questionsCol = collection(
          db,
          `mockTestTopics/${selectedMockTestTopic}/questions`
        );
        const questionsSnapshot = await getDocs(questionsCol);
        const questions = questionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMockQuestions(questions);
      };
      fetchQuestions();
    }
  }, [activeTab, selectedMockTestTopic]);

  const addMockTestTopic = async () => {
    if (!newMockTopicName.trim()) {
      toast.error("Topic name is required");
      return;
    }

    try {
      const topicsCol = collection(db, "mockTestTopics");
      const docRef = await addDoc(topicsCol, {
        name: newMockTopicName.trim(),
        createdAt: new Date(),
      });

      setMockTestTopics((prev) => [
        ...prev,
        { id: docRef.id, name: newMockTopicName.trim() },
      ]);
      setNewMockTopicName("");
      toast.success("Topic added successfully!");
    } catch (err) {
      console.error("Error adding topic:", err);
      toast.error("Failed to add topic");
    }
  };

  const deleteMockTestTopic = async (topicId) => {
    if (!window.confirm("Are you sure you want to delete this topic and all its questions?")) {
      return;
    }
    
    try {
      // Delete all questions first
      const questionsCol = collection(db, `mockTestTopics/${topicId}/questions`);
      const questionsSnapshot = await getDocs(questionsCol);
      
      const deletePromises = questionsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      // Delete the topic
      await deleteDoc(doc(db, "mockTestTopics", topicId));
      
      // Update state
      setMockTestTopics(prev => prev.filter(t => t.id !== topicId));
      
      if (selectedMockTestTopic === topicId) {
        setSelectedMockTestTopic(null);
        setMockQuestions([]);
      }
      
      toast.success("Topic and all questions deleted successfully");
    } catch (err) {
      console.error("Error deleting topic:", err);
      toast.error("Failed to delete topic");
    }
  };

  const addMockTestQuestion = async () => {
    if (
      !newQuestion.text.trim() ||
      newQuestion.options.some((opt) => !opt.trim())
    ) {
      toast.error("Question text and all options are required");
      return;
    }

    try {
      const questionsCol = collection(
        db,
        `mockTestTopics/${selectedMockTestTopic}/questions`
      );
      const docRef = await addDoc(questionsCol, {
        question: newQuestion.text.trim(),
        options: newQuestion.options.map((opt) => opt.trim()),
        correctIndex: newQuestion.correctIndex,
        createdAt: new Date(),
      });

      setMockQuestions((prev) => [
        ...prev,
        {
          id: docRef.id,
          ...newQuestion,
        },
      ]);

      setNewQuestion({
        text: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      });

      toast.success("Question added successfully!");
    } catch (err) {
      console.error("Error adding question:", err);
      toast.error("Failed to add question");
    }
  };

  const deleteMockQuestion = async (questionId) => {
    try {
      await deleteDoc(
        doc(db, `mockTestTopics/${selectedMockTestTopic}/questions`, questionId)
      );
      setMockQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast.success("Question deleted!");
    } catch (err) {
      console.error("Error deleting question:", err);
      toast.error("Failed to delete question");
    }
  };

  // ========= ATTENDANCE TAB =========
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const holidaysCol = collection(db, "holidays");
        const snapshot = await getDocs(holidaysCol);
        const holidayList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHolidays(holidayList);
      } catch (err) {
        console.error("Error fetching holidays:", err);
        toast.error("Failed to load holidays");
      }
    };

    if (activeTab === "attendance") {
      fetchAttendance();
      fetchHolidays();
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance();
    }
  }, [manualRecords]);

  const fetchAttendance = async () => {
    try {
      const q = query(
        collection(db, "attendanceRecords"),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const records = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        records.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          date: data.date,
          timestamp: data.timestamp?.toDate() || new Date(),
          deviceId: data.deviceId
        });
      });
      
      // Combine with manual records
      const combinedRecords = [...records, ...manualRecords];
      
      // Filter by search text if exists
      const filteredRecords = filterText 
        ? combinedRecords.filter(record => 
            record.userId.includes(filterText) || 
            (record.name && record.name.toLowerCase().includes(filterText.toLowerCase())))
        : combinedRecords;
      
      setAttendanceRecords(filteredRecords);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      toast.error("Failed to load attendance records");
    }
  };

  const calculateAttendanceStats = () => {
    if (attendanceRecords.length === 0) return { present: 0, absent: 0, percentage: 0 };
    
    // Get unique dates in the range
    const datesInRange = [];
    let currentDate = dayjs(startDate);
    const endDateObj = dayjs(endDate);
    
    while (currentDate.isBefore(endDateObj) || currentDate.isSame(endDateObj)) {
      // Skip Sundays and holidays
      const dayOfWeek = currentDate.day();
      const dateStr = currentDate.format('YYYY-MM-DD');
      const isHoliday = holidays.some(h => h.date === dateStr);
      
      if (dayOfWeek !== 0 && !isHoliday) {
        datesInRange.push(dateStr);
      }
      currentDate = currentDate.add(1, 'day');
    }
    
    // Count attendance per student
    const studentStats = {};
    ROLL_NUMBERS.forEach(roll => {
      studentStats[roll] = { present: 0, total: datesInRange.length };
    });
    
    attendanceRecords.forEach(record => {
      if (studentStats[record.userId]) {
        studentStats[record.userId].present++;
      }
    });
    
    // Calculate overall stats
    let totalPresent = 0;
    let totalPossible = 0;
    
    Object.values(studentStats).forEach(stats => {
      totalPresent += stats.present;
      totalPossible += stats.total;
    });
    
    const percentage = totalPossible > 0 
      ? Math.round((totalPresent / totalPossible) * 100) 
      : 0;
    
    return {
      present: totalPresent,
      absent: totalPossible - totalPresent,
      percentage
    };
  };

  const stats = calculateAttendanceStats();

  const handleAddHoliday = async () => {
    if (!newHoliday) {
      toast.error("Please enter a date");
      return;
    }
    
    try {
      const holidayRef = await addDoc(collection(db, "holidays"), {
        date: newHoliday,
        createdAt: serverTimestamp()
      });
      
      setHolidays(prev => [...prev, { id: holidayRef.id, date: newHoliday }]);
      setNewHoliday("");
      toast.success("Holiday added successfully");
    } catch (err) {
      console.error("Error adding holiday:", err);
      toast.error("Failed to add holiday");
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      await deleteDoc(doc(db, "holidays", holidayId));
      setHolidays(prev => prev.filter(h => h.id !== holidayId));
      toast.success("Holiday removed successfully");
    } catch (err) {
      console.error("Error deleting holiday:", err);
      toast.error("Failed to delete holiday");
    }
  };

  const handleMarkAttendance = (userId, name, date, isPresent) => {
    if (isPresent) {
      // Add manual record
      setManualRecords(prev => [
        ...prev,
        {
          id: `manual-${Date.now()}`,
          userId,
          name,
          date,
          timestamp: new Date(),
          deviceId: "manual"
        }
      ]);
      toast.success(`Marked ${userId} as present for ${date}`);
    } else {
      // Remove manual record if exists
      setManualRecords(prev => prev.filter(record => 
        !(record.userId === userId && record.date === date)
      ));
      toast.success(`Marked ${userId} as absent for ${date}`);
    }
  };

  const exportToExcel = () => {
    setExportLoading(true);
    
    try {
      // Create a set of all unique dates in the range
      const uniqueDates = [...new Set(attendanceRecords.map(r => r.date))].sort();
      
      // Create a map of student attendance
      const studentAttendance = {};
      ROLL_NUMBERS.forEach(roll => {
        studentAttendance[roll] = {};
        uniqueDates.forEach(date => {
          studentAttendance[roll][date] = "Absent";
        });
      });
      
      // Mark present students
      attendanceRecords.forEach(record => {
        if (studentAttendance[record.userId]) {
          studentAttendance[record.userId][record.date] = "Present";
        }
      });
      
      // Format data for Excel
      const formattedData = ROLL_NUMBERS.map(roll => {
        const row = { "Roll Number": roll };
        uniqueDates.forEach(date => {
          row[date] = studentAttendance[roll][date] || "Absent";
        });
        return row;
      });
      
      // Create worksheet and workbook
      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      
      // Generate file name with date range
      const start = dayjs(startDate).format('DD-MMM');
      const end = dayjs(endDate).format('DD-MMM');
      const fileName = `attendance-${start}-to-${end}.xlsx`;
      
      // Export file
      XLSX.writeFile(wb, fileName);
      toast.success("Attendance exported successfully");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export attendance");
    } finally {
      setExportLoading(false);
    }
  };

    return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-800 dark:text-zinc-100 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {showMobileWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200">Mobile Device Detected</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                For a better experience, we recommend using the Admin Panel on a PC or desktop.
                Some features may not work properly on mobile devices.
              </p>
            </div>
            <button 
              onClick={() => setShowMobileWarning(false)}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 ml-auto"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Manage users, content, and platform settings
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {TABS.map(({ key, label, icon }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 py-2 px-3 md:px-4 font-medium rounded-lg transition ${
                activeTab === key
                  ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 shadow-sm"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-6">
            {/* ========= Approvals Tab ========= */}
            {activeTab === "approvals" && (
              <motion.div
                key="approvalsTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                  <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    Pending Approvals
                  </h2>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                      <Check
                        className="text-blue-600 dark:text-blue-400"
                        size={32}
                      />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      No pending approvals at the moment
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingUsers.map((user) => (
                      <motion.div
                        key={user.id}
                        variants={slideUp}
                        className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-full text-white">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">
                              {user.name || "Unknown"}
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                              {user.id}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                          <p>
                            Registered:{" "}
                            {user.registeredAt
                              ? dayjs(user.registeredAt).format("DD MMM YYYY")
                              : "Unknown"}
                          </p>
                          <p>Batch: {user.batch || "Not specified"}</p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white py-2 px-4 rounded-lg transition-all"
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white py-2 px-4 rounded-lg transition-all"
                          >
                            <Trash2 size={16} /> Reject
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========= Show Users Tab ========= */}
            {activeTab === "showUsers" && (
              <motion.div
                key="showUsersTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                  <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    User Management
                  </h2>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-t-4 border-blue-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg">Loading users...</p>
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                      <User
                        className="text-blue-600 dark:text-blue-400"
                        size={32}
                      />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      No users found in the system
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-700/50">
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-l-xl">
                            Roll
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Batch
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Status
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Role
                          </th>
                          <th className="py-3 px-4 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-r-xl">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/10"
                          >
                            <td className="py-3 px-4">{user.id}</td>
                            <td className="py-3 px-4 font-medium">
                              {user.name || "Unknown"}
                            </td>
                            <td className="py-3 px-4">
                              {user.batch || "Not specified"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.isApproved
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                }`}
                              >
                                {user.isApproved ? "Approved" : "Pending"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.isAdmin
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                    : "bg-zinc-100 dark:bg-zinc-700/30 text-zinc-700 dark:text-zinc-400"
                                }`}
                              >
                                {user.isAdmin ? "Admin" : "User"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    handleRoleChange(user.id, true)
                                  }
                                  className={`px-3 py-1 rounded-lg text-sm ${
                                    user.isAdmin
                                      ? "bg-blue-600 text-white"
                                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/30"
                                  }`}
                                  disabled={user.isAdmin}
                                >
                                  Make Admin
                                </button>
                                <button
                                  onClick={() =>
                                    handleRoleChange(user.id, false)
                                  }
                                  className={`px-3 py-1 rounded-lg text-sm ${
                                    !user.isAdmin
                                      ? "bg-zinc-600 text-white"
                                      : "bg-zinc-100 dark:bg-zinc-700/30 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600/30"
                                  }`}
                                  disabled={!user.isAdmin}
                                >
                                  Revoke Admin
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* ========= Responses Tab ========= */}
            {activeTab === "responses" && (
              <motion.div
                key="responsesTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      Contact Responses
                    </h2>
                  </div>

                  {loadingResponses ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 border-t-4 border-blue-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-lg">Loading responses...</p>
                    </div>
                  ) : contactResponses.length === 0 ? (
                    <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                        <MessageSquare
                          className="text-blue-600 dark:text-blue-400"
                          size={32}
                        />
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        No contact responses found
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {contactResponses.map((response) => (
                        <motion.div
                          key={response.id}
                          variants={slideUp}
                          className="relative bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                        >
                          <button
                            onClick={() => handleDeleteContact(response.id)}
                            className="absolute top-4 right-4 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            <Trash2 size={18} />
                          </button>

                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                              <User
                                className="text-blue-600 dark:text-blue-400"
                                size={20}
                              />
                            </div>
                            <div>
                              <h3 className="font-bold">{response.name}</h3>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {response.email}
                              </p>
                            </div>
                          </div>

                          <p className="mb-4 text-zinc-700 dark:text-zinc-300">
                            {response.message}
                          </p>

                          <div className="flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-400">
                            <span>Roll: {response.rollNumber}</span>
                            <span>
                              {dayjs(response.createdAt).format(
                                "DD MMM, hh:mm A"
                              )}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      Survey Responses
                    </h2>
                  </div>

                  {loadingResponses ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 border-t-4 border-blue-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-lg">Loading responses...</p>
                    </div>
                  ) : surveyResponses.length === 0 ? (
                    <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                        <Clipboard
                          className="text-blue-600 dark:text-blue-400"
                          size={32}
                        />
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        No survey responses found
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {surveyResponses.map((response) => (
                        <motion.div
                          key={response.id}
                          variants={slideUp}
                          className="relative bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                        >
                          <button
                            onClick={() => handleDeleteSurvey(response.id)}
                            className="absolute top-4 right-4 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            <Trash2 size={18} />
                          </button>

                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold">
                                Roll: {response.rollNumber}
                              </h3>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Submitted:{" "}
                                {dayjs(response.createdAt).format(
                                  "DD MMM, hh:mm A"
                                )}
                              </p>
                            </div>
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-1 rounded-full text-sm">
                              {response.overallSatisfaction}/5
                            </div>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                                Favorite Feature:
                              </p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                {response.favoriteFeature}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                                Suggestions:
                              </p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                {response.improvementSuggestion}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                                Feedback:
                              </p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                {response.generalFeedback}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========= Logs Tab ========= */}
            {activeTab === "logs" && (
              <motion.div
                key="logsTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      System Logs
                    </h2>
                  </div>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    <Trash2 size={16} /> Clear All Logs
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                      <FileText
                        className="text-blue-600 dark:text-blue-400"
                        size={32}
                      />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      No logs available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <motion.div
                        key={log.id}
                        variants={slideUp}
                        className="relative bg-zinc-50 dark:bg-zinc-900/30 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                      >
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="absolute top-4 right-4 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        <p className="text-zinc-700 dark:text-zinc-300 mb-2">
                          {log.message}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {log.timestamp ? dayjs(log.timestamp).format("DD MMM YYYY, hh:mm A") : "Invalid Date"}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========= CMS Tab ========= */}
            {activeTab === "cms" && (
              <motion.div
                key="cmsTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col lg:flex-row gap-6 py-4"
              >
                {/* Sidebar: all topics */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lg:w-64 flex-shrink-0"
                >
                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                      <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        Resources
                      </h2>
                    </div>

                    <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                      {resources.map(({ id, topic, semester }) => (
                        <li key={id}>
                          <button
                            className={`w-full text-left px-3 py-2 rounded-lg transition ${
                              id === selectedTopicId
                                ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-700/30"
                            }`}
                            onClick={() => setSelectedTopicId(id)}
                          >
                            <span className="font-medium">{topic}</span>
                            <span className="text-xs block opacity-80">
                              Sem {semester}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 space-y-3">
                      <input
                        type="text"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        placeholder="New Topic Name"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={newSemester}
                        onChange={(e) => setNewSemester(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select semester</option>
                        {[1, 2, 3, 4, 5, 6].map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddTopic}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Add Topic
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Main editor */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
                >
                  {isAdmin === null ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 border-t-4 border-blue-600 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-lg">Loading user data...</p>
                    </div>
                  ) : !isAdmin ? (
                    <div className="text-center py-8">
                      <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full inline-block mb-4">
                        <X
                          className="text-red-600 dark:text-red-400"
                          size={32}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                        Access Denied
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        You don't have permission to access this section
                      </p>
                    </div>
                  ) : !selectedTopicId ? (
                    <div className="text-center py-8">
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                        <FileText
                          className="text-blue-600 dark:text-blue-400"
                          size={32}
                        />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Select a Topic</h3>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        Choose a topic from the sidebar to view or edit its
                        content
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                        <div>
                          <h2 className="text-xl font-bold">
                            {
                              resources.find((r) => r.id === selectedTopicId)
                                ?.topic
                            }
                          </h2>
                          <p className="text-zinc-600 dark:text-zinc-400">
                            Semester{" "}
                            {
                              resources.find((r) => r.id === selectedTopicId)
                                ?.semester
                            }
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              if (isEditing) {
                                handleSave();
                              } else {
                                setIsEditing(true);
                              }
                            }}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg"
                          >
                            {isEditing ? (
                              <>
                                <Save size={16} /> Save
                              </>
                            ) : (
                              <>
                                <Pencil size={16} /> Edit
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleDeleteTopic}
                            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white px-4 py-2 rounded-lg"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-4">
                          {/* Floating Toolbar */}
                          <div className="sticky top-0 z-10 flex flex-wrap gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-md">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => execCommand("bold")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600 font-bold"
                                title="Bold"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => execCommand("italic")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600 italic"
                                title="Italic"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => execCommand("underline")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600 underline"
                                title="Underline"
                              >
                                U
                              </button>
                            </div>
                            
                            <div className="flex gap-2">
                              <select
                                onChange={(e) => execCommand("fontSize", e.target.value)}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Font Size"
                              >
                                <option value="">Font Size</option>
                                <option value="1">8pt</option>
                                <option value="2">10pt</option>
                                <option value="3">12pt</option>
                                <option value="4">14pt</option>
                                <option value="5">18pt</option>
                                <option value="6">24pt</option>
                                <option value="7">36pt</option>
                              </select>
                              
                              <select
                                onChange={(e) => execCommand("formatBlock", e.target.value)}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Paragraph Format"
                              >
                                <option value="p">Paragraph</option>
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                                <option value="h4">Heading 4</option>
                                <option value="h5">Heading 5</option>
                                <option value="h6">Heading 6</option>
                              </select>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => execCommand("insertUnorderedList")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Bullet List"
                              >
                                • List
                              </button>
                              <button
                                type="button"
                                onClick={() => execCommand("insertOrderedList")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Numbered List"
                              >
                                1. List
                              </button>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => execCommand("justifyLeft")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Align Left"
                              >
                                L
                              </button>
                              <button
                                type="button"
                                onClick={() => execCommand("justifyCenter")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Center"
                              >
                                C
                              </button>
                              <button
                                type="button"
                                onClick={() => execCommand("justifyRight")}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                title="Align Right"
                              >
                                R
                              </button>
                            </div>
                          </div>

                          {/* contentEditable region */}
                          <div
                            ref={editorRef}
                            contentEditable={true}
                            className="min-h-[300px] p-4 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg"
                            onInput={() => {
                              if (editorRef.current) {
                                setHtmlContent(editorRef.current.innerHTML);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        // Read-only display
                        <div
                          className="prose max-w-none dark:prose-invert bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-300 dark:border-zinc-600"
                          dangerouslySetInnerHTML={{
                            __html:
                              htmlContent || "<p>No content available</p>",
                          }}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ========= Announcements Tab ========= */}
            {activeTab === "announcements" && (
              <motion.div
                key="announcementsTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Create New Announcement */}
                <motion.div
                  variants={slideUp}
                  className="bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      Create Announcement
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Announcement Title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={newSemester}
                        onChange={(e) => setNewSemester(e.target.value)}
                        className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Announcement Description"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!newTopicName.trim() || !newSemester.trim()) {
                          toast.error("Title and description cannot be empty.");
                          return;
                        }
                        try {
                          const announcementsCol = collection(
                            db,
                            "announcements"
                          );
                          await addDoc(announcementsCol, {
                            title: newTopicName.trim(),
                            description: newSemester.trim(),
                            createdAt: new Date(),
                          });
                          setNewTopicName("");
                          setNewSemester("");
                          await logAction(
                            `Announcement created: ${newTopicName.trim()}`
                          );
                          toast.success("Announcement created successfully!");
                        } catch (err) {
                          console.error("Error creating announcement:", err);
                          toast.error("Failed to create announcement");
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 px-6 rounded-lg"
                    >
                      Create Announcement
                    </button>
                  </div>
                </motion.div>

                {/* Existing Announcements */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      Manage Announcements
                    </h2>
                  </div>

                  {announcements.length === 0 ? (
                    <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                        <Bell
                          className="text-blue-600 dark:text-blue-400"
                          size={32}
                        />
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        No announcements found
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {announcements.map((ann) => (
                        <motion.div
                          key={ann.id}
                          variants={slideUp}
                          className="relative bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await deleteDoc(
                                    doc(db, "announcements", ann.id)
                                  );
                                  await logAction(
                                    `Announcement deleted: ${ann.title}`
                                  );
                                  toast.success("Announcement deleted");
                                } catch (err) {
                                  console.error(
                                    "Error deleting announcement:",
                                    err
                                  );
                                  toast.error("Failed to delete announcement");
                                }
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {editId === ann.id ? (
                            <>
                              {/* Editing Mode */}
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) =>
                                      setEditTitle(e.target.value)
                                    }
                                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={editDescription}
                                    onChange={(e) =>
                                      setEditDescription(e.target.value)
                                    }
                                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={async () => {
                                      if (
                                        !editTitle.trim() ||
                                        !editDescription.trim()
                                      ) {
                                        toast.error(
                                          "Title and description cannot be empty."
                                        );
                                        return;
                                      }
                                      try {
                                        const annRef = doc(
                                          db,
                                          "announcements",
                                          editId
                                        );
                                        await updateDoc(annRef, {
                                          title: editTitle.trim(),
                                          description: editDescription.trim(),
                                        });
                                        await logAction(
                                          `Announcement updated: ${editTitle.trim()}`
                                        );
                                        setEditId(null);
                                        setEditTitle("");
                                        setEditDescription("");
                                        toast.success("Announcement updated!");
                                      } catch (err) {
                                        console.error(
                                          "Error updating announcement:",
                                          err
                                        );
                                        toast.error(
                                          "Failed to update announcement"
                                        );
                                      }
                                    }}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-2 px-4 rounded-lg"
                                  >
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditId(null);
                                      setEditTitle("");
                                      setEditDescription("");
                                    }}
                                    className="flex-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 py-2 px-4 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Display Mode */}
                              <div className="mb-4">
                                <h3 className="text-lg font-bold">
                                  {ann.title}
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                  {dayjs(ann.createdAt).format(
                                    "DD MMM YYYY, hh:mm A"
                                  )}
                                </p>
                              </div>
                              <p className="text-zinc-700 dark:text-zinc-300 mb-6">
                                {ann.description}
                              </p>
                              <button
                                onClick={() => {
                                  setEditId(ann.id);
                                  setEditTitle(ann.title);
                                  setEditDescription(ann.description);
                                }}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 px-4 rounded-lg"
                              >
                                Edit Announcement
                              </button>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========= MOCK TESTS TAB ========= */}
            {activeTab === "mockTests" && (
              <motion.div
                key="mockTestsTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                  <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    Mock Test Management
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Topic Management */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Topics</h3>
                    </div>

                    {/* Add Topic Form */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newMockTopicName}
                        onChange={(e) => setNewMockTopicName(e.target.value)}
                        placeholder="New topic name"
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      />
                      <button
                        onClick={addMockTestTopic}
                        className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 rounded-lg"
                      >
                        Add
                      </button>
                    </div>

                    {/* Topics List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {mockTestTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className={`flex justify-between items-center p-3 rounded-lg transition ${
                            selectedMockTestTopic === topic.id
                              ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white"
                              : "bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          }`}
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => setSelectedMockTestTopic(topic.id)}
                          >
                            <div className="font-medium">{topic.name}</div>
                            <div className="text-sm opacity-80">
                              {topic.createdAt
                                ? dayjs(topic.createdAt.toDate()).format(
                                    "DD MMM YYYY"
                                  )
                                : "Unknown date"}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteMockTestTopic(topic.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question Management */}
                  <div className="lg:col-span-2 bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    {selectedMockTestTopic ? (
                      <>
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold">
                            Questions for:{" "}
                            {
                              mockTestTopics.find(
                                (t) => t.id === selectedMockTestTopic
                              )?.name
                            }
                          </h3>
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                            {mockQuestions.length} questions
                          </span>
                        </div>

                        {/* Add Question Form */}
                        <div className="mb-8">
                          <h4 className="font-medium mb-3">Add New Question</h4>
                          <div className="space-y-4">
                            <textarea
                              value={newQuestion.text}
                              onChange={(e) =>
                                setNewQuestion((prev) => ({
                                  ...prev,
                                  text: e.target.value,
                                }))
                              }
                              placeholder="Enter the question"
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            />

                            {newQuestion.options.map((option, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3"
                              >
                                <input
                                  type="radio"
                                  name="correctOption"
                                  checked={newQuestion.correctIndex === idx}
                                  onChange={() =>
                                    setNewQuestion((prev) => ({
                                      ...prev,
                                      correctIndex: idx,
                                    }))
                                  }
                                  className="w-5 h-5"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...newQuestion.options];
                                    newOptions[idx] = e.target.value;
                                    setNewQuestion((prev) => ({
                                      ...prev,
                                      options: newOptions,
                                    }));
                                  }}
                                  placeholder={`Option ${idx + 1}`}
                                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                />
                              </div>
                            ))}

                            <button
                              onClick={addMockTestQuestion}
                              className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white py-2 px-4 rounded-lg"
                            >
                              Add Question
                            </button>
                          </div>
                        </div>

                        {/* Existing Questions */}
                        <div>
                          <h4 className="font-medium mb-3">
                            Existing Questions
                          </h4>
                          <div className="space-y-4">
                            {mockQuestions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium">
                                    Q{idx + 1}: {q.question}
                                  </div>
                                  <button
                                    onClick={() => deleteMockQuestion(q.id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                                <div className="space-y-2 ml-6">
                                  {q.options.map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className="flex items-center gap-2"
                                    >
                                      {q.correctIndex === optIdx ? (
                                        <CheckCircle
                                          className="text-green-600 dark:text-green-400"
                                          size={16}
                                        />
                                      ) : (
                                        <div className="w-4 h-4 border border-zinc-400 dark:border-zinc-500 rounded-full"></div>
                                      )}
                                      <span>{opt}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full inline-block mb-4">
                          <Clipboard
                            className="text-blue-600 dark:text-blue-400"
                            size={32}
                          />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300">
                          Select a topic to manage questions
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========= ATTENDANCE TAB ========= */}
            {activeTab === "attendance" && (
              <motion.div
                key="attendanceTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500"></div>
                  <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    Attendance Records
                  </h2>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">Present</p>
                    <p className="text-2xl font-bold">{stats.present}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">Absent</p>
                    <p className="text-2xl font-bold">{stats.absent}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">Percentage</p>
                    <p className="text-2xl font-bold">{stats.percentage}%</p>
                  </div>
                </div>

                {/* Filters and Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Search Student</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Roll or Name"
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Search className="absolute left-3 top-2.5 text-zinc-400" size={18} />
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={exportToExcel}
                      disabled={exportLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-70"
                    >
                      {exportLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5 mr-2" />
                          Export to Excel
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Holiday Management */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Holiday Management</h3>
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="date"
                      value={newHoliday}
                      onChange={(e) => setNewHoliday(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                    <button
                      onClick={handleAddHoliday}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 rounded-lg"
                    >
                      Add Holiday
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {holidays.map(holiday => (
                      <div key={holiday.id} className="flex justify-between items-center bg-amber-100 dark:bg-amber-900/20 p-3 rounded-lg">
                        <span>{holiday.date}</span>
                        <button 
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendance Table */}
                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full inline-block mb-4">
                      <Calendar
                        className="text-blue-600 dark:text-blue-400"
                        size={32}
                      />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      No attendance records found for selected date range
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-700/50">
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-l-xl">
                            Roll Number
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Date
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Time
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-r-xl">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/10"
                          >
                            <td className="py-3 px-4">{record.userId}</td>
                            <td className="py-3 px-4 font-medium">
                              {record.name}
                            </td>
                            <td className="py-3 px-4">{record.date}</td>
                            <td className="py-3 px-4">
                              {record.timestamp ? dayjs(record.timestamp).format('hh:mm A') : 'Invalid Date'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  record.deviceId === "manual" 
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                }`}>
                                  {record.deviceId === "manual" ? "Manual" : "Present"}
                                </span>
                                {record.deviceId === "manual" && (
                                  <button
                                    onClick={() => handleMarkAttendance(record.userId, record.name, record.date, false)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                                  >
                                    Mark Absent
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Manual Attendance Marking */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Manual Attendance</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Roll Number</label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      >
                        {ROLL_NUMBERS.map(roll => (
                          <option key={roll} value={roll}>{roll}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      />
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <button
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white py-2 px-4 rounded-lg"
                      >
                        Mark Present
                      </button>
                      <button
                        className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white py-2 px-4 rounded-lg"
                      >
                        Mark Absent
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}