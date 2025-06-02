import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const VideoCall = ({ roomId, onEndCall }) => {
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callRejected, setCallRejected] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    // Get user media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
      });

    // Socket event listeners
    socket.on('callUser', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socket.on('callEnded', () => {
      leaveCall();
    });

    socket.on('callRejected', () => {
      setCallRejected(true);
      setTimeout(() => {
        leaveCall();
      }, 2000);
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      socket.off('callUser');
      socket.off('callEnded');
      socket.off('callRejected');
    };
  }, [socket]);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: user.id,
        name: user.name
      });
    });

    peer.on('stream', (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: caller });
    });

    peer.on('stream', (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallAccepted(false);
    setReceivingCall(false);
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.emit('endCall', { userToCall: caller });
    onEndCall();
  };

  const rejectCall = () => {
    socket.emit('rejectCall', { userToCall: caller });
    setReceivingCall(false);
    onEndCall();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl">
        {callRejected && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg">
            Call was rejected
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              className="w-full rounded-lg"
            />
            <div className="absolute bottom-2 left-2 text-white text-sm">
              You
            </div>
          </div>
          {callAccepted && (
            <div className="relative">
              <video
                playsInline
                ref={userVideo}
                autoPlay
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-2 left-2 text-white text-sm">
                {caller}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${
              isMuted ? 'bg-red-500' : 'bg-gray-700'
            } text-white`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoOff ? 'bg-red-500' : 'bg-gray-700'
            } text-white`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <button
            onClick={leaveCall}
            className="p-3 rounded-full bg-red-500 text-white"
            title="End call"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>

        {receivingCall && !callAccepted && (
          <div className="mt-4 text-center">
            <p className="text-white mb-2">{caller} is calling...</p>
            <button
              onClick={answerCall}
              className="bg-green-500 text-white px-4 py-2 rounded-lg mr-2"
            >
              Answer
            </button>
            <button
              onClick={rejectCall}
              className="bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall; 