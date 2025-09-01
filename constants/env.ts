// Environment configuration - deployed backend
export const DEFAULT_REST = "https://web-production-be7cf.up.railway.app/api";
export const DEFAULT_WS = "wss://web-production-be7cf.up.railway.app/api/ws";

// Fallback URLs for development
export const DEV_REST = "http://localhost:8000/api";
export const DEV_WS = "ws://localhost:8000/api/ws";

// Use production URLs by default
export const API_BASE_URL = DEFAULT_REST;
export const WS_BASE_URL = DEFAULT_WS;
