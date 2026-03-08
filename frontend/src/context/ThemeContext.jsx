import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('tabi-theme');
        return saved !== null ? JSON.parse(saved) : true; // Default dark
    });

    const [isSurfacing, setIsSurfacing] = useState(false);

    // Apply to <html> so :root → .light-mode CSS variable cascade works everywhere
    useEffect(() => {
        localStorage.setItem('tabi-theme', JSON.stringify(isDarkMode));
        document.documentElement.classList.toggle('light-mode', !isDarkMode);
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsSurfacing(true);
        setTimeout(() => {
            setIsDarkMode(prev => !prev);
            setTimeout(() => setIsSurfacing(false), 700);
        }, 350);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, isSurfacing }}>
            {children}
        </ThemeContext.Provider>
    );
};
