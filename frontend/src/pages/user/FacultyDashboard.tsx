import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import { green, red, yellow, blue, grey } from '@mui/material/colors';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import axios from 'axios';
import UserMain from './UserMain';

interface Schedule {
  startTime: string;
  endTime:string;
  room: string;
}

const FacultyDashboard: React.FC = () => {
  const [nextSchedule, setNextSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const facultyId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchNextSchedule = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/auth/next-schedule/${facultyId}`);
        setNextSchedule(response.data);
      } catch (error) {
        console.error("No upcoming schedule or error:", error);
        setNextSchedule(null);
      } finally {
        setLoading(false);
      }
    };

    if (facultyId) {
      fetchNextSchedule();
    }
  }, [facultyId]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/auth/schedules/today/${facultyId}`);
        
        if (Array.isArray(response.data)) {
          setSchedules(response.data);
        }
      } catch (error) {
        console.error("Error fetching schedules for today:", error);
      }
    };

    fetchSchedules();
  }, [facultyId]);

  const formatTime = (timeStr: string) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <UserMain>
    <Box sx={{color: 'grey.900', p: { xs: 2, sm: 3, md: 1 } }}>
      <Box maxWidth="1200px" mx="auto">
        {/* Header */}
        <Box mb={6}>
          <Typography variant="h4" fontWeight={600}>
            Attendance
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            <span style={{ fontWeight: 400 }}>Dashboard</span> /{' '}
            <span style={{ fontStyle: 'italic' }}>Attendance</span>
          </Typography>
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={3} mb={6}>
          {/* Timesheet */}
          <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="subtitle2" color="primary" fontWeight={600}>
                Timesheet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {today}
              </Typography>
            </Box>

            <Box border="1px solid" borderColor="grey.300" borderRadius={1} p={2} mb={4}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Your next schedule:
              </Typography>
                {loading ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Loading...
                  </Typography>
                ) : nextSchedule ? (
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    {formatTime(nextSchedule.startTime)} at {nextSchedule.room}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    No upcoming schedule today
                  </Typography>
                )}
            </Box>

            <Box display="flex" justifyContent="center" mb={4}>
              {/* Circular progress (custom SVG) */}
              <svg width="96" height="96" viewBox="0 0 100 100" role="img" aria-label="Circular progress">
                <circle cx="50" cy="50" r="45" stroke={grey[300]} strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke={blue[600]}
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="282.6"
                  strokeDashoffset="182.6"
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="55"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fill="#111827"
                  fontFamily="Inter, sans-serif"
                >
                  3.45 hrs
                </text>
              </svg>
            </Box>

            <Button
              variant="contained"
              sx={{ backgroundColor: green[400], color: 'white', px: 3, py: 1, fontSize: 14, fontWeight: 600, mx: 'auto' }}
            >
              Punch Out
            </Button>

            <Box display="flex" justifyContent="space-between" fontSize={12} color="grey.700" fontWeight={600} mt={4} px={1}>
              <Box textAlign="center">
                <Typography variant="body2" fontSize="0.75rem">
                  BREAK
                </Typography>
                <Typography variant="body2" fontWeight={400}>
                  1.21 hrs
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" fontSize="0.75rem">
                  OVERTIME
                </Typography>
                <Typography variant="body2" fontWeight={400}>
                  3 hrs
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Statistics */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="primary" fontWeight={600} mb={2}>
              Statistics
            </Typography>
            {[
              { label: 'Today', value: 3.45, max: 8, color: green[400] },
              { label: 'This Week', value: 28, max: 40, color: red[500] },
              { label: 'This Month', value: 90, max: 160, color: yellow[700] },
              { label: 'Remaining', value: 90, max: 160, color: blue[600] },
              { label: 'Overtime', value: 5, max: 20, color: yellow[500] },
            ].map(({ label, value, max, color }) => (
              <Box key={label} mb={2}>
                <Typography fontSize={12} fontWeight={600} color="grey.700" mb={0.5}>
                  {label}
                </Typography>
                <Box display="flex" justifyContent="space-between" fontSize={12} color="grey.500" mb={0.5}>
                  <span>{value}</span>
                  <span>/ {max} hrs</span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(value / max) * 100}
                  sx={{ height: 8, borderRadius: 5, backgroundColor: grey[300], '& .MuiLinearProgress-bar': { backgroundColor: color } }}
                />
              </Box>
            ))}
          </Paper>

          {/* Today Activity */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="primary" fontWeight={600} mb={2}>
              Today Activity
            </Typography>
            <Box ml={1} pl={1} borderLeft={`2px solid ${green[300]}`} display="flex" flexDirection="column" gap={2}>
              {[
                'Punch In at 10.00 AM',
                'Punch Out at 11.00 AM',
                'Punch In at 11.30 AM',
                'Punch Out at 01.30 AM',
                'Punch In at 02.30 AM',
                'Punch In at 04.15 AM',
                'Punch Out at 07.00 AM',
              ].map((entry, index) => {
                const [label, time] = entry.split(' at ');
                return (
                  <Box key={index} position="relative" pl={3}>
                    <Box
                      position="absolute"
                      left={-12}
                      top={4}
                      width={10}
                      height={10}
                      borderRadius="50%"
                      bgcolor="white"
                      border={`2px solid ${green[400]}`}
                    />
                    <Typography fontWeight={600} fontSize={13}>
                      {label}
                    </Typography>
                    <Box display="flex" alignItems="center" color="grey.500">
                      <AccessTimeIcon sx={{ fontSize: 12, mr: 0.5 }} />
                      <Typography variant="caption">{time}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* Attendance Table */}
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: 'repeat(3, 1fr)' }} gap={3}>
          <Paper
            variant="outlined"
            sx={{ p: 3, gridColumn: { xs: 'span 1', lg: 'span 2' }, overflowX: 'auto' }}
          >
            <Typography variant="subtitle2" color="primary" fontWeight={600} mb={2}>
              Today's Schedule List
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: grey[100] }}>
                    <TableCell sx={{ fontWeight: 600 }}>S. No</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>End Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((schedule, idx) => (
                    <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? "white" : grey[50] }}>
                      <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                      <TableCell>{formatTime(schedule.startTime)}</TableCell>
                      <TableCell>{formatTime(schedule.endTime)}</TableCell>
                      <TableCell>{schedule.room}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
    </UserMain>
  );
};

export default FacultyDashboard;
