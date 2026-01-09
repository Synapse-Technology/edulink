import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Support from './pages/Support';
import Search from './pages/Search';
import Opportunities from './pages/Opportunities';
import WhyUs from './pages/WhyUs';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentDashboard from './pages/dashboard/studentdashboard';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="why-us" element={<WhyUs />} />
          <Route path="contact" element={<Contact />} />
          <Route path="support" element={<Support />} />
          <Route path="search" element={<Search />} />
          <Route path="opportunities" element={<Opportunities />} />
        </Route>
        
        {/* Auth routes without layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Dashboard routes without layout */}
        <Route path="/dashboard/student" element={<StudentDashboard />} />
        
        {/* Catch-all route for 404 errors */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;