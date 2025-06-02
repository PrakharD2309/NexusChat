import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  CloudUpload,
  CloudDownload,
  Delete,
  Schedule,
  Refresh
} from '@mui/icons-material';

const CloudBackup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [schedule, setSchedule] = useState('daily');

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/cloud-backup/history');
      setBackups(response.data);
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  const connectGoogleDrive = async () => {
    try {
      setLoading(true);
      // Redirect to Google OAuth consent screen
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.REACT_APP_GOOGLE_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_GOOGLE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/drive.file`;
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      await axios.post('/api/cloud-backup/backup');
      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (fileId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/cloud-backup/download/${fileId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${fileId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (fileId) => {
    try {
      setLoading(true);
      await axios.delete(`/api/cloud-backup/${fileId}`);
      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleBackup = async () => {
    try {
      setLoading(true);
      await axios.post('/api/cloud-backup/schedule', { schedule });
      setScheduleDialog(false);
    } catch (error) {
      console.error('Error scheduling backup:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Cloud Backup
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={createBackup}
              disabled={loading}
            >
              Create Backup
            </Button>
            <Button
              variant="outlined"
              startIcon={<Schedule />}
              onClick={() => setScheduleDialog(true)}
              disabled={loading}
            >
              Schedule Backup
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchBackups}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup History
          </Typography>
          <List>
            {backups.map((backup) => (
              <ListItem key={backup.id}>
                <ListItemText
                  primary={backup.name}
                  secondary={new Date(backup.createdTime).toLocaleString()}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => downloadBackup(backup.id)}
                    disabled={loading}
                  >
                    <CloudDownload />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => deleteBackup(backup.id)}
                    disabled={loading}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)}>
        <DialogTitle>Schedule Backup</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Schedule</InputLabel>
            <Select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              label="Schedule"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button onClick={scheduleBackup} variant="contained">
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CloudBackup; 