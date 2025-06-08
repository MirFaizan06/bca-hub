import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Moon, Sun, Menu, X, LogOut, BookOpen, Bell, Users, 
  Clipboard, LayoutDashboard, Calendar, BarChart, 
  ChevronDown, ChevronUp, User, Bookmark, MessageSquare 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
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
    setOpenDropdown(null);
  }, [location.pathname]);

  // Read logged-in user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing user data:", e);
        setUser(null);
      }
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

  // Toggle dropdown
  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  // Navigation groups
  const navGroups = [
    {
      name: "user",
      label: user ? "My Account" : "Account",
      icon: user ? <User size={16} /> : <User size={16} />,
      links: [
        ...(user ? [
          { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
          { to: "/progress", label: "Progress", icon: <BarChart size={16} /> },
          { to: "/schedule", label: "Schedule", icon: <Calendar size={16} /> },
          { to: "/attendance", label: "Attendance", icon: <Bookmark size={16} /> },
        ] : []),
        user 
          ? { label: "Logout", action: handleLogout, icon: <LogOut size={16} /> }
          : { to: "/login", label: "Login", icon: null }
      ]
    },
    {
      name: "community",
      label: "Community",
      icon: <Users size={16} />,
      links: [
        { to: "/announcements", label: "Announcements", icon: <Bell size={16} /> },
        { to: "/community", label: "Community Hub", icon: <Users size={16} /> },
        { to: "/chats", label: "Chat Room", icon: <MessageSquare size={16} /> },
      ]
    }
  ];

  // Regular navigation links
  const navLinks = [
    { to: "/", label: "Home", icon: null },
    { to: "/resources", label: "Resources", icon: <BookOpen size={16} /> },
    { to: "/mock-tests", label: "Mock Tests", icon: <Clipboard size={16} /> },
    { to: "/contact", label: "Contact", icon: null },
  ];

  return (
    <header 
      className={`sticky top-0 z-50 w-full bg-white dark:bg-zinc-900 shadow-md dark:shadow-zinc-800/50 transition-all duration-300 ${
        scrolled ? "bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        {/* Logo / Title */}
        <Link to="/" className="flex items-center gap-2">
          {/* Logo image option */}
          <div className="flex items-center">
            {/* Uncomment when you have logo */}
            {/* <img 
              src="/logo.png" 
              alt="BCA Hub Logo" 
              className="h-8 w-auto mr-2"
            /> */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 w-8 h-8 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">BH</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">BCA Hub</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
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
          
          {/* Dropdowns */}
          {navGroups.map((group) => (
            <div 
              key={group.name}
              className="relative"
              onMouseEnter={() => setOpenDropdown(group.name)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                onClick={() => toggleDropdown(group.name)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition ${
                  openDropdown === group.name 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                    : "text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                {group.icon}
                <span className="font-medium">{group.label}</span>
                {openDropdown === group.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              <AnimatePresence>
                {openDropdown === group.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none overflow-hidden z-50"
                  >
                    <div className="py-1">
                      {group.links.map((link, index) => (
                        link.to ? (
                          <Link
                            key={`${group.name}-${index}`}
                            to={link.to}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition"
                          >
                            {link.icon && <span>{link.icon}</span>}
                            <span>{link.label}</span>
                          </Link>
                        ) : (
                          <button
                            key={`${group.name}-${index}`}
                            onClick={link.action}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition"
                          >
                            {link.icon && <span>{link.icon}</span>}
                            <span>{link.label}</span>
                          </button>
                        )
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          
          {/* Dark mode toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-full transition-colors"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
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
              {/* Regular links */}
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
              
              {/* Dropdown groups */}
              {navGroups.map((group) => (
                <div key={group.name} className="py-1">
                  <button
                    onClick={() => toggleDropdown(group.name)}
                    className="flex items-center justify-between w-full py-2 text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                  >
                    <div className="flex items-center gap-3">
                      {group.icon}
                      <span>{group.label}</span>
                    </div>
                    {openDropdown === group.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {openDropdown === group.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-6 mt-1 space-y-1 border-l border-zinc-200 dark:border-zinc-700"
                    >
                      {group.links.map((link, index) => (
                        link.to ? (
                          <Link
                            key={`${group.name}-${index}`}
                            to={link.to}
                            className="flex items-center gap-3 py-2 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {link.icon && <span>{link.icon}</span>}
                            <span>{link.label}</span>
                          </Link>
                        ) : (
                          <button
                            key={`${group.name}-${index}`}
                            onClick={link.action}
                            className="flex items-center gap-3 w-full py-2 text-left text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {link.icon && <span>{link.icon}</span>}
                            <span>{link.label}</span>
                          </button>
                        )
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}