import MessageForwardButton from './MessageForwardButton';

const Message = ({ message, currentUser }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: message.sender === currentUser.id ? 'flex-end' : 'flex-start',
        mb: 2
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '70%',
          backgroundColor: message.sender === currentUser.id ? 'primary.light' : 'background.paper',
          color: message.sender === currentUser.id ? 'primary.contrastText' : 'text.primary',
          borderRadius: 2
        }}
      >
        {/* Message content */}
        <Typography variant="body1">{message.content}</Typography>

        {/* Message metadata */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            mt: 1,
            gap: 1
          }}
        >
          {/* Forward history button */}
          {message.type === 'forwarded' && (
            <MessageForwardButton
              messageId={message._id}
              forwardCount={message.forwardCount || 0}
            />
          )}

          {/* Timestamp */}
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Message; 