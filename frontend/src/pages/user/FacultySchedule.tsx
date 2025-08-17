import React, { useEffect, useRef, useState } from "react";
import {
  Typography,
  Box,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";

import UserMain from "./UserMain";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

interface ScheduleItem {
  courseCode: string;
  courseTitle: string;
  startTime: string;
  endTime: string;
  semesterStartDate: string;
  semesterEndDate: string;
  days: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
  };
  room?: string;
}

const FacultySchedule: React.FC = () => {
  const calendarRef = useRef<any>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [labs, setLabs] = useState<{ _id: string; name: string }[]>([]);
  const [selectedLab, setSelectedLab] = useState<string>("Lab 1");
  const [calendarView, setCalendarView] = useState<string>("timeGridWeek");

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>("");

  const handleViewChange = (event: any) => {
    const view = event.target.value;
    setCalendarView(view);
    calendarRef.current?.getApi().changeView(view);
    setCurrentTitle(calendarRef.current?.getApi().view?.title);
  };

  const handleDateSelect = (date: Dayjs | null) => {
    setSelectedDate(date);
    if (date) {
      calendarRef.current?.getApi().gotoDate(date.toDate());
      setCurrentTitle(calendarRef.current?.getApi().view?.title);
    }
  };

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
    setCurrentTitle(calendarRef.current?.getApi().view?.title);
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
    setCurrentTitle(calendarRef.current?.getApi().view?.title);
  };

  useEffect(() => {
    if (calendarRef.current) {
      setCurrentTitle(calendarRef.current?.getApi().view?.title);
    }
  }, [calendarView]);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const facultyId = localStorage.getItem("userId");
        if (!facultyId || !selectedLab) return;
  
        const { data } = await axios.get(
          `https://eduvision-dura.onrender.com/api/auth/faculty-schedules/${facultyId}`
        );
  
        const filteredSchedules = data.filter(
          (schedule: ScheduleItem) => schedule.room === selectedLab
        );
  
        const allEvents: any[] = [];
  
        filteredSchedules.forEach((schedule: ScheduleItem) => {
          const {
            startTime,
            endTime,
            semesterStartDate,
            semesterEndDate,
            courseTitle,
            courseCode,
            days,
            room,
          } = schedule;
  
          const startDate = new Date(semesterStartDate);
          const endDate = new Date(semesterEndDate);
  
          const daysMap = {
            mon: 1,
            tue: 2,
            wed: 3,
            thu: 4,
            fri: 5,
            sat: 6,
          };
  
          for (const [dayKey, dayNum] of Object.entries(daysMap)) {
            if (days[dayKey as keyof typeof days]) {
              let current = new Date(startDate);
  
              while (current <= endDate) {
                if (current.getDay() === dayNum) {
                  const dateStr = current.toISOString().split("T")[0];
                  allEvents.push({
                    title:
                      calendarView === "dayGridMonth"
                        ? courseCode
                        : `${courseTitle} ${room ? `(${room})` : ""}`,
                    start: `${dateStr}T${startTime}`,
                    end: `${dateStr}T${endTime}`,
                  });
                }
                current.setDate(current.getDate() + 1);
              }
            }
          }
        });
  
        setEvents(allEvents);
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    };
  
    fetchSchedule();
  }, [selectedLab, calendarView]); // <-- Add calendarView here!
  
  

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const { data } = await axios.get("https://eduvision-dura.onrender.com/api/auth/rooms");
        setLabs(data);
        if (data.length > 0 && !selectedLab) {
          setSelectedLab(data[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch labs:", error);
      }
    };
  
    fetchLabs();
  }, []);
  

  return (
    <UserMain>
      <Typography variant="h4" fontWeight="bold" color="#333" mb={3}>
        Welcome to your schedule!
      </Typography>

      <Box sx={{ backgroundColor: "#fff", borderRadius: 2, p: 2, boxShadow: 2 }}>
        {/* Custom Toolbar */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              textAlign: "left",
              display: "flex",
              alignItems: "center",
            }}
          >
            {currentTitle}
            <IconButton
              color="primary"
              sx={{ ml: 1 }}
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <CalendarTodayIcon />
            </IconButton>
            {showDatePicker && (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={selectedDate}
                  onChange={handleDateSelect}
                  views={["year", "month", "day"]}
                  slotProps={{ textField: { size: "small" } }}
                  sx={{ ml: 1 }}
                />
              </LocalizationProvider>
            )}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={handlePrev} color="primary">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={handleNext} color="primary">
              <ChevronRightIcon />
            </IconButton>

            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel>Lab</InputLabel>
              <Select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                label="Lab"
              >
                {labs.map((lab) => (
                  <MenuItem key={lab._id} value={lab.name}>
                    {lab.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl variant="outlined" sx={{ minWidth: 150 }}>
              <InputLabel>View</InputLabel>
              <Select
                label="View"
                name="view"
                value={calendarView}
                onChange={handleViewChange}
              >
                <MenuItem value="dayGridMonth">Month</MenuItem>
                <MenuItem value="timeGridWeek">Week</MenuItem>
                <MenuItem value="timeGridDay">Day</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={calendarView}
          headerToolbar={false} // We use custom header
          slotMinTime="07:00:00"
          slotMaxTime="18:00:00"
          expandRows={true}
          selectable={true}
          editable={false}
          events={events}
        />
      </Box>
    </UserMain>
  );
};

export default FacultySchedule;
