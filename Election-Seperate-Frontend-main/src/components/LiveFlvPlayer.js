import React, { useEffect, useRef, useState } from "react";
import mpegts from "mpegts.js";
import ReactPlayer from "react-player";

// Plays live HTTP-FLV streams with mpegts.js.
// Unlike flv.js (used internally by ReactPlayer), mpegts.js can use Apple's
// ManagedMediaSource, so FLV also plays on iPhone (iOS 17.1+), not just Android.
// Non-FLV URLs, or browsers without any MSE, fall back to ReactPlayer.

const RETRY_DELAY_MS = 3000;

const isFlvUrl = (url) => /\.flv(\?|$)/i.test(url || "");

const canPlayFlv = () => {
  try {
    return mpegts.getFeatureList().mseLivePlayback;
  } catch (e) {
    return false;
  }
};

const LiveFlvPlayer = ({ url, controls = true, width = "100%", height = "100%" }) => {
  const videoRef = useRef(null);
  const [retryKey, setRetryKey] = useState(0);
  const [error, setError] = useState("");

  const useMpegts = isFlvUrl(url) && canPlayFlv();

  useEffect(() => {
    if (!useMpegts || !videoRef.current) return;

    setError("");
    const player = mpegts.createPlayer(
      { type: "flv", isLive: true, url },
      {
        enableWorker: false,
        enableStashBuffer: false,
        stashInitialSize: 128,
        lazyLoad: false,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 3,
        liveBufferLatencyMinRemain: 0.5,
      }
    );

    let retryTimer;
    player.on(mpegts.Events.ERROR, (type, detail) => {
      console.error("Live feed error:", type, detail);
      setError("Reconnecting to live feed...");
      retryTimer = setTimeout(() => setRetryKey((k) => k + 1), RETRY_DELAY_MS);
    });

    player.attachMediaElement(videoRef.current);
    player.load();
    const playPromise = player.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch((e) => console.warn("Autoplay blocked:", e));
    }

    return () => {
      clearTimeout(retryTimer);
      player.pause();
      player.unload();
      player.detachMediaElement();
      player.destroy();
    };
  }, [url, useMpegts, retryKey]);

  if (!useMpegts) {
    return (
      <ReactPlayer
        url={url}
        playing={true}
        muted={true}
        playsinline={true}
        controls={controls}
        width={width}
        height={height}
      />
    );
  }

  return (
    <div style={{ position: "relative", width, height, background: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls={controls}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      {error && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "#fff",
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default LiveFlvPlayer;
