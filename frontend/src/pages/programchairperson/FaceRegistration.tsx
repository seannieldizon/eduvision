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
  InputAdornment
} from "@mui/material";
import { Search, Person, CameraAlt } from "@mui/icons-material";
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
}

const FaceRegistration: React.FC = () => {
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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

  // Filter users based on search term and role (only instructors)
  useEffect(() => {
    // First filter to only show instructors
    const instructorUsers = users.filter(user => user.role === 'instructor');
    
    if (!searchTerm.trim()) {
      setFilteredUsers(instructorUsers);
    } else {
      const filtered = instructorUsers.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.course?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

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

        {/* Search Bar */}
        <Box sx={{ 
          mb: { xs: 3, sm: 4 },
          background: 'white',
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
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
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
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
        </Box>

        {/* Users Grid */}
        <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
          {filteredUsers.map((user) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={user._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  borderRadius: 2,
                  background: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(61, 19, 8, 0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(61, 19, 8, 0.15)',
                    borderColor: '#3D1308'
                  }
                }}
                onClick={() => handleUserSelect(user)}
              >
                <CardContent sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  flex: 1 
                }}>
                  {/* User Header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: { xs: 2, sm: 3 },
                    flexDirection: { xs: 'column', sm: 'row' },
                    textAlign: { xs: 'center', sm: 'left' }
                  }}>
                    <Avatar 
                      sx={{ 
                        mr: { xs: 0, sm: 2 }, 
                        mb: { xs: 1, sm: 0 },
                        width: { xs: 48, sm: 56 }, 
                        height: { xs: 48, sm: 56 },
                        background: 'linear-gradient(45deg, #3D1308, #7B0D1E)',
                        fontSize: { xs: '1.2rem', sm: '1.5rem' }
                      }}
                    >
                      <Person />
                    </Avatar>
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
                  <Box sx={{ mb: { xs: 2, sm: 3 }, flex: 1 }}>
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

                  {/* Status Chips */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 0.5, sm: 1 }, 
                    mb: { xs: 2, sm: 3 }, 
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <Chip 
                      label={user.role} 
                      sx={{ 
                        backgroundColor: getRoleColor(user.role),
                        color: 'white',
                        borderRadius: 2,
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 24, sm: 28 }
                      }}
                      size="small"
                    />
                    <Chip 
                      label={user.status} 
                      sx={{ 
                        backgroundColor: getStatusColor(user.status),
                        color: 'white',
                        borderRadius: 2,
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 24, sm: 28 }
                      }}
                      size="small"
                    />
                    {user.faceImagePath && (
                      <Chip 
                        label="Face Registered" 
                        sx={{ 
                          backgroundColor: '#4caf50',
                          color: 'white',
                          borderRadius: 2,
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          height: { xs: 24, sm: 28 }
                        }}
                        size="small"
                        icon={<CameraAlt sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }} />}
                      />
          )}
        </Box>

                  {/* Action Button */}
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<CameraAlt sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
                    sx={{
                      borderRadius: 2,
                      py: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      fontWeight: 'bold',
                      textTransform: 'none',
                      minHeight: { xs: 40, sm: 48 },
                      background: user.faceImagePath 
                        ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                        : 'linear-gradient(45deg, #3D1308, #7B0D1E)',
                      boxShadow: user.faceImagePath 
                        ? '0 4px 12px rgba(76, 175, 80, 0.3)'
                        : '0 4px 12px rgba(61, 19, 8, 0.3)',
                      '&:hover': {
                        background: user.faceImagePath 
                          ? 'linear-gradient(45deg, #43a047, #5cb85c)'
                          : 'linear-gradient(45deg, #2A0E06, #660A15)',
                        boxShadow: user.faceImagePath 
                          ? '0 6px 16px rgba(76, 175, 80, 0.4)'
                          : '0 6px 16px rgba(61, 19, 8, 0.4)',
                      }
                    }}
                  >
                    {user.faceImagePath ? "Update Face" : "Register Face"}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredUsers.length === 0 && !loading && (
          <Box sx={{ 
            textAlign: 'center', 
            py: { xs: 6, sm: 8 },
            px: { xs: 2, sm: 4 },
            background: 'white',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ 
              fontSize: { xs: '3rem', sm: '4rem' }, 
              mb: 2,
              opacity: 0.5
            }}>
              👥
            </Box>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              sx={{ 
                mb: 1, 
                fontWeight: 'bold',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              No instructors found
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              {searchTerm ? "Try adjusting your search terms" : "No instructors available in your college"}
          </Typography>
          </Box>
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
