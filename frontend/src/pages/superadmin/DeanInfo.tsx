import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Box,
  TextField,
  Button,
  MenuItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Swal from 'sweetalert2';

import axios from 'axios';
import SuperadminMain from './SuperadminMain';

interface College {
  _id: string;
  name: string;
  code: string;
}

interface Dean {
    _id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    ext_name?: string;
    username: string;
    email: string;
    role: string;
    college?: College;
    status: string;
  }
  

const DeanInfo: React.FC = () => {
  const [deans, setDeans] = useState<Dean[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const openStatusMenu = Boolean(statusAnchorEl);
  const [openModal, setOpenModal] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeCourses, setCollegeCourses] = useState<string[]>([]);

  const random4Digit = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

const [newFaculty, setNewFaculty] = useState({
  last_name: '',
  first_name: '',
  middle_name: '',
  ext_name: '',
  college: '',
  username: '',
  email: '',
  password: random4Digit(),
  role: 'dean',
  highestEducationalAttainment: '',
  academicRank: '',
  statusOfAppointment: '',
  numberOfPrep: 0,
  totalTeachingLoad: 0,
});

const [showPassword, setShowPassword] = useState(false);



  const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchorEl(event.currentTarget);
  };
  
  const handleStatusClose = (status: string | null = null) => {
    if (status) {
      setSelectedStatus(status);
    }
    setStatusAnchorEl(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFaculty({ ...newFaculty, [e.target.name]: e.target.value });
  };
  
  const handleRoleChange = (e: SelectChangeEvent<string>) => {
    setNewFaculty({ ...newFaculty, role: e.target.value });
  };
  
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleCloseModal = () => {
    setOpenModal(false);
  };
  
  const handleAddAccount = async () => {
    try {
      const requiredFields = ['last_name', 'first_name', 'college', 'email'];
      for (const field of requiredFields) {
        if (!newFaculty[field as keyof typeof newFaculty]) {
          Swal.fire({
            icon: 'warning',
            title: 'Missing Field',
            text: `Please fill out the ${field.replace('_', ' ')} field.`,
          });
          return;
        }
      }
  
      const response = await axios.post('http://localhost:5000/api/superadmin/faculty', newFaculty);
  
      // Add new dean to the list
      setDeans((prev) => [...prev, response.data]);
  
      // Reset form and close modal
      setNewFaculty({
        last_name: '',
        first_name: '',
        middle_name: '',
        ext_name: '',
        college: '',
        username: '',
        email: '',
        password: '',
        role: 'dean',
        highestEducationalAttainment: '',
        academicRank: '',
        statusOfAppointment: '',
        numberOfPrep: 0,
        totalTeachingLoad: 0,
      });
      setOpenModal(false);
  
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Dean account successfully created and email sent!',
      });
    } catch (error: any) {
      console.error('Error adding dean account:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'An error occurred while adding the dean.',
      });
    }
  };

  const handleDeleteDean = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });
  
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/superadmin/faculty/${id}`);
  
        setDeans(prev => prev.filter(dean => dean._id !== id));
  
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Dean account has been deleted.',
        });
      } catch (error: any) {
        console.error('Error deleting dean:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'An error occurred while deleting the dean.',
        });
      }
    }
  };
  
  
  const generateUsername = (firstName: string, lastName: string) => {
      const first = firstName.substring(0, 3).toUpperCase();
      const last = lastName.substring(0, 3).toUpperCase();
      return last + first;
    };
    
    useEffect(() => {
      const timer = setTimeout(() => {
        if (newFaculty.first_name && newFaculty.last_name) {
          const username = generateUsername(newFaculty.first_name, newFaculty.last_name);
          setNewFaculty(prev => ({ ...prev, username }));
        }
      }, 2000);
    
      return () => clearTimeout(timer);
    }, [newFaculty.first_name, newFaculty.last_name]);
  

  useEffect(() => {
    const fetchColleges = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/superadmin/all-colleges');
        console.log('Fetched colleges:', response.data);
        setColleges(response.data);
      } catch (error) {
        console.error('Error fetching colleges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchColleges();
  }, []);

  const fetchCoursesByCollege = async (collegeCode: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/superadmin/courses/by-college`, {
        params: { collegeCode }
      });
      // response.data = [{ name, code }, ...]
      const courseCodes = response.data.map((course: { code: string }) => course.code);
      setCollegeCourses(courseCodes);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCollegeCourses([]);
    }
  };
  
  
  

  useEffect(() => {
    const fetchDeans = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/superadmin/dean');
        setDeans(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching deans:', error);
        setError('Failed to fetch deans');
        setLoading(false);
      }
    };

    fetchDeans();
  }, []);

  const filteredDeans = deans.filter(dean => {
    return selectedStatus === 'all' || dean.status === selectedStatus;
  });
  

  return (
    <SuperadminMain>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold" color="#333">
          List of Dean/s
        </Typography>

        <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
          <TextField
            size="small"
            placeholder="Search..."
            variant="outlined"
            onChange={(e) => {
              // handle search
              console.log(e.target.value);
            }}
            sx={{ width: '300px' }}
          />
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenModal(true)}
          sx={{ marginLeft: '16px', whiteSpace: 'nowrap' }}
        >
          Add
        </Button>
      </Box>

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
                    <TableCell><strong>College</strong></TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" sx={{ cursor: 'pointer' }} onClick={handleStatusClick}>
                        <strong>Status of Account</strong>
                        <ArrowDropDownIcon />
                      </Box>

                      <Menu
                        anchorEl={statusAnchorEl}
                        open={openStatusMenu}
                        onClose={() => handleStatusClose()}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      >
                        <MenuItem onClick={() => handleStatusClose('all')}>All</MenuItem>
                        <MenuItem onClick={() => handleStatusClose('forverification')}>For Verification</MenuItem>
                        <MenuItem onClick={() => handleStatusClose('active')}>Active</MenuItem>
                        <MenuItem onClick={() => handleStatusClose('inactive')}>Inactive</MenuItem>
                      </Menu>
                    </TableCell>
                    <TableCell><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {filteredDeans.map((dean) => (
                  <TableRow key={dean._id}>
                    <TableCell>{`${dean.last_name}, ${dean.first_name} ${dean.middle_name ? dean.middle_name.charAt(0) + '.' : ''} ${dean.ext_name}`}</TableCell>
                    <TableCell>{dean.username}</TableCell>
                    <TableCell>{dean.email}</TableCell>
                    <TableCell>{dean.college?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {dean.status === 'forverification'
                        ? 'For Verification'
                        : dean.status.charAt(0).toUpperCase() + dean.status.slice(1)}
                    </TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => console.log('Edit', dean._id)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteDean(dean._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>Add Faculty Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            {/* Personal Info */}
            <Grid item xs={12} sm={5}>
              <Typography variant="subtitle1" gutterBottom>
                Personal Info
              </Typography>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={newFaculty.last_name}
                onChange={handleInputChange}
                margin="dense"
              />
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={newFaculty.first_name}
                onChange={handleInputChange}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Middle Name"
                name="middle_name"
                value={newFaculty.middle_name}
                onChange={handleInputChange}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Extension Name"
                name="ext_name"
                value={newFaculty.ext_name}
                onChange={handleInputChange}
                margin="dense"
              />
              <Autocomplete
                options={colleges.map((college) => college.code)}
                value={newFaculty.college || ''}
                onChange={(event, newValue) => {
                  setNewFaculty((prev) => ({ ...prev, college: newValue || '', course: '' }));
                  if (newValue) fetchCoursesByCollege(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="College" margin="dense" fullWidth />
                )}
                freeSolo
                disableClearable
              />
            </Grid>

            {/* Divider */}
            <Grid
              item
              xs={12}
              sm={2}
              sx={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}
            >
              <Divider orientation="vertical" flexItem />
            </Grid>

            {/* Account Credentials */}
            <Grid item xs={12} sm={5}>
              <Typography variant="subtitle1" gutterBottom>
                Account Credentials
              </Typography>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={newFaculty.username}
                onChange={handleInputChange}
                margin="dense"
                InputProps={{ readOnly: true }}
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={newFaculty.email}
                onChange={handleInputChange}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={newFaculty.password}
                onChange={handleInputChange}
                margin="dense"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={togglePasswordVisibility} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={newFaculty.role}
                  onChange={handleRoleChange}
                  disabled
                >
                  <MenuItem value="dean">Dean</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleAddAccount} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>

    </SuperadminMain>
  );
};

export default DeanInfo;
