import axios from 'axios';
import { Platform } from 'react-native';
import { ENV } from '../config/env';

// Replace with your actual backend IP address
// For Android Emulator, use 10.0.2.2
// For Physical Device, use your computer's local IP (e.g., 192.168.1.x)
const BASE_URL = ENV.BACKEND_URL || 'https://app-backend-fz6a.onrender.com';
const API_KEY = ENV.MOVIE_API_KEY || 'MOVIEBLAST_SECURE_2025';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
    },
    timeout: 10000,
});

export const searchMovies = async (query: string) => {
    try {
        const response = await api.get(`/api/movies/search?query=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error('Search API Error:', error);
        throw error;
    }
};

export const getAllMovies = async () => {
    try {
        const response = await api.get('/api/movies');
        return response.data;
    } catch (error) {
        console.error('Get All Movies Error:', error);
        throw error;
    }
};

export default api;
