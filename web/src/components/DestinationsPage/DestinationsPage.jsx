import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Checkbox,
  TextField,
  Button,
  Tooltip,
  Alert,
  Link,
  Snackbar
} from '@mui/material';

const LOGFORGE_PRO_URL = "https://log-forge.github.io/logforgeweb/#premium";

const CHANNEL_OPTIONS = [
  'Email',
  'Slack',
  'Telegram',
  'Microsoft Teams',
  'Pushover',
  'Discord',
  'SMS',
  'Webhook'
];

function parseEmailUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || 587,
      username: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      recipients: u.searchParams.get('to') || ''
    };
  } catch {
    return { host: '', port: 587, username: '', password: '', recipients: '' };
  }
}

function buildEmailUrl(dest) {
  const host = dest.host || '';
  const port = dest.port || 587;
  const user = encodeURIComponent(dest.username || '');
  const pass = encodeURIComponent(dest.password || '');
  const to = encodeURIComponent(dest.recipients || '');
  return `smtp://${user}:${pass}@${host}:${port}/?to=${to}`;
}

function parseSmsUrl(url) {
  try {
    if (!url.startsWith('twilio://')) return { sid: '', token: '', from: '', to: '' };
    const [auth, dests] = url.replace('twilio://', '').split('@');
    const [sid, token] = auth.split(':');
    const [from, to] = dests.split('/');
    return {
      sid: sid || '',
      token: token || '',
      from: from || '',
      to: to || ''
    };
  } catch {
    return { sid: '', token: '', from: '', to: '' };
  }
}

function buildSmsUrl(dest) {
  const sid = dest.sid || '';
  const token = dest.token || '';
  const from = dest.from || '';
  const to = dest.to || '';
  return `twilio://${sid}:${token}@${from}/${to}`;
}

// ---- Pushover helpers ----
function parsePushoverUrl(url) {
  // Format: pover://USER_KEY@API_TOKEN
  try {
    if (!url.startsWith('pover://')) return { userkey: '', apitoken: '' };
    const [userkey, apitoken] = url.replace('pover://', '').split('@');
    return {
      userkey: userkey || '',
      apitoken: apitoken || ''
    };
  } catch {
    return { userkey: '', apitoken: '' };
  }
}

function buildPushoverUrl(dest) {
  const userkey = dest.userkey || '';
  const apitoken = dest.apitoken || '';
  return `pover://${userkey}@${apitoken}`;
}

// ---- SYNC NOTIFY DESTINATIONS ----
function syncRuleNotifyDestinations(destinations, rules) {
  const ruleIdx = rules.findIndex(r => r.name === "default-rule");
  if (ruleIdx === -1) return rules;
  const destNames = destinations.map(dest => dest.name);
  const updatedRules = [...rules];
  updatedRules[ruleIdx] = {
    ...rules[ruleIdx],
    notify: {
      ...rules[ruleIdx].notify,
      destinations: destNames
    }
  };
  return updatedRules;
}

// Validation function
function validateDestinations(destinations) {
  const errors = [];
  destinations.forEach((dest, i) => {
    if (dest.name === 'Email') {
      if (!dest.host) errors.push(`Row ${i + 1} (Email): SMTP Host is required`);
      if (!dest.port) errors.push(`Row ${i + 1} (Email): Port is required`);
      if (!dest.username) errors.push(`Row ${i + 1} (Email): Username is required`);
      if (!dest.password) errors.push(`Row ${i + 1} (Email): Password is required`);
      if (!dest.recipients) errors.push(`Row ${i + 1} (Email): Recipients is required`);
    } else if (dest.name === 'SMS') {
      if (!dest.sid) errors.push(`Row ${i + 1} (SMS): Account SID is required`);
      if (!dest.token) errors.push(`Row ${i + 1} (SMS): Auth Token is required`);
      if (!dest.from) errors.push(`Row ${i + 1} (SMS): From Number is required`);
      if (!dest.to) errors.push(`Row ${i + 1} (SMS): To Number is required`);
    } else if (dest.name === 'Pushover') {
      if (!dest.userkey) errors.push(`Row ${i + 1} (Pushover): User Key is required`);
      if (!dest.apitoken) errors.push(`Row ${i + 1} (Pushover): API Token is required`);
    } else {
      if (!dest.url) errors.push(`Row ${i + 1} (${dest.name}): URL is required`);
    }
  });
  return errors;
}

