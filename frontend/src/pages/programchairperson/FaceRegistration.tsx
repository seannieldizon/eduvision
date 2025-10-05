import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Avatar, 
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Fade,
  Zoom,
  Tooltip,
  IconButton,
  Badge,
  Paper
} from "@mui/material";
import { 
  Search, 
  Person, 
  CameraAlt, 
  Edit, 
  Refresh,
  FilterList,
  CheckCircle,
  Cancel,
  Face
} from "@mui/icons-material";
import AdminMain from "./AdminMain";
import FaceRegistrationModal from "../../components/FaceRegistrationModal";
import axios from "axios";

interface College {
  _id: string;
  code: string;
  name: string;
}

interface Course {
  _id: string;
  code: string;
  name: string;
}

interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  college: College;
  course: Course;
  faceImagePath?: string;
  faceImages?: string[];
}

const FaceRegistration: React.FC = () => {
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'registration'>('name');

  // Fetch users from same college
  const fetchUsers = async () => {
    try {
      setLoading(true);
      let collegeCode = localStorage.getItem("college");
      
      console.log("College code from localStorage:", collegeCode);
      
      // If no college code in localStorage, try to get it from current user
      if (!collegeCode) {
        const currentUserId = localStorage.getItem("userId");
        console.log("No college in localStorage, fetching from user ID:", currentUserId);
        
        if (currentUserId) {
          try {
            const userResponse = await axios.get(
              `http://localhost:5000/api/auth/user/${currentUserId}`
            );
            console.log("Current user data:", userResponse.data);
            
            if (userResponse.data.college && userResponse.data.college.code) {
              collegeCode = userResponse.data.college.code;
              localStorage.setItem("college", collegeCode || "");
              console.log("Updated college code from user data:", collegeCode);
            }
          } catch (userError) {
            console.error("Error fetching current user:", userError);
          }
        }
      }
      
      if (!collegeCode) {
        setError("College information not found. Please log in again.");
      return;
    }

      console.log("Fetching users for college:", collegeCode);
      
      const response = await axios.get(
        "http://localhost:5000/api/auth/college-users",
        {
          params: { collegeCode }
        }
      );

      console.log("API Response:", response.data);
      console.log("Number of users found:", response.data.length);
      console.log("Response status:", response.status);

      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error response:", error.response?.data);
        console.error("Error status:", error.response?.status);
        console.error("Error config:", error.config);
        setError(`Failed to fetch users: ${error.response?.data?.message || error.message}`);
      } else {
        setError("Failed to fetch users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter and sort users based on search term, role, and filters
  useEffect(() => {
    // First filter to only show instructors
    let instructorUsers = users.filter(user => user.role === 'instructor');
    
    
    // Apply search filter
    if (searchTerm.trim()) {
      instructorUsers = instructorUsers.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.course?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    instructorUsers.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.last_name}, ${a.first_name}`.localeCompare(`${b.last_name}, ${b.first_name}`);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'registration':
          const aRegistered = isUserRegistered(a);
          const bRegistered = isUserRegistered(b);
          if (aRegistered === bRegistered) return 0;
          return aRegistered ? -1 : 1;
        default:
          return 0;
      }
    });
    
    setFilteredUsers(instructorUsers);
  }, [searchTerm, users, sortBy]);

  const handleUserSelect = (user: User) => {
    console.log('🎯 USER SELECTED:', user);
    console.log('🎯 User ID:', user._id);
    console.log('🎯 User name:', user.first_name, user.last_name);
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleRegistrationSuccess = () => {
    // Refresh the users list to update face registration status
    fetchUsers();
  };

  // Helper function to check if user has face registration
  const isUserRegistered = (user: User) => {
    return user.faceImagePath || (user.faceImages && user.faceImages.length > 0);
  };

  // Helper function to get registration status text
  const getRegistrationStatus = (user: User) => {
    if (user.faceImages && user.faceImages.length > 0) {
      return `Registered (${user.faceImages.length} photos)`;
    } else if (user.faceImagePath) {
      return "Registered (1 photo)";
    }
    return "Not Registered";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "programchairperson":
        return "#3D1308";
      case "instructor":
        return "#7B0D1E";
      default:
        return "#666";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#4caf50";
      case "inactive":
        return "#f44336";
      default:
        return "#666";
    }
  };

  if (loading) {
    return (
      <AdminMain>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          <Box sx={{ 
            background: 'white',
            borderRadius: 3,
            p: 6,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <CircularProgress 
              size={60} 
              sx={{ 
                mb: 3,
                color: 'primary.main'
              }} 
            />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              Loading instructors from your college...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please wait while we fetch the instructor data
            </Typography>
          </Box>
        </Box>
      </AdminMain>
    );
  }

  return (
    <AdminMain>
      <Box sx={{ 
        p: { xs: 2, md: 4 },
        minHeight: '100vh',
        backgroundColor: '#f4f6f8'
      }}>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={fetchUsers}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Enhanced Search and Filter Bar */}
        <Paper sx={{ 
          mb: { xs: 2, sm: 3, md: 4 },
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderRadius: { xs: 2, sm: 3 },
          p: { xs: 1.5, sm: 2, md: 3 },
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(61, 19, 8, 0.1)'
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Search Input */}
            <TextField
              fullWidth
              placeholder="Search by name, username, email, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#3D1308' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchTerm('')}
                      sx={{ color: '#666' }}
                    >
                      <Cancel />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'white',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3D1308',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3D1308',
                    borderWidth: 2,
                  },
                },
              }}
            />
            
            {/* Filter Controls */}
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 1, sm: 2 }, 
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: { xs: 'center', sm: 'space-between' },
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 0.5, sm: 1 }, 
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', sm: 'flex-start' }
              }}>
                <Chip
                  icon={<FilterList sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }} />}
                  label={`Sort by: ${sortBy}`}
                  onClick={() => setSortBy(sortBy === 'name' ? 'status' : sortBy === 'status' ? 'registration' : 'name')}
                  sx={{
                    backgroundColor: sortBy === 'name' ? '#3D1308' : sortBy === 'status' ? '#7B0D1E' : '#4caf50',
                    color: 'white',
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    height: { xs: 28, sm: 32 },
                    '&:hover': {
                      backgroundColor: sortBy === 'name' ? '#2A0E06' : sortBy === 'status' ? '#660A15' : '#43a047',
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Refresh Data">
                  <IconButton 
                    onClick={fetchUsers}
                    sx={{ 
                      backgroundColor: '#f5f5f5',
                      '&:hover': { backgroundColor: '#e0e0e0' }
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
          </Box>
        </Paper>

        {/* Enhanced Users Grid */}
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
          {filteredUsers.map((user, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={user._id}>
              <Fade in={true} timeout={300 + index * 100}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease',
                    borderRadius: 3,
                    background: hoveredCard === user._id 
                      ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                      : 'white',
                    boxShadow: hoveredCard === user._id 
                      ? '0 20px 50px rgba(61, 19, 8, 0.3)'
                      : '0 4px 16px rgba(0,0,0,0.08)',
                    border: hoveredCard === user._id 
                      ? '2px solid #3D1308'
                      : '1px solid rgba(61, 19, 8, 0.1)',
                    transform: hoveredCard === user._id 
                      ? 'translateY(-8px) scale(1.05)'
                      : 'translateY(0) scale(1)',
                    zIndex: hoveredCard === user._id ? 10 : 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: isUserRegistered(user) 
                        ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                        : 'linear-gradient(90deg, #3D1308, #7B0D1E)',
                      opacity: hoveredCard === user._id ? 1 : 0.7,
                      transition: 'opacity 0.3s ease'
                    }
                  }}
                  onMouseEnter={() => setHoveredCard(user._id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleUserSelect(user)}
                >
                <CardContent sx={{ 
                  p: { xs: 1.5, sm: 2, md: 3 }, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  flex: 1 
                }}>
                  {/* Enhanced User Header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: { xs: 1.5, sm: 2, md: 3 },
                    flexDirection: { xs: 'column', sm: 'row' },
                    textAlign: { xs: 'center', sm: 'left' },
                    position: 'relative',
                    gap: { xs: 1, sm: 0 }
                  }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        isUserRegistered(user) ? (
                          <Zoom in={true}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: '#4caf50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white'
                              }}
                            >
                              <CheckCircle sx={{ fontSize: 10, color: 'white' }} />
                            </Box>
                          </Zoom>
                        ) : null
                      }
                    >
                      <Avatar 
                        sx={{ 
                          mr: { xs: 0, sm: 2 }, 
                          mb: { xs: 0.5, sm: 0 },
                          width: { xs: 48, sm: 56, md: 64 }, 
                          height: { xs: 48, sm: 56, md: 64 },
                          background: isUserRegistered(user)
                            ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                            : 'linear-gradient(45deg, #3D1308, #7B0D1E)',
                          fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.8rem' },
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          transform: hoveredCard === user._id ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: hoveredCard === user._id 
                            ? '0 8px 24px rgba(0,0,0,0.2)'
                            : '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        {isUserRegistered(user) ? <Face /> : <Person />}
                      </Avatar>
                    </Badge>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="h6" 
                        component="div"
                        sx={{ 
                          fontWeight: 'bold',
                          color: 'text.primary',
                          mb: 0.5,
                          fontSize: { xs: '1rem', sm: '1.25rem' },
                          wordBreak: 'break-word'
                        }}
                      >
                        {user.last_name}, {user.first_name} {user.middle_name || ""}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          wordBreak: 'break-word'
                        }}
                      >
                        @{user.username}
                      </Typography>
                    </Box>
                  </Box>

                  {/* User Details */}
                  <Box sx={{ mb: { xs: 1.5, sm: 2, md: 3 }, flex: 1 }}>
                    <Box sx={{ mb: { xs: 1, sm: 1.5 } }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' }, 
                          mb: 0.5 
                        }}
                      >
                        📧 Email
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          wordBreak: 'break-word'
                        }}
                      >
                        {user.email}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: { xs: 1, sm: 1.5 } }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' }, 
                          mb: 0.5 
                        }}
                      >
                        🎓 Course
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          wordBreak: 'break-word'
                        }}
                      >
                        {user.course?.name || "N/A"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Enhanced Status Chips */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 0.5, sm: 0.75, md: 1 }, 
                    mb: { xs: 1.5, sm: 2, md: 3 }, 
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <Tooltip title={`Role: ${user.role}`}>
                      <Chip 
                        label={user.role} 
                        sx={{ 
                          backgroundColor: getRoleColor(user.role),
                          color: 'white',
                          borderRadius: 2,
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          height: { xs: 24, sm: 28 },
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          transform: hoveredCard === user._id ? 'scale(1.08)' : 'scale(1)',
                          boxShadow: hoveredCard === user._id 
                            ? '0 4px 12px rgba(0,0,0,0.2)'
                            : '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip title={`Status: ${user.status}`}>
                      <Chip 
                        label={user.status} 
                        sx={{ 
                          backgroundColor: getStatusColor(user.status),
                          color: 'white',
                          borderRadius: 2,
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          height: { xs: 24, sm: 28 },
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          transform: hoveredCard === user._id ? 'scale(1.08)' : 'scale(1)',
                          boxShadow: hoveredCard === user._id 
                            ? '0 4px 12px rgba(0,0,0,0.2)'
                            : '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                        size="small"
                      />
                    </Tooltip>
                    {isUserRegistered(user) && (
                      <Tooltip title="Face Registration Status">
                        <Chip 
                          label={getRegistrationStatus(user)} 
                          sx={{ 
                            backgroundColor: '#4caf50',
                            color: 'white',
                            borderRadius: 2,
                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                            height: { xs: 24, sm: 28 },
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            transform: hoveredCard === user._id ? 'scale(1.08)' : 'scale(1)',
                            boxShadow: hoveredCard === user._id 
                              ? '0 4px 12px rgba(76, 175, 80, 0.3)'
                              : '0 2px 6px rgba(76, 175, 80, 0.2)'
                          }}
                          size="small"
                          icon={<CameraAlt sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }} />}
                        />
                      </Tooltip>
          )}
                    {isUserRegistered(user) && user.faceImages && user.faceImages.length > 0 && (
                      <Tooltip title={`${user.faceImages.length} face photos registered`}>
                        <Chip 
                          label={`${user.faceImages.length} photos`}
                          sx={{ 
                            backgroundColor: '#2196f3',
                            color: 'white',
                            borderRadius: 2,
                            fontSize: { xs: '0.6rem', sm: '0.7rem' },
                            height: { xs: 20, sm: 24 },
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            transform: hoveredCard === user._id ? 'scale(1.08)' : 'scale(1)',
                            boxShadow: hoveredCard === user._id 
                              ? '0 4px 12px rgba(33, 150, 243, 0.3)'
                              : '0 2px 6px rgba(33, 150, 243, 0.2)'
                          }}
                          size="small"
                        />
                      </Tooltip>
          )}
        </Box>

                  {/* Enhanced Action Button */}
                  <Tooltip title={isUserRegistered(user) ? "Update face registration" : "Register face for attendance"}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={isUserRegistered(user) ? 
                        <Edit sx={{ 
                          fontSize: { xs: '1rem', sm: '1.2rem' },
                          transition: 'transform 0.3s ease',
                          transform: hoveredCard === user._id ? 'rotate(5deg)' : 'rotate(0deg)'
                        }} /> : 
                        <CameraAlt sx={{ 
                          fontSize: { xs: '1rem', sm: '1.2rem' },
                          transition: 'transform 0.3s ease',
                          transform: hoveredCard === user._id ? 'scale(1.12)' : 'scale(1)'
                        }} />
                      }
                      sx={{
                        borderRadius: { xs: 2, sm: 3 },
                        py: { xs: 1, sm: 1.2, md: 1.8 },
                        fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' },
                        fontWeight: 'bold',
                        textTransform: 'none',
                        minHeight: { xs: 40, sm: 44, md: 52 },
                        background: isUserRegistered(user)
                          ? 'linear-gradient(135deg, #4caf50, #66bb6a)'
                          : 'linear-gradient(135deg, #3D1308, #7B0D1E)',
                        boxShadow: isUserRegistered(user)
                          ? '0 6px 20px rgba(76, 175, 80, 0.3)'
                          : '0 6px 20px rgba(61, 19, 8, 0.3)',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
                        transform: hoveredCard === user._id ? 'translateY(-4px)' : 'translateY(0)',
                        '&:hover': {
                          background: isUserRegistered(user)
                            ? 'linear-gradient(135deg, #43a047, #5cb85c)'
                            : 'linear-gradient(135deg, #2A0E06, #660A15)',
                          boxShadow: isUserRegistered(user)
                            ? '0 8px 24px rgba(76, 175, 80, 0.4)'
                            : '0 8px 24px rgba(61, 19, 8, 0.4)',
                        },
                        '&:active': {
                          transform: 'translateY(-1px) scale(0.98)',
                        }
                      }}
                    >
                      {isUserRegistered(user) ? "Update Face" : "Register Face"}
                    </Button>
                  </Tooltip>
                </CardContent>
              </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>

        {filteredUsers.length === 0 && !loading && (
          <Fade in={true} timeout={500}>
            <Paper sx={{ 
              textAlign: 'center', 
              py: { xs: 6, sm: 8, md: 12 },
              px: { xs: 2, sm: 4, md: 6 },
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: { xs: 2, sm: 3, md: 4 },
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid rgba(61, 19, 8, 0.1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #3D1308, #7B0D1E)',
                opacity: 0.7
              }
            }}>
              <Zoom in={true} timeout={800}>
                <Box sx={{ 
                  fontSize: { xs: '3rem', sm: '4rem', md: '6rem' }, 
                  mb: { xs: 2, sm: 3 },
                  opacity: 0.8,
                  animation: 'pulse 2s infinite'
                }}>
                  👥
                </Box>
              </Zoom>
              <Typography 
                variant="h4" 
                color="text.primary" 
                sx={{ 
                  mb: { xs: 1.5, sm: 2 }, 
                  fontWeight: 'bold',
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                  background: 'linear-gradient(45deg, #3D1308, #7B0D1E)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                No instructors found
              </Typography>
              <Typography 
                variant="h6" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                  mb: { xs: 2, sm: 3 },
                  maxWidth: { xs: '100%', sm: '400px', md: '500px' },
                  mx: 'auto'
                }}
              >
                {searchTerm ? "Try adjusting your search terms or filters" : "No instructors available in your college"}
              </Typography>
              {searchTerm && (
                <Button
                  variant="outlined"
                  onClick={() => setSearchTerm('')}
                  sx={{
                    borderRadius: { xs: 1.5, sm: 2 },
                    px: { xs: 2, sm: 3 },
                    py: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    borderColor: '#3D1308',
                    color: '#3D1308',
                    '&:hover': {
                      backgroundColor: '#3D1308',
                      color: 'white'
                    }
                  }}
                >
                  Clear Search
                </Button>
              )}
            </Paper>
          </Fade>
        )}

        {/* Face Registration Modal */}
        <FaceRegistrationModal
          open={modalOpen}
          onClose={handleModalClose}
          user={selectedUser}
          userId={selectedUser?._id}
          onSuccess={handleRegistrationSuccess}
        />
      </Box>
    </AdminMain>
  );
};

export default FaceRegistration;
