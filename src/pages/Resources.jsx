import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Plus,
  Download,
  BookOpen,
  Search,
  Users,
  HelpCircle,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { db } from "../utils/firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function Resources() {
  // Study Groups array for easy updates
  const studyGroups = [
    { name: "BCA Semester 2 - Notes", link: "https://chat.whatsapp.com/HUILL4k1TVc5VSKQFf5PM5" },
    { name: "BCA Semester 2 - Exam Prep.", link: "https://chat.whatsapp.com/DUiPFoOzmfr48Phtz97puP" },
    { name: "Programming Help (added later)", link: "#" },
  ];

  const [resources, setResources] = useState([]);
  const [editMode, setEditMode] = useState({});
  const [newNote, setNewNote] = useState("");
  const contentRef = useRef(null);
  const [expanded, setExpanded] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedResources, setSavedResources] = useState([]); // holds full resource objects
  const [activeTab, setActiveTab] = useState("resources");
  const [isLoading, setIsLoading] = useState(true);

  // Helper: load notes for a topic from localStorage
  const loadNotes = (topicId) => {
    try {
      const stored = localStorage.getItem(`notes_${topicId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Helper: save notes array for a topic to localStorage
  const persistNotes = (topicId, notesArray) => {
    localStorage.setItem(`notes_${topicId}`, JSON.stringify(notesArray));
  };

  // Fetch all resources from Firestore once on mount
  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      const resourcesCol = collection(db, "resources");
      const snapshot = await getDocs(resourcesCol);
      const data = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const id = docSnap.id;
          return {
            id,
            topic: d.topic,
            content: d.content || "",
            semester: d.semester || "",
            createdAt: d.createdAt?.toDate() || new Date(0),
            notes: loadNotes(id), // load persisted notes
            tags: d.tags || [],
            author: d.author || "Unknown",
          };
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      setResources(data);
      if (data.length > 0) {
        setSelectedSemester(data[0].semester);
      }
      setIsLoading(false);
    };

    fetchResources();
  }, []);

  const toggleExpand = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  const handleDeleteNote = (topicId, noteIndex) => {
    setResources((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        const updatedNotes = t.notes.filter((_, idx) => idx !== noteIndex);
        persistNotes(topicId, updatedNotes);
        return { ...t, notes: updatedNotes };
      })
    );
  };

  const handleEditNote = (topicId, noteIndex, value) => {
    setResources((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        const updatedNotes = t.notes.map((n, i) => (i === noteIndex ? value : n));
        persistNotes(topicId, updatedNotes);
        return { ...t, notes: updatedNotes };
      })
    );
  };

  const handleAddNote = (topicId) => {
    if (!newNote.trim()) return;
    setResources((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        const updatedNotes = [...t.notes, newNote.trim()];
        persistNotes(topicId, updatedNotes);
        return { ...t, notes: updatedNotes };
      })
    );
    setNewNote("");
    toast.success("Note added");
  };

  const handlePDFDownload = () => {
    const element = contentRef.current;
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: "bca-resources.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    // Generate PDF
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .catch((err) => {
        toast.error("Failed to generate PDF");
        console.error(err);
      });
  };

  const toggleSaveResource = (resource) => {
    const exists = savedResources.some((r) => r.id === resource.id);
    if (exists) {
      setSavedResources((prev) => prev.filter((r) => r.id !== resource.id));
      toast.success("Resource removed");
    } else {
      setSavedResources((prev) => [...prev, resource]);
      toast.success("Resource saved");
    }
  };

  const allSemesters = Array.from(
    new Set(resources.map((r) => r.semester))
  ).sort((a, b) => Number(a) - Number(b));

  const isNewBadge = (createdAtDate) => {
    const now = Date.now();
    return now - createdAtDate.getTime() < 3 * 24 * 60 * 60 * 1000;
  };

  // Filter by selected semester
  const resourcesBySemester = resources.filter((r) => r.semester === selectedSemester);
  const savedBySemester = savedResources.filter((r) => r.semester === selectedSemester);

  // Filter by search query
  const matchesSearch = (resource) => {
    const lower = searchQuery.toLowerCase();
    return (
      resource.topic.toLowerCase().includes(lower) ||
      resource.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
  };

  const filteredResources = resourcesBySemester.filter(matchesSearch);
  const filteredSavedResources = savedBySemester.filter(matchesSearch);

  // Decide which list to display
  const displayedResources =
    activeTab === "saved" ? filteredSavedResources : filteredResources;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 py-16 px-4">
      {/* Sonner Toaster */}
      <Toaster position="top-right" richColors />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <BookOpen className="text-blue-600 dark:text-blue-400" size={36} />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 bg-clip-text text-transparent">
              Study Resources
            </span>
          </motion.h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Comprehensive study materials, notes, and resources for your BCA journey
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab("resources")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
                  activeTab === "resources"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                <BookOpen size={18} />
                All Resources
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
                  activeTab === "saved"
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                {savedResources.length > 0 ? (
                  <BookmarkCheck size={18} />
                ) : (
                  <Bookmark size={18} />
                )}
                Saved Resources
              </button>
            </div>

            <div className="w-full md:w-auto flex gap-3">
              <div className="relative flex-1 md:min-w-[300px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-zinc-400" size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {allSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>

              <button
                onClick={handlePDFDownload}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Download size={18} />
                <span className="hidden md:inline">Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Distinguishing Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-center">
            {activeTab === "resources" ? "All Resources" : "Saved Resources"}
          </h2>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayedResources.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl shadow-md">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-indigo-600 dark:text-indigo-400" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No resources found</h3>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              {activeTab === "saved"
                ? "You haven't saved any resources yet. Click the bookmark icon to save resources."
                : "Try changing your semester or search term."}
            </p>
          </div>
        )}

        {/* Resources Grid */}
        {!isLoading && displayedResources.length > 0 && (
          <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Table of Contents */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-6 sticky top-24">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen size={18} />
                  Contents
                </h3>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                  {displayedResources.map((topic) => (
                    <li key={topic.id}>
                      <button
                        onClick={() => toggleExpand(topic.id)}
                        className={`text-left w-full px-3 py-2 rounded-lg flex items-center justify-between transition ${
                          expanded === topic.id
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        <span className="truncate">{topic.topic}</span>
                        {isNewBadge(topic.createdAt) && (
                          <span className="ml-2 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Resource Cards */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 gap-6">
                {displayedResources.map((topic) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`rounded-xl shadow-md overflow-hidden ${
                      activeTab === "saved"
                        ? "border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-800/30"
                        : "bg-white dark:bg-zinc-800"
                    }`}
                  >
                    <div
                      className="flex justify-between items-center p-5 cursor-pointer select-none"
                      onClick={() => toggleExpand(topic.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            activeTab === "saved"
                              ? "bg-indigo-100 dark:bg-indigo-900/20"
                              : "bg-blue-100 dark:bg-blue-900/30"
                          }`}
                        >
                          <BookOpen
                            className={`${
                              activeTab === "saved"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                            size={20}
                          />
                        </div>
                        <div>
                          <h4
                            className={`font-semibold text-lg flex items-center gap-2 ${
                              activeTab === "saved"
                                ? "text-indigo-700 dark:text-indigo-300"
                                : ""
                            }`}
                          >
                            {topic.topic}
                            {isNewBadge(topic.createdAt) && (
                              <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                                NEW
                              </span>
                            )}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {topic.tags.map((tag, index) => (
                              <span
                                key={index}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  activeTab === "saved"
                                    ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                    : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveResource(topic);
                          }}
                          className={`hover:opacity-80 transition ${
                            activeTab === "saved" ? "text-indigo-700 dark:text-indigo-300" : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {savedResources.some((r) => r.id === topic.id) ? (
                            <BookmarkCheck size={20} fill="currentColor" />
                          ) : (
                            <Bookmark size={20} />
                          )}
                        </button>
                        {expanded === topic.id ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded === topic.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="px-5 pb-5"
                        >
                          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-5">
                            {/* Author and date */}
                            <div className="flex justify-between items-center mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                              <span>By {topic.author}</span>
                              <span>{topic.createdAt.toLocaleDateString()}</span>
                            </div>

                            {/* Content */}
                            <div
                              className="prose max-w-none dark:prose-invert prose-headings:text-blue-600 dark:prose-headings:text-blue-400 prose-a:text-blue-600 dark:prose-a:text-blue-400 mb-6"
                              dangerouslySetInnerHTML={{ __html: topic.content }}
                            />

                            {/* Notes Section */}
                            <div className="mt-6">
                              <h5 className="font-semibold flex items-center gap-2 mb-3">
                                <Pencil size={18} />
                                Personal Notes
                              </h5>
                              <div className="space-y-3">
                                {topic.notes.map((note, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md"
                                  >
                                    {editMode[`${topic.id}-${idx}`] ? (
                                      <input
                                        value={note}
                                        onChange={(e) =>
                                          handleEditNote(topic.id, idx, e.target.value)
                                        }
                                        className="w-full bg-transparent border-b border-blue-300 dark:border-blue-700 outline-none"
                                      />
                                    ) : (
                                      <p className="w-full text-sm">{note}</p>
                                    )}

                                    <div className="flex gap-2">
                                      {editMode[`${topic.id}-${idx}`] ? (
                                        <button
                                          onClick={() =>
                                            setEditMode((prev) => ({
                                              ...prev,
                                              [`${topic.id}-${idx}`]: false,
                                            }))
                                          }
                                          className="text-green-600 dark:text-green-400"
                                        >
                                          <Save size={16} />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            setEditMode((prev) => ({
                                              ...prev,
                                              [`${topic.id}-${idx}`]: true,
                                            }))
                                          }
                                          className="text-blue-600 dark:text-blue-400"
                                        >
                                          <Pencil size={16} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteNote(topic.id, idx)}
                                        className="text-red-600 dark:text-red-400"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex gap-2 mt-3">
                                  <input
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add new note..."
                                    className="flex-1 border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-700 px-3 py-2 rounded-md text-sm"
                                  />
                                  <button
                                    onClick={() => handleAddNote(topic.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 rounded-md flex items-center"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Additional Sections */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Study Groups */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-6">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Users className="text-green-500" size={24} />
              Study Groups
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Join our active WhatsApp groups for discussions, doubt solving, and peer support.
            </p>
            <div className="space-y-4">
              {studyGroups.map((group, index) => (
                <a
                  key={index}
                  href={group.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <Users className="text-green-600 dark:text-green-400" size={18} />
                  </div>
                  <span className="font-medium">{group.name}</span>
                  <span className="ml-auto text-green-600 dark:text-green-400">Join →</span>
                </a>
              ))}
            </div>
          </div>

          {/* Go to Chat Room */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-6 flex flex-col items-center justify-center">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <HelpCircle className="text-indigo-500" size={24} />
              Chat Room
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Join the community chat room to discuss concepts and get instant help.
            </p>
            <Link
              to="/chats"
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              Go to Chat Room
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
