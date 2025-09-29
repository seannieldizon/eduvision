import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import AdminMain from "./AdminMain"; // adjust path if needed
import axios from "axios";

const FaceRegistration: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // get userId from route
  const userId = id ?? ""; // fallback if id is undefined

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
      setStatus("");
    }
  };

  const handleRegister = async () => {
    if (!file) {
      setStatus("Please select an image first.");
      return;
    }
    setLoading(true);
    setStatus("Registering face...");
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("image", file);

      const response = await axios.post(
        "http://localhost:5000/face/register",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        setStatus("Face registered successfully!");
      } else {
        setStatus("Registration failed. Try again.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminMain>
      <Box display="flex" flexDirection="column" alignItems="center" p={4}>
        <Typography variant="h5" gutterBottom>
          Face Registration
        </Typography>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ marginBottom: 16 }}
        />

        {preview && (
          <img
            src={preview}
            alt="Preview"
            style={{ width: 300, borderRadius: 8, marginBottom: 16 }}
          />
        )}

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Register Face"}
          </Button>
          {preview && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setStatus("");
              }}
            >
              Remove
            </Button>
          )}
        </Box>

        {status && (
          <Typography mt={2} color={status.includes("success") ? "green" : "red"}>
            {status}
          </Typography>
        )}
      </Box>
    </AdminMain>
  );
};

export default FaceRegistration;
