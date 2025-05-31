import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, Checkbox, MenuItem, Select, FormControlLabel, Dialog, DialogActions, DialogContent,
  DialogTitle, Chip
} from '@mui/material';

const DEFAULT_RULE = (destNames=[]) => ({
  name: '',
  enabled: true,
  preprompt: 'Summarize the logs.',
  match: {
    sources: [],
    og_text_regex: '',
    ai_text_regex: ''
  },
  notify: {
    destinations: destNames,
    send_og_text: {
      enabled: true,
      og_text_regex: '',
      ai_text_regex: ''
    },
    send_ai_text: {
      enabled: false,
      og_text_regex: '',
      ai_text_regex: ''
    }
  }
});

const RulesPage = () => {
  const [rules, setRules] = useState([]);
  const [destNames, setDestNames] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editRule, setEditRule] = useState(DEFAULT_RULE());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load config and destinations to fill multi-select
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setRules(data.rules || []);
        setDestNames((data.destinations || []).map(d => d.name));
      })
      .catch(err => setError(err.message));
  }, []);

  // Start editing or creating a rule
  const startEdit = (idx = null) => {
    if (idx === null) {
      setEditRule(DEFAULT_RULE(destNames));
      setEditingIdx(null);
    } else {
      setEditRule(JSON.parse(JSON.stringify(rules[idx])));
      setEditingIdx(idx);
    }
  };

  // Save rule in local state
  const saveEdit = () => {
    const newRules = [...rules];
    if (editingIdx === null) {
      newRules.push(editRule);
    } else {
      newRules[editingIdx] = editRule;
    }
    setRules(newRules);
    setEditingIdx(null);
    setEditRule(DEFAULT_RULE(destNames));
  };

  const removeRule = idx => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  // Save to backend
  const handleSave = () => {
    setSaving(true);
    setError(null);
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules, /* preserve destinations etc if needed */ })
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed: ' + res.status);
        return res.json();
      })
      .then(() => setSaving(false))
      .catch(err => {
        setError(err.message);
        setSaving(false);
      });
  };

  // Multi-select for destinations
  const handleDestChange = (evt) => {
    setEditRule({ ...editRule, notify: { ...editRule.notify, destinations: evt.target.value } });
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Rules Configuration
      </Typography>
      {error && <Typography color="error">{error}</Typography>}

      <Box mb={2}>
        <Button variant="contained" onClick={() => startEdit(null)}>+ Add Rule</Button>
        <Button variant="contained" color="primary" onClick={handleSave} sx={{ ml: 2 }} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Enabled</TableCell>
              <TableCell>Destinations</TableCell>
              <TableCell>Preprompt</TableCell>
              <TableCell>Match Source(s)</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule, idx) => (
              <TableRow key={idx}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{rule.enabled ? "Yes" : "No"}</TableCell>
                <TableCell>
                  {(rule.notify?.destinations || []).map(d => (
                    <Chip key={d} label={d} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>{rule.preprompt}</TableCell>
                <TableCell>
                  {rule.match.sources && rule.match.sources.length
                    ? rule.match.sources.join(", ")
                    : <em>All</em>}
                </TableCell>
                <TableCell align="center">
                  <Button color="primary" size="small" onClick={() => startEdit(idx)}>Edit</Button>
                  <Button color="error" size="small" onClick={() => removeRule(idx)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center"><em>No rules configured</em></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Rule Dialog */}
      <Dialog open={editingIdx !== null || editRule.name !== ""} onClose={() => { setEditingIdx(null); setEditRule(DEFAULT_RULE(destNames)); }}>
        <DialogTitle>{editingIdx === null ? "Add Rule" : "Edit Rule"}</DialogTitle>
        <DialogContent>
          <TextField label="Rule Name" value={editRule.name} onChange={e => setEditRule({ ...editRule, name: e.target.value })} fullWidth sx={{ mb: 2 }} />
          <FormControlLabel
            control={
              <Checkbox checked={!!editRule.enabled}
                onChange={e => setEditRule({ ...editRule, enabled: e.target.checked })} />
            }
            label="Enabled"
          />
          <TextField label="Preprompt" value={editRule.preprompt}
            onChange={e => setEditRule({ ...editRule, preprompt: e.target.value })} fullWidth sx={{ mb: 2 }} />

          <Typography variant="subtitle2">Destinations</Typography>
          <Select
            multiple
            value={editRule.notify.destinations}
            onChange={handleDestChange}
            fullWidth sx={{ mb: 2 }}
            renderValue={selected => selected.map(v => <Chip key={v} label={v} size="small" sx={{ mr: 0.5 }} />)}
          >
            {destNames.map(d => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>

          <Typography variant="subtitle2">Matching Conditions</Typography>
          <TextField label="Sources (comma separated)"
            value={editRule.match.sources ? editRule.match.sources.join(", ") : ""}
            onChange={e => setEditRule({ ...editRule, match: { ...editRule.match, sources: e.target.value.split(",").map(v => v.trim()).filter(Boolean) } })}
            fullWidth sx={{ mb: 2 }} />
          <TextField label="Original Text Regex"
            value={editRule.match.og_text_regex}
            onChange={e => setEditRule({ ...editRule, match: { ...editRule.match, og_text_regex: e.target.value } })}
            fullWidth sx={{ mb: 2 }} />
          <TextField label="AI Text Regex"
            value={editRule.match.ai_text_regex}
            onChange={e => setEditRule({ ...editRule, match: { ...editRule.match, ai_text_regex: e.target.value } })}
            fullWidth sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ mt: 2 }}>Notification Content</Typography>
          <FormControlLabel
            control={
              <Checkbox checked={!!editRule.notify.send_og_text.enabled}
                onChange={e => setEditRule({ ...editRule, notify: { ...editRule.notify, send_og_text: { ...editRule.notify.send_og_text, enabled: e.target.checked } } })} />
            }
            label="Include Original Text"
          />
          <FormControlLabel
            control={
              <Checkbox checked={!!editRule.notify.send_ai_text.enabled}
                onChange={e => setEditRule({ ...editRule, notify: { ...editRule.notify, send_ai_text: { ...editRule.notify.send_ai_text, enabled: e.target.checked } } })} />
            }
            label="Include AI Text"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingIdx(null); setEditRule(DEFAULT_RULE(destNames)); }}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>{editingIdx === null ? "Add" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RulesPage;
