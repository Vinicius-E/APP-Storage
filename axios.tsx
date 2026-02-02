import axios from 'axios';

const baseURL = 'https://api-storage-wivi.onrender.com/api';

export const API = axios.create({
  baseURL,
});
