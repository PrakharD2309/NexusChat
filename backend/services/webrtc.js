const EventEmitter = require('events');

class WebRTCService extends EventEmitter {
  constructor() {
    super();
    this.activeCalls = new Map();
    this.iceCandidates = new Map();
  }

  handleCallRequest(callerId, recipientId, signalData) {
    const callId = this.generateCallId(callerId, recipientId);
    
    this.activeCalls.set(callId, {
      callerId,
      recipientId,
      startTime: new Date(),
      status: 'pending',
      signalData
    });

    return callId;
  }

  handleCallAccept(callId, signalData) {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    call.status = 'active';
    call.answerSignal = signalData;
    this.activeCalls.set(callId, call);

    return call;
  }

  handleCallReject(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    call.status = 'rejected';
    call.endTime = new Date();
    this.activeCalls.set(callId, call);

    return call;
  }

  handleCallEnd(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    call.status = 'ended';
    call.endTime = new Date();
    this.activeCalls.set(callId, call);

    return call;
  }

  addIceCandidate(callId, userId, candidate) {
    if (!this.iceCandidates.has(callId)) {
      this.iceCandidates.set(callId, new Map());
    }

    const candidates = this.iceCandidates.get(callId);
    if (!candidates.has(userId)) {
      candidates.set(userId, []);
    }

    candidates.get(userId).push(candidate);
  }

  getIceCandidates(callId, userId) {
    const candidates = this.iceCandidates.get(callId);
    return candidates ? candidates.get(userId) || [] : [];
  }

  cleanupCall(callId) {
    this.activeCalls.delete(callId);
    this.iceCandidates.delete(callId);
  }

  getActiveCall(callId) {
    return this.activeCalls.get(callId);
  }

  getActiveCallsByUser(userId) {
    return Array.from(this.activeCalls.entries())
      .filter(([_, call]) => call.callerId === userId || call.recipientId === userId)
      .map(([callId, call]) => ({ callId, ...call }));
  }

  generateCallId(callerId, recipientId) {
    return [callerId, recipientId].sort().join('-') + '-' + Date.now();
  }

  isUserInCall(userId) {
    return Array.from(this.activeCalls.values()).some(
      call => (call.callerId === userId || call.recipientId === userId) && call.status === 'active'
    );
  }
}

module.exports = new WebRTCService(); 