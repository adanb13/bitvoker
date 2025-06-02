import React from 'react';
import {
    Box,
    FormControlLabel,
    Checkbox,
    TextField,
    Paper,
    styled,
    Typography
} from '@mui/material';

const StyledPaper = styled(Paper)(() => ({
    padding: '20px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--card-bg)',
    marginBottom: '20px'
}));

const StyledTextField = styled(TextField)(() => ({
    marginBottom: '15px',
    '& .MuiInputBase-root': {
        backgroundColor: 'var(--input-bg)',
    }
}));

function DefaultRule({ aiEnabled, includeOriginal, preprompt, updateConfig }) {
    // Handle AI summary toggle
    const handleAIEnabledChange = (e) => {
        const enabled = e.target.checked;
        updateConfig(prev => {
            const defaultRule = prev.rules.find(rule => rule.name === "default-rule");
            // If AI summary is turned OFF, always keep send_og_text true
            let sendOgTextEnabled = enabled
                ? (defaultRule?.notify?.send_og_text?.enabled ?? true)
                : true;

            const ruleEnabled = enabled || (defaultRule?.notify?.original_message?.enabled || false);

            return {
                ...prev,
                rules: prev.rules.map(rule =>
                    rule.name === "default-rule"
                        ? {
                            ...rule,
                            enabled: ruleEnabled,
                            notify: {
                                ...rule.notify,
                                original_message: {
                                    ...rule.notify.original_message,
                                    enabled: defaultRule?.notify?.original_message?.enabled || false
                                },
                                ai_processed: {
                                    ...rule.notify.ai_processed,
                                    enabled: enabled
                                },
                                send_ai_text: {
                                    ...rule.notify.send_ai_text,
                                    enabled: enabled
                                },
                                send_og_text: {
                                    ...rule.notify.send_og_text,
                                    enabled: sendOgTextEnabled
                                }
                            }
                        }
                        : rule
                )
            };
        });
    };

    // Handle Include Original toggle (only works when AI is ON)
    const handleIncludeOriginalChange = (e) => {
        const show = e.target.checked;
        updateConfig(prev => {
            const defaultRule = prev.rules.find(rule => rule.name === "default-rule");
            const currentAiEnabledState = defaultRule?.notify?.ai_processed?.enabled || false;
            // Only allow toggle if AI summary is enabled
            const sendOgTextEnabled = currentAiEnabledState ? show : true;
            const ruleEnabled = currentAiEnabledState || show;
            return {
                ...prev,
                rules: prev.rules.map(rule =>
                    rule.name === "default-rule"
                        ? {
                            ...rule,
                            enabled: ruleEnabled,
                            notify: {
                                ...rule.notify,
                                original_message: {
                                    ...rule.notify.original_message,
                                    enabled: show
                                },
                                send_og_text: {
                                    ...rule.notify.send_og_text,
                                    enabled: sendOgTextEnabled
                                }
                            }
                        }
                        : rule
                )
            };
        });
    };

    // Preprompt logic stays the same
    const handlePrepromptChange = (e) => {
        const text = e.target.value;
        updateConfig(prev => ({
            ...prev,
            rules: prev.rules.map(rule =>
                rule.name === "default-rule"
                    ? { ...rule, preprompt: text }
                    : rule
            )
        }));
    };

    // When AI is off, always display Include Original as checked and disabled
    const includeOriginalChecked = aiEnabled ? includeOriginal : true;
    const includeOriginalDisabled = !aiEnabled;

    return (
        <StyledPaper>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Default Processing Rule
                <Typography variant="body2" color="text.secondary">
                    This rule is used if no other rule matches. To disable it, uncheck both options below
                </Typography>
            </Typography>

            <Box sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={includeOriginalChecked}
                            onChange={handleIncludeOriginalChange}
                            disabled={includeOriginalDisabled}
                        />
                    }
                    label="Include Original Message"
                    sx={{
                        '& .MuiFormControlLabel-label': {
                            fontWeight: 'bold',
                        }
                    }}
                />
                <Box sx={{ ml: 4, mt: -0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Includes the original message in notifications when this rule is triggered.
                        <br />
                        <span style={{ color: '#888', fontSize: 13 }}>
                            (Always enabled if AI Processing is off)
                        </span>
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={aiEnabled}
                            onChange={handleAIEnabledChange}
                        />
                    }
                    label="Enable AI Processing"
                    sx={{
                        '& .MuiFormControlLabel-label': {
                            fontWeight: 'bold',
                        }
                    }}
                />
                <Box sx={{ ml: 4, mt: -0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Processes the message with AI, including its output in notifications when this rule is triggered
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
                <Typography
                    variant="subtitle1"
                    component="h3"
                    sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        color: !aiEnabled ? 'var(--disabled-text)' : 'inherit'
                    }}
                >
                    Default Rule AI Preprompt
                </Typography>

                <StyledTextField
                    multiline
                    rows={2.6}
                    value={preprompt}
                    onChange={handlePrepromptChange}
                    fullWidth
                    disabled={!aiEnabled}
                    placeholder="Instructions for the AI model"
                />

                <Typography variant="body2" color="text.secondary">
                    Provides instructions to the AI on how to process messages when this rule is triggered
                </Typography>
            </Box>
        </StyledPaper>
    );
}

export default DefaultRule;
