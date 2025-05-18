import React from 'react';

function Header({toggleTheme, theme}) {
    return (
        <header>
            <div className="logo-container">
                <h1>LogForge</h1>
            </div>
 <div className="header-actions">
        <button
          id="themeToggle"
          className="theme-toggle-button"
          type="button"
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          Toggle Theme
        </button>
        <button
            className="premium-button"
            type="button"
            onClick={() =>
            window.open("https://log-forge.github.io/logforgeweb/#premium", "_blank")
            }
        >
            Need a custom notification channel? Try Premium
        </button>
      </div>
    </header>
    );
}

export default Header;
