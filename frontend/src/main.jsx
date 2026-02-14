import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { Toaster } from "@/components/ui/sonner"
import { initElevenLabsWidget } from './utils/elevenLabsWidget.js'

// Initialize ElevenLabs widget
// initElevenLabsWidget()

import { LanguageProvider } from './context/LanguageContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <LanguageProvider defaultLanguage="en" storageKey="app-language">
        <UserProvider>
          <App />
          <Toaster />
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
