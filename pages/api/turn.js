// pages/api/turn.js
export default async function handler(req, res) {
  // Google STUN servers (free, no signup)
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ];

  // Respond with JSON containing the ICE servers
  res.status(200).json({ iceServers });
}
