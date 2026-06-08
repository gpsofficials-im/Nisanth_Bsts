import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { StorageProvider } from './context/StorageContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <StorageProvider>
            <App />
          </StorageProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
