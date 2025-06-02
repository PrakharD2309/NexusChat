import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Share as ShareIcon,
  Forward as ForwardIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const MessageForwardHistory = ({ messageId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`/api/forward/${messageId}/history`);
        setHistory(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load message history');
        setLoading(false);
      }
    };

    fetchHistory();
  }, [messageId]);

  const renderHistoryItem = (item, index) => {
    const isOriginal = index === history.length - 1;
    
    return (
      <ListItem
        key={item.message._id}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          py: 2,
          backgroundColor: isOriginal ? 'rgba(25, 118, 210, 0.08)' : 'transparent'
        }}
      >
        <ListItemAvatar>
          <Avatar
            src={item.sender.profilePicture}
            alt={item.sender.username}
          />
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" component="span">
                {item.sender.username}
              </Typography>
              {isOriginal && (
                <Chip
                  size="small"
                  label="Original Sender"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {item.message.content}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </Typography>
              </Box>
            </Box>
          }
        />
      </ListItem>
    );
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ForwardIcon color="primary" />
          <Typography variant="h6">Message Forward History</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <Typography color="text.secondary">Loading history...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              backgroundColor: 'background.default',
              borderRadius: 2
            }}
          >
            <List sx={{ py: 0 }}>
              {history.map((item, index) => (
                <React.Fragment key={item.message._id}>
                  {renderHistoryItem(item, index)}
                  {index < history.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageForwardHistory; 