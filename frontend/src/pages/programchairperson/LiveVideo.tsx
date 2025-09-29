import React, { useEffect, useRef, useState } from "react";
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AdminMain from "./AdminMain";

type FaceDetection = {
  box: [number, number, number, number]; // [x, y, w, h]
  name?: string | null;
};

const LiveVideo: React.FC = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [faces, setFaces] = useState<FaceDetection[]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080"); // recognizer.py stream
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // --- Video frame ---
        const blob = new Blob([event.data], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        if (imgRef.current) imgRef.current.src = url;
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        // --- JSON detections ---
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "detections") {
            setFaces(msg.faces || []);
          }
        } catch (e) {
          console.error("Bad JSON:", event.data);
        }
      }
    };

    ws.onerror = (err) => console.error("❌ WebSocket error:", err);
    ws.onclose = () => console.log("❌ WebSocket closed");

    return () => ws.close();
  }, []);

  // Draw detections (boxes + names)
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sync canvas size with image size
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "lime";

    faces.forEach((f) => {
      const [x, y, w, h] = f.box;
      ctx.strokeRect(x, y, w, h);
      ctx.fillText(f.name || "Unknown", x, y - 8);
    });
  }, [faces]);

  return (
    <AdminMain>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#333">
          Live Face Recognition Feed
        </Typography>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="lab-select-label">Select Lab</InputLabel>
          <Select labelId="lab-select-label" value="Lab 1" label="Select Lab">
            <MenuItem value="Lab 1">Lab 1</MenuItem>
            <MenuItem value="Lab 2">Lab 2</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ position: "relative", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
        <img
          ref={imgRef}
          alt="Live Stream"
          style={{
            width: "100%",
            height: "70vh",
            objectFit: "cover",
            borderRadius: "10px",
            boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "70vh",
            pointerEvents: "none", // overlay only
          }}
        />
      </Box>
    </AdminMain>
  );
};

export default LiveVideo;
