import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

export default instance;
