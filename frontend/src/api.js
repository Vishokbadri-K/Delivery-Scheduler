import axios from "axios";

// Change this to your Render backend URL after deployment
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

export default API;