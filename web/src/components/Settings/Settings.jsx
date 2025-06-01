import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, CircularProgress,
    Snackbar, Alert, styled, Grid
} from '@mui/material';
import DefaultRule from './DefaultRule';
import AIProvider from './AIProvider';

const StyledPaper = styled(Box)(() => ({
    padding: '20px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--card-bg)',
    marginBottom: '20px'
}));

function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configData, setConfigData] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const data = await response.json();
            setConfigData(data);
        } catch (error) {
            setSnackbar({
                open: true,
                message: `Failed to load settings: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData),
            });
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            await fetchConfig();
            setSnackbar({
                open: true,
                message: 'Settings saved successfully',
                severity: 'success'
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: `Failed to save settings: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (updater) => {
        setConfigData(prev => updater(prev));
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const defaultRule = configData?.rules?.find(r => r.name === "default-rule") || {};
    const aiEnabled = defaultRule?.notify?.ai_processed?.enabled || false;
    const aiProvider = configData?.ai?.provider || 'meta_ai';
    const ollamaUrl = configData?.ai?.ollama?.url || '';
    const ollamaModel = configData?.ai?.ollama?.model || '';
    const preprompt = defaultRule?.preprompt || '';
    const includeOriginal = defaultRule?.notify?.original_message?.enabled || false;

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {/* Default Processing Rule and AI Provider */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={7}>
                    <StyledPaper>
                        <DefaultRule
                            aiEnabled={aiEnabled}
                            includeOriginal={includeOriginal}
                            preprompt={preprompt}
                            updateConfig={updateConfig}
                        />
                    </StyledPaper>
                </Grid>
                <Grid item xs={12} md={5}>
                    <StyledPaper>
                        <AIProvider
                            aiProvider={aiProvider}
                            ollamaUrl={ollamaUrl}
                            ollamaModel={ollamaModel}
                            updateConfig={updateConfig}
                        />
                    </StyledPaper>
                </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                    variant="contained"
                    type="submit"
                    size="large"
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default Settings;
