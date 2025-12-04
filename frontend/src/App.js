import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NexusRecorder from "./components/NexusRecorder";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NexusRecorder />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;