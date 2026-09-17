import React, { useEffect, useState, useRef } from 'react';
import Peer from 'simple-peer';
import { useCallStore } from '../../stores/useCallStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const CallModal = () => {
    const { 
        isCallIncoming, isCallActive, isCallEnded, 
        callType, callerInfo, 
        callerSignal,
        setCallAccepted, setCallEnded, rejectCall 
    } = useCallStore();

    const { user, socket } = useAuthStore();
    
    const [stream, setStream] = useState(null);
    const [callAcceptedState, setCallAcceptedState] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    // 1. Handle user media (Camera/Mic)
    useEffect(() => {
        if (isCallIncoming || isCallActive) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((currentStream) => {
                    setStream(currentStream);
                    if (myVideo.current) {
                        myVideo.current.srcObject = currentStream;
                    }
                })
                .catch(err => {
                    console.error("Failed to get media", err);
                    alert("Could not access camera or microphone");
                    setCallEnded();
                });
        } else {
             // Stop stream if call ended
             if (stream) {
                 stream.getTracks().forEach(track => track.stop());
                 setStream(null);
             }
        }
    }, [isCallIncoming, isCallActive]);

    // 2. Initiate Call (Caller Side)
    useEffect(() => {
        if (isCallActive && !isCallIncoming && stream && !connectionRef.current) {
             const peer = new Peer({ initiator: true, trickle: false, stream: stream });

             peer.on('signal', (data) => {
                 socket.emit('callUser', {
                     userToCall: callerInfo.id,
                     signalData: data,
                     from: user._id, // Caller ID
                     name: user.displayName || user.username,
                     isVideo: callType === 'video'
                 });
             });

             peer.on('stream', (currentStream) => {
                 if (userVideo.current) {
                     userVideo.current.srcObject = currentStream;
                 }
             });

             socket.on('callAccepted', (signal) => {
                 setCallAcceptedState(true);
                 peer.signal(signal);
             });

             connectionRef.current = peer;
        }
    }, [isCallActive, isCallIncoming, stream, callerInfo]);

    // 2. Handle Incoming Call Answer
    const answerCall = () => {
        setCallAcceptedState(true);
        // Notify store
        setCallAccepted(); 

        const peer = new Peer({ initiator: false, trickle: false, stream: stream });

        peer.on('signal', (data) => {
            socket.emit('answerCall', { signal: data, to: callerInfo.id });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    // 3. Handle Leaving Call
    const leaveCall = () => {
        setCallEnded();
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        socket.emit('endCall', { to: callerInfo?.id }); // Ensure we tell the other side
        // window.location.reload(); // Brute force cleanup if needed, but try state first
    };

    if (!isCallIncoming && !isCallActive) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
        }}>
            
            <div style={{display: 'flex', gap: '2rem', marginBottom: '2rem'}}>
                {/* My Video */}
                {stream && (
                    <div style={{textAlign: 'center'}}>
                        <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px', borderRadius: '1rem', border: '2px solid #333' }} />
                        <p>You</p>
                    </div>
                )}
                
                {/* Other User Video */}
                {callAcceptedState && !isCallEnded && (
                    <div style={{textAlign: 'center'}}>
                        <video playsInline ref={userVideo} autoPlay style={{ width: '300px', borderRadius: '1rem', border: '2px solid #333' }} />
                        <p>{callerInfo?.name}</p>
                    </div>
                )}
            </div>

            {/* Outgoing Call Prompt */}
            {!isCallIncoming && !callAcceptedState && (
                <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <h2>Calling {callerInfo?.name}...</h2>
                    <br />
                     <button onClick={() => leaveCall()} style={{padding: '1rem', borderRadius: '50%', border: 'none', background: '#e74c3c', color: 'white'}}>
                        <PhoneOff />
                    </button>
                </div>
            )}

            {/* Incoming Call Prompt */}
            {isCallIncoming && !callAcceptedState && (
                <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <img src={user.avatarURL || '/favicon.png'} style={{width: 80, height: 80, borderRadius: '50%', marginBottom: '1rem'}} />
                    <h2>{callerInfo?.name} is calling...</h2>
                    <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem'}}>
                        <button 
                            onClick={answerCall}
                            style={{padding: '1rem 2rem', borderRadius: '2rem', border: 'none', background: '#2ecc71', color: 'white', cursor: 'pointer', fontSize: '1.2rem'}}
                        >
                            Answer
                        </button>
                        <button 
                            onClick={rejectCall}
                            style={{padding: '1rem 2rem', borderRadius: '2rem', border: 'none', background: '#e74c3c', color: 'white', cursor: 'pointer', fontSize: '1.2rem'}}
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}

            {/* Call Controls */}
            {callAcceptedState && !isCallEnded && (
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => { setMicOn(!micOn); /* Note: Logic to toggle track needed */ }} style={{padding: '1rem', borderRadius: '50%', border: 'none', background: micOn ? '#34495e' : '#e74c3c', color: 'white'}}>
                        {micOn ? <Mic /> : <MicOff />}
                    </button>
                    <button onClick={() => leaveCall()} style={{padding: '1rem', borderRadius: '50%', border: 'none', background: '#e74c3c', color: 'white'}}>
                        <PhoneOff />
                    </button>
                    <button onClick={() => { setCameraOn(!cameraOn); /* Logic needed */ }} style={{padding: '1rem', borderRadius: '50%', border: 'none', background: cameraOn ? '#34495e' : '#e74c3c', color: 'white'}}>
                        {cameraOn ? <Video /> : <VideoOff />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CallModal;
