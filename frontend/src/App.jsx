import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import Home from './pages/Home.jsx'
import React from "react";
import './index.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    
    <div className="w-screen h-screen">
      <Home />
    </div>
  )
}

export default App
