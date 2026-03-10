import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('tabi-theme');
        return saved !== null ? JSON.parse(saved) : true; // Default dark
    });

    const [isSurfacing, setIsSurfacing] = useState(false);
    // 'to-light' | 'to-dark' | null — locked at toggle time so WaveBackground
    // always knows which direction to animate, even after isDarkMode flips.
    const [transitionDirection, setTransitionDirection] = useState(null);

    // Apply to <html> so :root → .light-mode CSS variable cascade works everywhere
    useEffect(() => {
        localStorage.setItem('tabi-theme', JSON.stringify(isDarkMode));
        document.documentElement.classList.toggle('light-mode', !isDarkMode);
    }, [isDarkMode]);

    const toggleTheme = () => {
        // Lock direction BEFORE flipping isDarkMode
        const direction = isDarkMode ? 'to-light' : 'to-dark';
        setTransitionDirection(direction);
        setIsSurfacing(true);

        setTimeout(() => {
            setIsDarkMode(prev => !prev);
            setTimeout(() => {
                setIsSurfacing(false);
                setTransitionDirection(null);
            }, 700);
        }, 350);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, isSurfacing, transitionDirection }}>
            {children}
        </ThemeContext.Provider>
    );
};
