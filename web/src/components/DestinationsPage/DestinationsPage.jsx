import React, { useEffect, useState } from 'react';
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
  Button
} from '@mui/material';
import RuleEditModal from '../RuleEditModal/RuleEditModal';

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

const AI_PROVIDERS = [
  'ollama',
  'none'
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
    return { host: '', port: 3333, username: '', password: '', recipients: '' };
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

// Minimal valid rule for a destination
function defaultRuleForDestination(destName) {
  return {
    name: `NotifyTo${destName.replace(/\s/g, '')}`,
    enabled: true,
    preprompt: 'Summarize logs.',
    match: { sources: [], og_text_regex: '', ai_text_regex: '' },
    notify: {
      destinations: [destName],
      send_og_text: { enabled: true, og_text_regex: '', ai_text_regex: '' },
      send_ai_text: { enabled: false, og_text_regex: '', ai_text_regex: '' }
    }
  };
}

const DestinationsPage = () => {
  const [config, setConfig] = useState({ destinations: [], rules: [], ai: { provider: 'openai' } });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editRuleIdx, setEditRuleIdx] = useState(null);
  const [editRuleOpen, setEditRuleOpen] = useState(false);

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

  // Helper: get rule for destination name
  const ruleForDest = (destName) =>
    config.rules.find(
      r => r.notify &&
        Array.isArray(r.notify.destinations) &&
        r.notify.destinations.length === 1 &&
        r.notify.destinations[0] === destName
    );

  // Create a rule for the destination if missing
  const ensureRuleForDestination = (destName, rulesArr) => {
    const ruleExists = rulesArr.some(r =>
      r.notify &&
      Array.isArray(r.notify.destinations) &&
      r.notify.destinations.length === 1 &&
      r.notify.destinations[0] === destName
    );
    if (!ruleExists) {
      return [...rulesArr, defaultRuleForDestination(destName)];
    }
    return rulesArr;
  };

  // Remove rule for a destination (by name)
  const removeRuleForDestination = (destName, rulesArr) => {
    return rulesArr.filter(
      r => !(r.notify && Array.isArray(r.notify.destinations) &&
        r.notify.destinations.length === 1 &&
        r.notify.destinations[0] === destName)
    );
  };

  // Change handler for destination fields
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
    setConfig(c => ({ ...c, destinations }));
  };

  // Add new destination (no rule is added until save)
  const addDestination = () => {
    const dest = { name: 'Webhook', enabled: true, url: '' };
    setConfig(c => ({
      ...c,
      destinations: [...c.destinations, dest]
    }));
  };

  // Remove destination, auto-remove rule (if exists)
  const removeDestination = idx => {
    const dest = config.destinations[idx];
    const name = dest.name;
    setConfig(c => ({
      ...c,
      destinations: c.destinations.filter((_, i) => i !== idx),
      rules: removeRuleForDestination(name, c.rules)
    }));
  };

  // Edit rule for this destination
  const handleEditRule = (destName) => {
    const idx = config.rules.findIndex(
      r => r.notify &&
        Array.isArray(r.notify.destinations) &&
        r.notify.destinations.length === 1 &&
        r.notify.destinations[0] === destName
    );
    if (idx >= 0) {
      setEditRuleIdx(idx);
      setEditRuleOpen(true);
    }
  };

  // Save updated rule
  const handleSaveRule = (ruleObj) => {
    let rules = [...config.rules];
    rules[editRuleIdx] = ruleObj;
    setConfig(c => ({ ...c, rules }));
    setEditRuleOpen(false);
    setEditRuleIdx(null);
  };

  const handleAIProviderChange = e => {
    setConfig(c => ({
      ...c,
      ai: { ...c.ai, provider: e.target.value }
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setError(null);

    // Generate rules for all destinations that don't have one
    let rules = config.rules;
    config.destinations.forEach(dest => {
      rules = ensureRuleForDestination(dest.name, rules);
    });

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
        return {
          name: dest.name,
          enabled: dest.enabled,
          url: dest.url
        };
      }),
      rules,
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
        // Fetch updated config to show new rules
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

  // At least one destination has a rule?
  const showRuleColumn = config.destinations.some(dest => ruleForDest(dest.name));

  return (
    <Box p={3}>
      {/* Notification Destinations */}
      <Typography variant="h5" gutterBottom>
        Notification Destinations
      </Typography>
      {error && <Typography color="error" paragraph>{error}</Typography>}

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
            {config.destinations.map((dest, idx) => {
              const rule = ruleForDest(dest.name);
              return (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Select
                      fullWidth
                      value={dest.name}
                      onChange={e => updateDestination(idx, { name: e.target.value })}
                    >
                      {CHANNEL_OPTIONS.map(opt => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
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
              );
            })}
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
    </Box>
  );
};

export default DestinationsPage;
