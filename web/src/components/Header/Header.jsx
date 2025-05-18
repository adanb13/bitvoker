import React from 'react';

function Header({toggleTheme, theme}) {
    return (
        <header>
            <div className="logo-container">
                <h1>LogForge</h1>
            </div>
            <button
                id="themeToggle"
                className="theme-toggle-button"
                type="button"
                aria-label="Toggle theme"
                onClick={toggleTheme}
            >
                Toggle Theme
            </button>
        </header>
    );
}

export default Header;
