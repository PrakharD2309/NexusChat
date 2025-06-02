import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useDropzone } from 'react-dropzone';
import { 
  PaperAirplaneIcon, 
  PhoneIcon, 
  VideoCameraIcon,
  PaperClipIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const socket = io('http://localhost:5000');

function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [stream, setStream] = useState(null);
  const [call, setCall] = useState(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFileDrop,
    multiple: false
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    socket.emit('user:join', currentUser);

    socket.on('users:list', (usersList) => {
      setUsers(usersList.filter(user => user.id !== currentUser.id));
    });

    socket.on('message:receive', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('call:receive', ({ from, signal, isVideo }) => {
      setCall({ from, signal, isVideo });
    });

    return () => {
      socket.off('users:list');
      socket.off('message:receive');
      socket.off('call:receive');
    };
  }, [currentUser, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleFileDrop(acceptedFiles) {
    const file = acceptedFiles[0];
    if (!file || !selectedUser) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      const message = {
        sender: currentUser.id,
        receiver: selectedUser.id,
        type: 'file',
        content: data.fileUrl,
        fileName: file.name
      };

      socket.emit('message:send', message);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const message = {
      sender: currentUser.id,
      receiver: selectedUser.id,
      type: 'text',
      content: newMessage
    };

    socket.emit('message:send', message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const startCall = async (isVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideo, 
        audio: true 
      });
      setStream(stream);
      setIsVideoCall(isVideo);
      setIsCallActive(true);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream
      });

      peer.on('signal', (data) => {
        socket.emit('call:send', {
          userToCall: selectedUser.id,
          signalData: data,
          from: currentUser.id,
          isVideo
        });
      });

      peer.on('stream', (remoteStream) => {
        userVideo.current.srcObject = remoteStream;
      });

      connectionRef.current = peer;
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: call.isVideo, 
        audio: true 
      });
      setStream(stream);
      setIsVideoCall(call.isVideo);
      setIsCallActive(true);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream
      });

      peer.on('signal', (data) => {
        socket.emit('call:answer', {
          signal: data,
          to: call.from
        });
      });

      peer.on('stream', (remoteStream) => {
        userVideo.current.srcObject = remoteStream;
      });

      peer.signal(call.signal);
      connectionRef.current = peer;
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    setIsCallActive(false);
    setStream(null);
    setCall(null);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Chats</h2>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-4rem)]">
          {users.map(user => (
            <div
              key={user.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                selectedUser?.id === user.id ? 'bg-gray-100' : ''
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{selectedUser.name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => startCall(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <PhoneIcon className="h-6 w-6 text-gray-600" />
                </button>
                <button
                  onClick={() => startCall(true)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <VideoCameraIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages
                .filter(
                  msg =>
                    (msg.sender === currentUser.id && msg.receiver === selectedUser.id) ||
                    (msg.sender === selectedUser.id && msg.receiver === currentUser.id)
                )
                .map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.sender === currentUser.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === currentUser.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {message.type === 'text' ? (
                        <p>{message.content}</p>
                      ) : message.type === 'file' ? (
                        <a
                          href={message.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2"
                        >
                          <PaperClipIcon className="h-5 w-5" />
                          <span>{message.fileName}</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <div {...getRootProps()} className="flex-shrink-0">
                  <input {...getInputProps()} />
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <PaperClipIcon className="h-6 w-6 text-gray-600" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <PaperAirplaneIcon className="h-6 w-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a user to start chatting</p>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {call && !isCallActive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4">
              Incoming {call.isVideo ? 'Video' : 'Voice'} Call
            </h3>
            <div className="flex space-x-4">
              <button
                onClick={answerCall}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Answer
              </button>
              <button
                onClick={() => setCall(null)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call */}
      {isCallActive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[800px] h-[600px] relative">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="relative">
                <video
                  ref={myVideo}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  You
                </div>
              </div>
              <div className="relative">
                <video
                  ref={userVideo}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  {selectedUser?.name}
                </div>
              </div>
            </div>
            <button
              onClick={endCall}
              className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat; 