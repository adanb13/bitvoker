import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import logforgeLogo from '../../assets/logforge.png';

function Header({ toggleTheme, theme }) {
  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      sx={{ bgcolor: theme => theme.palette.background.default }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={logforgeLogo}
            alt="LogForge Logo"
            width="32"
            height="32"
            style={{ marginRight: '10px' }}
          />
          <Typography variant="h6" component="h1">
            LogForge
          </Typography>
        </Box>

        <IconButton
          onClick={toggleTheme}
          color="inherit"
          aria-label="Toggle theme"
          id="themeToggle"
        >
          {theme === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
