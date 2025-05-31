import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControlLabel, Checkbox, Typography, Box
} from '@mui/material';

const RuleEditModal = ({ open, rule, onClose, onSave }) => {
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);

  useEffect(() => {
    setEnabled(rule?.enabled ?? true);
  }, [rule, open]);

  if (!open || !rule) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#232324", // Your app's dark background
          color: "#eee",       // Light text
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>
        Rule for {rule.notify?.destinations?.[0] || "Destination"}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body1" sx={{ mb: 2, color: "#e2e2e2" }}>
          <b>What does this rule do?</b>
          <br />
          Every notification will be forwarded to <span style={{ color: "#ff9800" }}>
            {rule.notify?.destinations?.[0] || "the selected destination"}
          </span>.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={enabled}
                sx={{
                  color: "#ff9800",
                  '&.Mui-checked': { color: "#ff9800" }
                }}
                onChange={e => setEnabled(e.target.checked)}
              />
            }
            label={<span style={{ fontWeight: 500 }}>Enable this rule</span>}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: "#bbb" }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave({ ...rule, enabled })}
          sx={{
            bgcolor: "#ff9800",
            color: "#232324",
            fontWeight: 600,
            borderRadius: 2,
            boxShadow: "0 2px 8px #0002",
            ":hover": { bgcolor: "#ffb74d" }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RuleEditModal;
