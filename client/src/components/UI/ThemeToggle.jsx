// src/components/UI/ThemeToggle.jsx
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <motion.div
        className="theme-toggle__track"
        animate={{ background: isDark ? '#FF4F1F' : '#E5E7EB' }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="theme-toggle__thumb"
          animate={{ x: isDark ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <motion.div
            animate={{ opacity: isDark ? 1 : 0, rotate: isDark ? 0 : 90 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'absolute' }}
          >
            <Moon size={10} color="#FF4F1F" />
          </motion.div>
          <motion.div
            animate={{ opacity: isDark ? 0 : 1, rotate: isDark ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'absolute' }}
          >
            <Sun size={10} color="#F59E0B" />
          </motion.div>
        </motion.div>
      </motion.div>
    </button>
  );
}
