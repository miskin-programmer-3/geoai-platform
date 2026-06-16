import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './leafletFix.js'

import { ThemeProvider } from "./context/ThemeContext";

import { LocationProvider } from './context/LocationContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>

    <LocationProvider>

      <App />

    </LocationProvider>
    
  </ThemeProvider>
)
