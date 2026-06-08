const getApiUrl = () => {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' ||
                  hostname === '127.0.0.1' ||
                  hostname.startsWith('192.168.') ||
                  hostname.startsWith('10.') ||
                  hostname.startsWith('172.') ||
                  hostname.endsWith('.local') ||
                  /^[0-9.]+$/.test(hostname);
  return isLocal ? `http://${hostname}:5000` : 'https://nisanth-bsts.onrender.com';
};

export const API_URL = getApiUrl();