const DestinationsPage = () => {
  const [config, setConfig] = useState({ destinations: [], rules: [], ai: { provider: 'openai' } });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [proAlert, setProAlert] = useState('');
  const [successSnackbar, setSuccessSnackbar] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const errorRef = useRef(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        const parsed = (data.destinations || []).map(dest => {
          if (dest.name === 'Email') {
            return { ...dest, ...parseEmailUrl(dest.url) };
          }
          if (dest.name === 'SMS') {
            return { ...dest, ...parseSmsUrl(dest.url) };
          }
          if (dest.name === 'Pushover') {
            return { ...dest, ...parsePushoverUrl(dest.url) };
          }
          return dest;
        });
        setConfig({
          destinations: parsed,
          rules: data.rules || [],
          ai: data.ai && data.ai.provider ? data.ai : { provider: 'openai' }
        });
      })
      .catch(err => setError(err.message));
  }, []);

  function canAddType(type) {
    const typeCount = config.destinations.filter(d => d.name === type).length;
    return typeCount === 0;
  }

  const updateDestination = (idx, changes) => {
    let updated = { ...config.destinations[idx], ...changes };
    if (changes.name) {
      if (changes.name === "Email") {
        updated = {
          name: "Email",
          enabled: updated.enabled !== undefined ? updated.enabled : true,
          host: "",
          port: 587,
          username: "",
          password: "",
          recipients: "",
          url: ""
        };
      } else if (changes.name === "SMS") {
        updated = {
          name: "SMS",
          enabled: updated.enabled !== undefined ? updated.enabled : true,
          sid: "",
          token: "",
          from: "",
          to: "",
          url: ""
        };
      } else if (changes.name === "Pushover") {
        updated = {
          name: "Pushover",
          enabled: updated.enabled !== undefined ? updated.enabled : true,
          userkey: "",
          apitoken: "",
          url: ""
        };
      } else {
        updated = {
          name: changes.name,
          enabled: updated.enabled !== undefined ? updated.enabled : true,
          url: ""
        };
      }
    }
    let destinations = [...config.destinations];
    destinations[idx] = updated;
    const newRules = syncRuleNotifyDestinations(destinations, config.rules);
    setConfig(c => ({ ...c, destinations, rules: newRules }));
  };

  const addDestination = () => {
    if (config.destinations.length >= CHANNEL_OPTIONS.length) {
      setProAlert(
        <>
          Multiple destinations of the same type are a feature of{' '}
          <Link
            href={LOGFORGE_PRO_URL}
            color="primary"
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            sx={{ fontWeight: 500 }}
          >
            LogForge Pro
          </Link>
          .
        </>
      );
      return;
    }
    const available = CHANNEL_OPTIONS.find(type => canAddType(type));
    if (!available) {
      setProAlert(
        <>
          Multiple destinations of the same type are a feature of{' '}
          <Link
            href={LOGFORGE_PRO_URL}
            color="primary"
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            sx={{ fontWeight: 500 }}
          >
            LogForge Pro
          </Link>
          .
        </>
      );
      return;
    }
    let dest;
    if (available === "Pushover") {
      dest = { name: available, enabled: true, userkey: "", apitoken: "", url: "" };
    } else {
      dest = { name: available, enabled: true, url: "" };
    }
    setConfig(c => {
      const newDestinations = [...c.destinations, dest];
      const newRules = syncRuleNotifyDestinations(newDestinations, c.rules);
      return { ...c, destinations: newDestinations, rules: newRules };
    });
  };

  const removeDestination = idx => {
    setConfig(c => {
      const newDestinations = c.destinations.filter((_, i) => i !== idx);
      const newRules = syncRuleNotifyDestinations(newDestinations, c.rules);
      return { ...c, destinations: newDestinations, rules: newRules };
    });
  };

  const handleSave = () => {
    setSaving(true);
    setError(null);

    // Validate before saving
    const validationErrs = validateDestinations(config.destinations);
    if (validationErrs.length > 0) {
      setValidationErrors(validationErrs);
      setSaving(false);
      setTimeout(() => {
        if (errorRef.current) {
          errorRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return;
    } else {
      setValidationErrors([]);
    }

    const payload = {
      ...config,
      destinations: config.destinations.map(dest => {
        if (dest.name === 'Email') {
          return {
            name: dest.name,
            enabled: dest.enabled,
            url: buildEmailUrl(dest)
          };
        }
        if (dest.name === 'SMS') {
          return {
            name: dest.name,
            enabled: dest.enabled,
            url: buildSmsUrl(dest)
          };
        }
        if (dest.name === 'Pushover') {
          return {
            name: dest.name,
            enabled: dest.enabled,
            url: buildPushoverUrl(dest)
          };
        }
        return {
          name: dest.name,
          enabled: dest.enabled,
          url: dest.url
        };
      }),
      ai: config.ai && config.ai.provider ? config.ai : { provider: 'openai' }
    };

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed: ' + res.status);
        return res.json();
      })
      .then(() => {
        setSaving(false);
        setProAlert('');
        setSuccessSnackbar(true);
        fetch('/api/config')
          .then(res => res.json())
          .then(data => {
            const parsed = (data.destinations || []).map(dest => {
              if (dest.name === 'Email') {
                return { ...dest, ...parseEmailUrl(dest.url) };
              }
              if (dest.name === 'SMS') {
                return { ...dest, ...parseSmsUrl(dest.url) };
              }
              if (dest.name === 'Pushover') {
                return { ...dest, ...parsePushoverUrl(dest.url) };
              }
              return dest;
            });
            setConfig({
              destinations: parsed,
              rules: data.rules || [],
              ai: data.ai && data.ai.provider ? data.ai : { provider: 'openai' }
            });
          });
      })
      .catch(err => {
        setError(err.message);
        setSaving(false);
      });
  };

  const handleCloseSnackbar = () => setSuccessSnackbar(false);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Notification Destinations
      </Typography>
      {error && <Typography color="error" paragraph>{error}</Typography>}
      {proAlert && (
        <Alert
          severity="info"
          onClose={() => setProAlert('')}
          sx={{ mb: 2, maxWidth: 600 }}
        >
          {proAlert}
        </Alert>
      )}
      {validationErrors.length > 0 && (
        <Alert
          severity="error"
          ref={errorRef}
          sx={{ mb: 2, maxWidth: 700 }}
        >
          Please fix the following errors before saving:
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Channel</TableCell>
              <TableCell align="center">Enabled</TableCell>
              <TableCell>Configuration</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {config.destinations.map((dest, idx) => (
              <TableRow key={idx} hover>
                <TableCell>
                  <Select
                    fullWidth
                    value={dest.name}
                    onChange={e => updateDestination(idx, { name: e.target.value })}
                  >
                    {CHANNEL_OPTIONS.map(opt => {
                      const isUsedElsewhere =
                        config.destinations.some((d, i) => d.name === opt && i !== idx);
                      if (isUsedElsewhere) {
                        return (
                          <Tooltip
                            key={opt}
                            title={
                              <>
                                Multiple destinations of the same type are a feature of{' '}
                                <Link
                                  href={LOGFORGE_PRO_URL}
                                  color="primary"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  underline="always"
                                  sx={{ fontWeight: 500 }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  LogForge Pro
                                </Link>
                                .
                              </>
                            }
                            arrow
                            placement="right"
                          >
                            <span>
                              <MenuItem value={opt} disabled style={{ color: "#888" }}>
                                {opt}
                              </MenuItem>
                            </span>
                          </Tooltip>
                        );
                      }
                      return (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={dest.enabled}
                    onChange={e => updateDestination(idx, { enabled: e.target.checked })}
                  />
                </TableCell>
                <TableCell>
                  {dest.name === 'Email' ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <TextField
                        label="SMTP Host"
                        size="small"
                        value={dest.host || ''}
                        onChange={e => updateDestination(idx, { host: e.target.value })}
                      />
                      <TextField
                        label="Port"
                        size="small"
                        type="number"
                        value={dest.port || 587}
                        onChange={e => updateDestination(idx, { port: e.target.value })}
                      />
                      <TextField
                        label="Username"
                        size="small"
                        value={dest.username || ''}
                        onChange={e => updateDestination(idx, { username: e.target.value })}
                      />
                      <TextField
                        label="Password"
                        size="small"
                        type="password"
                        value={dest.password || ''}
                        onChange={e => updateDestination(idx, { password: e.target.value })}
                      />
                      <TextField
                        label="Recipients"
                        size="small"
                        helperText="comma-separated"
                        value={dest.recipients || ''}
                        onChange={e => updateDestination(idx, { recipients: e.target.value })}
                      />
                    </Box>
                  ) : dest.name === 'SMS' ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <TextField
                        label="Account SID"
                        size="small"
                        value={dest.sid || ''}
                        onChange={e => updateDestination(idx, { sid: e.target.value })}
                      />
                      <TextField
                        label="Auth Token"
                        size="small"
                        type="password"
                        value={dest.token || ''}
                        onChange={e => updateDestination(idx, { token: e.target.value })}
                      />
                      <TextField
                        label="From Number"
                        size="small"
                        value={dest.from || ''}
                        onChange={e => updateDestination(idx, { from: e.target.value })}
                      />
                      <TextField
                        label="To Number"
                        size="small"
                        value={dest.to || ''}
                        onChange={e => updateDestination(idx, { to: e.target.value })}
                      />
                    </Box>
                  ) : dest.name === 'Pushover' ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <TextField
                        label="User Key"
                        size="small"
                        value={dest.userkey || ''}
                        onChange={e => updateDestination(idx, { userkey: e.target.value })}
                      />
                      <TextField
                        label="API Token"
                        size="small"
                        value={dest.apitoken || ''}
                        onChange={e => updateDestination(idx, { apitoken: e.target.value })}
                      />
                    </Box>
                  ) : (
                    <TextField
                      fullWidth
                      size="small"
                      value={dest.url}
                      placeholder="Paste webhook URL or credentials"
                      onChange={e => updateDestination(idx, { url: e.target.value })}
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Button color="error" size="small" onClick={() => removeDestination(idx)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 2, mb: 6 }}>
        <Button variant="contained" onClick={addDestination}>
          + Add Destination
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Box>
      <Divider sx={{ my: 6 }} />

      {/* Snackbar for success */}
      <Snackbar
        open={successSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: '100%' }}
        >
          Destinations saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DestinationsPage;
