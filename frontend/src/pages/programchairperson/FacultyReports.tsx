import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Chip,
} from "@mui/material";
import AdminMain from "./AdminMain";
import axios from "axios";
import Swal from "sweetalert2";

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: "right";
  format?: (value: number) => string;
}

interface AttendanceRow {
  name: string;
  courseCode: string;
  courseTitle: string;
  attendedHours: number;
  totalHours: number;
  room: string;
  absences: number;
  late: number;
}

const columns: readonly Column[] = [
  { id: "name", label: "Instructor Name", minWidth: 120 },
  { id: "courseCode", label: "Course Code", minWidth: 50 },
  { id: "courseTitle", label: "Course Title", minWidth: 120 },
  { id: "attendedHours", label: "Attended Hours", minWidth: 100 },
  { id: "totalHours", label: "Total Hours", minWidth: 80 },
  { id: "room", label: "Room", minWidth: 70 },
  { id: "absences", label: "No. of Absences", minWidth: 100 },
  { id: "late", label: "No. of Late", minWidth: 100 },
];

const FacultyReports: React.FC = () => {
  const CourseName = localStorage.getItem("course") ?? "";

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post(
          "http://localhost:5000/api/auth/show-monthly-department-logs",
          { CourseName }
        );

        if (response.data.success) {
          const groupedData: Record<string, any> = {};

          response.data.data.forEach((log: any) => {
            const instructorName = `${
              log.schedule?.instructor?.last_name ?? ""
            }, ${log.schedule?.instructor?.first_name ?? ""} ${
              log.schedule?.instructor?.middle_name
                ? log.schedule.instructor.middle_name.charAt(0) + "."
                : ""
            }`.trim();
            const key = `${log.schedule._id}`;

            let sessionHours = 0;
            if (log.schedule?.startTime && log.schedule?.endTime) {
              const [startH, startM] = log.schedule.startTime
                .split(":")
                .map(Number);
              const [endH, endM] = log.schedule.endTime.split(":").map(Number);
              if (
                !isNaN(startH) &&
                !isNaN(startM) &&
                !isNaN(endH) &&
                !isNaN(endM)
              ) {
                sessionHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
              }
            }

            if (!groupedData[key]) {
              groupedData[key] = {
                name: instructorName,
                courseCode: log.schedule.courseCode,
                courseTitle: log.schedule.courseTitle,
                attendedHours: 0,
                totalHours: 0,
                room: log.schedule.room,
                absences: 0,
                late: 0,
              };
            }

            groupedData[key].totalHours += sessionHours;

            let attendedHours = 0;
            if (log.timeIn && log.timeout) {
              const [inH, inM] = log.timeIn.split(":").map(Number);
              const [outH, outM] = log.timeout.split(":").map(Number);
              if (!isNaN(inH) && !isNaN(inM) && !isNaN(outH) && !isNaN(outM)) {
                attendedHours = (outH * 60 + outM - (inH * 60 + inM)) / 60;

                attendedHours = Number(attendedHours.toFixed(3));
              }
            }
            groupedData[key].attendedHours += attendedHours;

            if (log.status?.toLowerCase() === "absent")
              groupedData[key].absences += 1;
            if (log.status?.toLowerCase() === "late")
              groupedData[key].late += 1;
          });

          setRows(Object.values(groupedData) as any[]);
        }
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
      }
    };

    fetchData();
  }, [CourseName]);

  const handleGenerateReport = async () => {
    try {
      Swal.fire({
        title: "Generating Report...",
        text: "Please wait while we prepare your report.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await axios.post(
        "http://localhost:5000/api/auth/generate-monthly-department-logs",
        { CourseName },
        { responseType: "blob" }
      );

      const CollegeName = localStorage.getItem("college") ?? "College";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${CollegeName}_MonthlyAttendanceReport.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Report Ready",
        text: "Your report has been downloaded successfully.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to generate report. Please try again.",
      });
    }
  };

  return (
    <AdminMain>
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Header */}
        <Box textAlign="center">
          <Typography variant="h4" fontWeight={700}>
            📊 Faculty Monthly Report
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Attendance summary of faculty members for the current month
          </Typography>
        </Box>

        {/* Table */}
        <Paper
          elevation={4}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        backgroundColor: "#f1f3f4", // ✅ light gray header
                        color: "#333", // ✅ dark gray text
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      No attendance records available for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, idx) => (
                      <TableRow
                        hover
                        key={idx}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? "#fafafa" : "white",
                        }}
                      >
                        {columns.map((column) => {
                          const value = (row as any)[column.id];
                          if (column.id === "absences") {
                            return (
                              <TableCell key={column.id}>
                                <Chip
                                  label={value}
                                  color={value > 0 ? "error" : "default"}
                                  size="small"
                                />
                              </TableCell>
                            );
                          }
                          if (column.id === "late") {
                            return (
                              <TableCell key={column.id}>
                                <Chip
                                  label={value}
                                  color={value > 0 ? "warning" : "default"}
                                  size="small"
                                />
                              </TableCell>
                            );
                          }
                          return <TableCell key={column.id}>{value}</TableCell>;
                        })}
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Download button */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={handleGenerateReport}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 600,
              background: "linear-gradient(45deg, #660708, #BA181B)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              ":hover": {
                background: "linear-gradient(45deg, #BA181B, #E5383B)",
              },
            }}
          >
            📥 Generate & Download Report
          </Button>
        </Box>
      </Box>
    </AdminMain>
  );
};

export default FacultyReports;
