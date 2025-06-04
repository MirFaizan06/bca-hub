import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, Menu, X, LogOut, BookOpen, Bell, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { to: "/", label: "Home", icon: null },
  { to: "/resources", label: "Resources", icon: <BookOpen size={16} /> },
  { to: "/mock-tests", label: "Mock Tests", icon: null },
  { to: "/announcements", label: "Announcements", icon: <Bell size={16} /> },
  { to: "/community", label: "Community", icon: <Users size={16} /> },
  { to: "/chats", label: "Chat Room", icon: null },
  { to: "/contact", label: "Contact", icon: null },
  { to: "/dashboard", label: "Dashboard", icon: null },
];

export default function Header() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Toggle dark mode and persist to localStorage
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Read logged-in user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full bg-white dark:bg-zinc-900 shadow-md dark:shadow-zinc-800/50 transition-all duration-300 ${
        scrolled ? "bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        {/* Logo / Title */}
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">BH</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">BCA Hub</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 items-center">
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium group"
            >
              {icon && <span className="group-hover:scale-110 transition-transform">{icon}</span>}
              {label}
            </Link>
          ))}

          <div className="flex items-center gap-3 ml-2">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-full transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              // If logged in, show Logout button
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-zinc-700 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 transition font-medium group"
              >
                <LogOut size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Logout</span>
              </button>
            ) : (
              // If not logged in, show Login link
              <Link
                to="/login"
                className="text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Buttons */}
        <div className="flex items-center gap-3 md:hidden">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="text-zinc-700 dark:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-zinc-700 dark:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white dark:bg-zinc-900 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3 border-t border-zinc-200 dark:border-zinc-800">
              {navLinks.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 py-2 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium group"
                >
                  {icon && <span className="group-hover:scale-110 transition-transform">{icon}</span>}
                  {label}
                </Link>
              ))}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 py-2 text-zinc-700 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 font-medium w-full group"
                >
                  <LogOut size={16} className="group-hover:scale-110 transition-transform" /> 
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-3 py-2 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}