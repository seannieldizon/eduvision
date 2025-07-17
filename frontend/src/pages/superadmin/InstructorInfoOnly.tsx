import React, { useEffect, useState } from 'react';
import {
  Grid, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Typography, Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import axios from 'axios';
import SuperadminMain from './SuperadminMain';

interface College {
  _id: string;
  code: string;
  name: string;
}

interface Instructor {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  college?: College;
  course: string;
  status: string;
}

const ProgramChairInfoOnly: React.FC = () => {
  const [instructorInfo, setInstructorInfo] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCollegeCode, setSelectedCollegeCode] = useState<string>('all');
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState<boolean>(false);

  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [courses, setCourses] = useState<string[]>([]);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState<boolean>(false);

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<boolean>(false);


  useEffect(() => {
    const fetchInstructorInfo = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/superadmin/instructorinfo-only');
        console.log(response)
        setInstructorInfo(response.data);
        setLoading(false);

        const collegeMap = new Map<string, College>();
        const courseSet = new Set<string>();

        response.data.forEach((instructor: Instructor) => {
          if (instructor.college) collegeMap.set(instructor.college._id, instructor.college);
          if (instructor.course) courseSet.add(instructor.course);
        });

        setColleges([{ _id: 'all', code: 'All', name: 'All Colleges' }, ...Array.from(collegeMap.values())]);
        setCourses(['All', ...Array.from(courseSet)]);
      } catch (error) {
        console.error('Error fetching instructor info:', error);
        setError('Failed to fetch instructor info');
        setLoading(false);
      }
    };

    fetchInstructorInfo();
  }, []);

  const filteredInstructorInfo = instructorInfo.filter((instructor) => {
    const matchesCollege = selectedCollegeCode === 'all' || instructor.college?.code === selectedCollegeCode;
    const matchesCourse = selectedCourse === 'all' || instructor.course === selectedCourse;
    const matchesStatus = selectedStatus === 'all' || instructor.status === selectedStatus;
    return matchesCollege && matchesCourse && matchesStatus;
  });
  

  return (
    <SuperadminMain>
      <Typography variant="h4" fontWeight="bold" color="#333" gutterBottom>
        List of Instructor/s
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div style={{ color: 'red' }}>{error}</div>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Full Name</strong></TableCell>
                    <TableCell><strong>Username</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>

                    {/* College column */}
                    <TableCell>
                      <Box position="relative" display="inline-block">
                        <Box display="flex" alignItems="center" onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)} sx={{ cursor: 'pointer' }}>
                          <strong>College</strong>
                          <ArrowDropDownIcon sx={{ ml: 0.5 }} />
                        </Box>
                        {collegeDropdownOpen && (
                          <Paper
                            elevation={3}
                            sx={{
                              position: 'absolute',
                              zIndex: 1,
                              backgroundColor: 'white',
                              mt: 1,
                              minWidth: 150,
                              maxHeight: 200,
                              overflowY: 'auto',
                            }}
                          >
                            {colleges.map((college) => (
                              <Box
                                key={college._id}
                                px={2}
                                py={1}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: college.code === selectedCollegeCode || (selectedCollegeCode === 'all' && college.code === 'All') ? '#e0e0e0' : 'white',
                                  '&:hover': { backgroundColor: '#f0f0f0' },
                                }}
                                onClick={() => {
                                  setSelectedCollegeCode(college.code === 'All' ? 'all' : college.code);
                                  setCollegeDropdownOpen(false);
                                }}
                              >
                                {college.code}
                              </Box>
                            ))}
                          </Paper>
                        )}
                      </Box>
                    </TableCell>

                    {/* Course column */}
                    <TableCell>
                      <Box position="relative" display="inline-block">
                        <Box display="flex" alignItems="center" onClick={() => setCourseDropdownOpen(!courseDropdownOpen)} sx={{ cursor: 'pointer' }}>
                          <strong>Course</strong>
                          <ArrowDropDownIcon sx={{ ml: 0.5 }} />
                        </Box>
                        {courseDropdownOpen && (
                          <Paper
                            elevation={3}
                            sx={{
                              position: 'absolute',
                              zIndex: 1,
                              backgroundColor: 'white',
                              mt: 1,
                              minWidth: 150,
                              maxHeight: 200,
                              overflowY: 'auto',
                            }}
                          >
                            {courses.map((course, index) => (
                              <Box
                                key={index}
                                px={2}
                                py={1}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: course === selectedCourse || (selectedCourse === 'all' && course === 'All') ? '#e0e0e0' : 'white',
                                  '&:hover': { backgroundColor: '#f0f0f0' },
                                }}
                                onClick={() => {
                                  setSelectedCourse(course === 'All' ? 'all' : course);
                                  setCourseDropdownOpen(false);
                                }}
                              >
                                {course === 'All' ? 'All' : course.toUpperCase()}
                              </Box>
                            ))}
                          </Paper>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box position="relative" display="inline-block">
                        <Box display="flex" alignItems="center" onClick={() => setStatusDropdownOpen(!statusDropdownOpen)} sx={{ cursor: 'pointer' }}>
                          <strong>Status</strong>
                          <ArrowDropDownIcon sx={{ ml: 0.5 }} />
                        </Box>
                        {statusDropdownOpen && (
                          <Paper
                            elevation={3}
                            sx={{
                              position: 'absolute',
                              zIndex: 1,
                              backgroundColor: 'white',
                              mt: 1,
                              minWidth: 150,
                              maxHeight: 200,
                              overflowY: 'auto',
                            }}
                          >
                            {[
                              { label: 'All', value: 'all' },
                              { label: 'For Verification', value: 'forverification' },
                              { label: 'Active', value: 'active' },
                              { label: 'Inactive', value: 'inactive' },
                            ].map((status) => (
                              <Box
                                key={status.value}
                                px={2}
                                py={1}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: selectedStatus === status.value ? '#e0e0e0' : 'white',
                                  '&:hover': { backgroundColor: '#f0f0f0' },
                                }}
                                onClick={() => {
                                  setSelectedStatus(status.value);
                                  setStatusDropdownOpen(false);
                                }}
                              >
                                {status.label}
                              </Box>
                            ))}
                          </Paper>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredInstructorInfo.map((instructor) => (
                    <TableRow key={instructor._id}>
                      <TableCell>
                        {`${instructor.last_name}, ${instructor.first_name} ${instructor.middle_name ? instructor.middle_name.charAt(0) + '.' : ''}`}
                      </TableCell>
                      <TableCell>{instructor.username}</TableCell>
                      <TableCell>{instructor.email}</TableCell>
                      <TableCell>{instructor.college?.code || 'N/A'}</TableCell>
                      <TableCell>{instructor.course ? instructor.course.toUpperCase() : 'N/A'}</TableCell>
                      <TableCell>
                        {instructor.status === 'forverification'
                          ? 'For Verification'
                          : instructor.status.charAt(0).toUpperCase() + instructor.status.slice(1)}
                      </TableCell>
                      <TableCell>
                        <IconButton color="primary" onClick={() => console.log('Edit', instructor._id)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => console.log('Delete', instructor._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInstructorInfo.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No instructor data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </SuperadminMain>
  );
};

export default ProgramChairInfoOnly;
