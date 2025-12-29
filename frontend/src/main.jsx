import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { Toaster } from "@/components/ui/sonner"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <UserProvider>
        <App />
        <Toaster />
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
