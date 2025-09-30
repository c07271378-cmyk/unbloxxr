import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [roomId] = useState("default-room");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const channelRef = useRef(null);

  // join chat + signaling channel
  useEffect(() => {
    const channel = supabase.channel("room:" + roomId, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setMessages((msgs) => [...msgs, payload]);
      })
      .on("broadcast", { event: "webrtc" }, async ({ payload }) => {
        if (!pcRef.current) await setupPeer();

        if (payload.type === "offer") {
          await pcRef.current.setRemoteDescription(payload.sdp);
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          channel.send({
            type: "broadcast",
            event: "webrtc",
            payload: { type: "answer", sdp: ans },
          });
        } else if (payload.type === "answer") {
          await pcRef.current.setRemoteDescription(payload.sdp);
        } else if (payload.type === "candidate") {
          try {
            await pcRef.current.addIceCandidate(payload.candidate);
          } catch (err) {
            console.error("Error adding ICE candidate", err);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // send chat message
  const sendMessage = () => {
    if (!input) return;
    channelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: { text: input, time: Date.now() },
    });
    setInput("");
  };

  // setup peer connection
  async function setupPeer() {
    if (pcRef.current) return pcRef.current;

    const turnRes = await fetch("/api/turn");
    const { iceServers } = await turnRes.json();

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channelRef.current.send({
          type: "broadcast",
          event: "webrtc",
          payload: { type: "candidate", candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pcRef.current = pc;
    return pc;
  }

  // start call
  const startCall = async () => {
    const pc = await setupPeer();

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    channelRef.current.send({
      type: "broadcast",
      event: "webrtc",
      payload: { type: "offer", sdp: offer },
    });
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>Group Chat + Call</h1>

      {/* chat box */}
      <div style={{ border: "1px solid #ccc", padding: 10, height: 200, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <b>User:</b> {m.text}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type message..."
      />
      <button onClick={sendMessage}>Send</button>

      <hr />

      {/* call section */}
      <div>
        <button onClick={startCall}>Start Call</button>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <video ref={localVideoRef} autoPlay muted playsInline width="200" />
          <video ref={remoteVideoRef} autoPlay playsInline width="200" />
        </div>
      </div>
    </div>
  );
}
