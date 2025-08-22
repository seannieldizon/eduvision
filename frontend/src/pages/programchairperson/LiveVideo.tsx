import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import axios from "axios";
import AdminMain from "./AdminMain";
import { Tooltip } from "@mui/material";
import dayjs from "dayjs";
import Hls from "hls.js";
import WHEPClient from "whep-client";

interface Schedule {
  courseTitle: string;
  courseCode: string;
  instructor: {
    first_name: string;
    last_name: string;
  };
  room: string;
  startTime: string;
  endTime: string;
  semesterStartDate: string;
  semesterEndDate: string;
  section: {
    course: string;
    section: string;
    block: string;
  };
  days: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
}

interface Log {
  _id: string;
  schedule: Schedule;
  date: string;
  status: string;
  timeIn?: string;
  timeout?: string;
  remarks: string;
  college: string | null;
  course: string;
}

function getTimeFromTick(hourIndex: number, tickIndex: number, minutesPerTick = 5): string {
  const baseHour = 6;
  const totalMinutes = (baseHour + hourIndex) * 60 + tickIndex * minutesPerTick;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}



const LiveVideo: React.FC = () => {
  const [labs, setLabs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState("Lab 1");
  const timelineRef = useRef<HTMLDivElement>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentMinutesSinceStart, setCurrentMinutesSinceStart] = useState<number | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const resourceUrlRef = useRef<string | null>(null); // for cleanup
  const CourseName = localStorage.getItem("course") ?? "";
  const ShortCourseName = CourseName.replace(/^bs/i, "").toUpperCase();

  const timeLabels = [
    "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM",
    "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM"
  ];
  

   const startStream = async () => {
    if (!videoRef.current) return;

    // stop any previous connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Create PeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // Attach remote track
   pc.ontrack = (event) => {
  console.log("Remote track received:", event.streams);
  if (videoRef.current) {
    videoRef.current.srcObject = event.streams[0];
  }
};

    // Create SDP offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait until ICE gathering is complete
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") resolve();
      else {
        pc.addEventListener("icegatheringstatechange", () => {
          if (pc.iceGatheringState === "complete") resolve();
        });
      }
    });

    // Send SDP offer to WHEP endpoint
    const whepUrl = "http://localhost:8889/hikvision/";
    const res = await fetch(whepUrl, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: pc.localDescription?.sdp,
    });

    if (!res.ok) {
      throw new Error("Failed to connect to WHEP endpoint");
    }

    // Get SDP answer
    const answerSDP = await res.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

    console.log("WebRTC stream started");
  };

  useEffect(() => {
    startStream().catch((err) => {
      console.error("WebRTC error:", err);
    });

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);
    
  return (
    <AdminMain>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" fontWeight="bold" color="#333">
          Live Face Recognition Feed
        </Typography>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="lab-select-label">Select Lab</InputLabel>
          <Select
            labelId="lab-select-label"
            value={selectedLab}
            //onChange={handleLabChange}
            label="Select Lab"
          >
            {labs.map((lab) => (
              <MenuItem key={lab._id} value={lab.name}>
                {lab.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box
        sx={{
          display: "flex",
          height: "70vh",
          mt: 4,
          width: "100%",
        }}
      >
        {/* Video Stream (2/3) */}
        <Box sx={{ flex: 2, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls
            style={{
              width: "100%",
              maxWidth: "800px",
              height: "100%",
              objectFit: "cover",
              borderRadius: "10px",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
            }}
          />
        </Box>  

        {/* Scrollable Timeline (1/3) */}
        <Box
          sx={{
            flex: 1,
            pl: 2,
            pr: 4,
            overflowY: "scroll",
            maxHeight: "100%",
            position: "relative",
          }}
          ref={timelineRef}
        >
          {currentMinutesSinceStart !== null && (
            <Box
              sx={{
                position: "absolute",
                right: "32px",
                width:"50%",
                top: `${(currentMinutesSinceStart / 5) * 46.02}px`,
                height: "2px",
                backgroundColor: "red",
                zIndex: 10,
              }}
            />
          )}

{logs.map((log) => {
  const time = log.timeIn ?? log.timeout;
  if (!time) return null;

  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const totalMinutesSinceStart = (hour - 6) * 60 + minute;

  // Skip times outside the 6 AM – 7 PM window
  if (totalMinutesSinceStart < 0 || totalMinutesSinceStart > 780) return null;

  const topOffset = (totalMinutesSinceStart / 5) * 46.02;

  return (
    <Box
      key={log._id}
      sx={{
        position: "absolute",
        top: `${topOffset}px`,
        left: "0",
        right: "0",
        display: "flex",
        justifyContent: "flex-end",
        pr: 1,
        zIndex: 5,
      }}
    >
      <Box
        sx={{
          backgroundColor: "#E5383B",
          color: "white",
          px: 1.5,
          py: 0.5,
          fontSize: "12px",
          borderRadius: "4px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          maxWidth: "70%",
          wordWrap: "break-word",
        }}
      >
        {log.status}
      </Box>
    </Box>
  );
})}


          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {timeLabels.map((label, index) => (
              <Box key={index}>
                {[...Array(12)].map((_, tickIndex) => (
                  <React.Fragment key={`${index}-tick-${tickIndex}`}>
                    {/* Main tick (every 10min = 12 per hour) */}
                    <Box
                      sx={{
                        height: "6px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      {tickIndex === 0 ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            noWrap
                            sx={{ minWidth: 100, textAlign: "right" }}
                            fontWeight="bold"
                          >
                            {(() => {
                              const schedule = schedules.find((sched) => {
                                const schedHour = parseInt(sched.startTime.split(":")[0]);
                                const isAM = schedHour < 12;
                                const hour12 = schedHour % 12 === 0 ? 12 : schedHour % 12;
                                const labelTime = `${hour12} ${isAM ? "AM" : "PM"}`;
                                return label === labelTime && sched.room === selectedLab;
                              });

                              return schedule
                                ? `${schedule.courseCode} - ${label}`
                                : label;
                            })()}
                          </Typography>
                          <Box
                            sx={{
                              width: "40px",
                              height: "2px",
                              backgroundColor: "#555",
                            }}
                          />
                        </Box>
                      ) : (
                        // Render short tick only if it's not after 7 PM
                        label !== "7 PM" && (
                          <Tooltip title={getTimeFromTick(index, tickIndex)} arrow placement="right">
                            <Box
                              data-time={getTimeFromTick(index, tickIndex)}
                              aria-label={`Time: ${getTimeFromTick(index, tickIndex)}`}
                              sx={{
                                width: "30px",
                                height: "1.5px",
                                backgroundColor: "#999",
                                cursor: "pointer",          // 👈 Helps with hover
                                minHeight: "2px",          // 👈 Expand hit area
                                position: "relative",       // 👈 Helps for tooltip positioning
                                "&:hover": {
                                  backgroundColor: "#333",  // 👈 Visual feedback (optional)
                                }
                              }}
                            />
                          </Tooltip>
                          
                        )
                      )}
                    </Box>

                    {/* Render mini ticks only if not after 7 PM and not last main tick */}
                    {label !== "7 PM" && tickIndex < 12 &&
                    [...Array(4)].map((_, miniIndex) => {
                      const minutesPerTick = 5;
                      const miniTickOffset = miniIndex + 1; // mini tick at +1 to +4 minutes
                      const timeString = getTimeFromTick(index, tickIndex, minutesPerTick) // base time
                        .split(":")
                        .map((val, i) => (i === 1 ? (parseInt(val) + miniTickOffset).toString().padStart(2, "0") : val))
                        .join(":")
                        .replace(/:(\d{2}) /, (_, m) => `:${Math.min(parseInt(m), 59)} `); // prevent 60+

                      return (
                        <Tooltip key={`${index}-tick-${tickIndex}-mini-${miniIndex}`} title={timeString} arrow placement="right">
                          <Box
                            sx={{
                              height: "6px",
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              minHeight: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <Box
                              sx={{
                                width: "20px",
                                height: "1px",
                                backgroundColor: "#ccc",
                                "&:hover": {
                                  backgroundColor: "#999",
                                }
                              }}
                            />
                          </Box>
                        </Tooltip>
                      );
                    })}

                  </React.Fragment>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </AdminMain>
  );
};

export default LiveVideo;
