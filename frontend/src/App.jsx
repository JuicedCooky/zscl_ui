import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import Home from './pages/Home.jsx'
import React from "react";
import './index.css'
import BackgroundDot from './components/BackgroundDot.jsx';

function App() {
  const [count, setCount] = useState(0)

  return (
    
    <div className="relative w-screen h-screen">
      <BackgroundDot className=""/>
      <Home className="relative z-10"/>
    </div>
  )
}

export default App
