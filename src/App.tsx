import { useEffect, useState } from 'react'
import ArmViewer from './components/ArmViewer'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-white">Mirai — Robot Arm Simulator</h1>
        <p className="text-gray-400 text-sm">AI-powered robotics design for everyone</p>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <ArmViewer />
      </main>
    </div>
  )
}

export default App
