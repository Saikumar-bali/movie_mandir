import axios from 'axios';
import { ENV } from '../config/env';

const BASE_URL = ENV.API_BASE_URL;
const AUTH_CODE = ENV.API_AUTH_CODE;
const IMAGE_BASE_URL = ENV.IMAGE_BASE_URL;

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'User-Agent': 'MovieMandirPlayer',
        'Accept': 'application/json',
    },
});

const movieApi = {
    // --- Movies ---
    getMovies: async (page = 1) => {
        try {
            const response = await client.get(`/movies/byyear/${AUTH_CODE}`, {
                params: { page },
            });
            // The API returns { data: [...] } for paginated results
            const results = response.data.data || [];
            return results.map(normalizeContent);
        } catch (error) {
            console.error('[MovieApi] getMovies error:', error);
            throw error;
        }
    },

    getMovieDetail: async (id) => {
        try {
            const response = await client.get(`/media/detail/${id}/${AUTH_CODE}`);
            return normalizeContent(response.data);
        } catch (error) {
            console.error('[MovieApi] getMovieDetail error:', error);
            throw error;
        }
    },

    // --- Series ---
    getSeries: async (page = 1) => {
        try {
            const response = await client.get(`/series/byyear/${AUTH_CODE}`, {
                params: { page },
            });
            const results = response.data.data || [];
            return results.map(normalizeContent);
        } catch (error) {
            console.error('[MovieApi] getSeries error:', error);
            throw error;
        }
    },

    getSeriesDetail: async (id) => {
        try {
            const response = await client.get(`/series/show/${id}/${AUTH_CODE}`);
            return normalizeContent(response.data);
        } catch (error) {
            console.error('[MovieApi] getSeriesDetail error:', error);
            throw error;
        }
    },

    // Helper to construct image URLs
    getImageUrl: (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${IMAGE_BASE_URL}${path.replace(/^\//, '')}`;
    },

    // --- Search ---
    search: async (query) => {
        try {
            // NOTE: The server blocks 'EasyPlexPlayer' UA for search, so we use a generic one or empty
            const response = await client.get(`/search/${encodeURIComponent(query)}/${AUTH_CODE}`, {
                headers: {
                    'User-Agent': 'okhttp/4.9.0'
                }
            });
            const results = response.data.search || [];
            return results.map(normalizeContent);
        } catch (error) {
            console.error('[MovieApi] search error:', error);
            throw error;
        }
    }
};

// Normalize data to ensure consistent structure for UI
const normalizeContent = (item) => {
    if (!item) return null;

    // Fix poster path
    let poster = item.poster_path;
    if (poster && !poster.startsWith('http')) {
        poster = `${IMAGE_BASE_URL}${poster.replace(/^\//, '')}`;
    }

    // Fix backdrop path
    let backdrop = item.backdrop_path;
    if (backdrop && !backdrop.startsWith('http')) {
        backdrop = `${IMAGE_BASE_URL}${backdrop.replace(/^\//, '')}`;
    }

    return {
        ...item,
        // Ensure title/name consistency
        title: item.title || item.name,
        poster_path: poster,
        backdrop_path: backdrop,
        // Add logic for Series if needed
    };
};

export default movieApi;
