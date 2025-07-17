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

interface ProgramChairperson {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  college?: College;
  status: string;
}

const ProgramChairInfoOnly: React.FC = () => {
  const [programchairinfo, setProgramChairInfo] = useState<ProgramChairperson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollegeCode, setSelectedCollegeCode] = useState<string>('all');
  const [colleges, setColleges] = useState<College[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchProgramChairInfo = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/superadmin/programchairinfo-only');
        console.log("Fetched program chair info:", response.data);

        setProgramChairInfo(response.data);
        setLoading(false);

        // Extract unique colleges by _id
        const collegeMap = new Map<string, College>();
        response.data.forEach((pc: ProgramChairperson) => {
          if (pc.college) {
            collegeMap.set(pc.college._id, pc.college);
          }
        });

        // Add "All" option manually at the top
        const uniqueColleges = Array.from(collegeMap.values());
        setColleges([{ _id: 'all', code: 'All', name: 'All Colleges' }, ...uniqueColleges]);

      } catch (error) {
        console.error('Error fetching program chair info:', error);
        setError('Failed to fetch program chair info');
        setLoading(false);
      }
    };

    fetchProgramChairInfo();
  }, []);

  const filteredProgramChairInfo =
    selectedCollegeCode === 'all'
      ? programchairinfo
      : programchairinfo.filter(pc => pc.college?.code === selectedCollegeCode);

  return (
    <SuperadminMain>
      <Typography variant="h4" fontWeight="bold" color="#333" gutterBottom>
        List of Program Chairperson/s
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div style={{ color: 'red' }}>{error}</div>
          ) : (
            <TableContainer component={Paper} sx={{ width: '100%' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Full Name</strong></TableCell>
                    <TableCell><strong>Username</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell>
                      <Box position="relative" display="inline-block">
                        <Box display="flex" alignItems="center" onClick={() => setDropdownOpen(!dropdownOpen)} sx={{ cursor: 'pointer' }}>
                          <strong>College</strong>
                          <ArrowDropDownIcon sx={{ ml: 0.5 }} />
                        </Box>
                        {dropdownOpen && (
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
                                sx={{ cursor: 'pointer', "&:hover": { backgroundColor: '#f0f0f0' } }}
                                onClick={() => {
                                  setSelectedCollegeCode(college.code === 'All' ? 'all' : college.code);
                                  setDropdownOpen(false);
                                }}
                              >
                                {college.code}
                              </Box>
                            ))}
                          </Paper>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProgramChairInfo.map((programchairinfo) => (
                    <TableRow key={programchairinfo._id}>
                      <TableCell>
                        {`${programchairinfo.last_name}, ${programchairinfo.first_name} ${programchairinfo.middle_name ? programchairinfo.middle_name.charAt(0) + '.' : ''}`}
                      </TableCell>
                      <TableCell>{programchairinfo.username}</TableCell>
                      <TableCell>{programchairinfo.email}</TableCell>
                      <TableCell>{programchairinfo.college?.name || 'N/A'}</TableCell>
                      <TableCell>
  {programchairinfo?.status === 'forverification'
    ? 'For Verification'
    : programchairinfo?.status
      ? programchairinfo.status.charAt(0).toUpperCase() + programchairinfo.status.slice(1)
      : 'N/A'}
</TableCell>


                      <TableCell>
                        <IconButton color="primary" onClick={() => console.log('Edit', programchairinfo._id)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => console.log('Delete', programchairinfo._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProgramChairInfo.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No program chairperson data available.
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
