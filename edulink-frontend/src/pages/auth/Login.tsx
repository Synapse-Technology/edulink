import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard/student');
    } catch (error) {
      setMessage('Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/img/signin.jpeg')" }}
      ></div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60"></div>
      
      {/* Login Wrapper */}
      <div className="login-wrapper relative z-10 w-full max-w-4xl mx-4">
        <div className="flex min-h-[620px]">
          {/* Branding Side */}
          <div className="branding-side flex-1 bg-gradient-to-br from-edulink-primary to-edulink-accent p-12 flex flex-col justify-center">
            <div className="text-white">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">EduLink KE</h1>
                <div className="w-16 h-1 bg-white/80 rounded"></div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">
                Welcome Back to Your Career Journey
              </h2>
              <p className="text-lg opacity-90 leading-relaxed">
                Connect with verified internship opportunities, track your applications, 
                and take the next step in your professional development.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Verified internship opportunities</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Smart application tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Professional development resources</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form Side */}
          <div className="form-side flex-1 flex items-center justify-center p-12">
            <div className="form-box w-full max-w-md">
              <h2 className="text-3xl font-bold text-white mb-2 text-center">
                Sign In
              </h2>
              <p className="text-gray-300 mb-8 text-center">
                Access your EduLink account
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email Address"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 border-0 focus:ring-2 focus:ring-edulink-primary focus:outline-none transition-all"
                  />
                </div>
                
                <div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 border-0 focus:ring-2 focus:ring-edulink-primary focus:outline-none transition-all"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-edulink-primary focus:ring-edulink-primary"
                    />
                    <span>Remember me</span>
                  </label>
                  
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-edulink-accent hover:text-edulink-accent/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                {message && (
                  <div className="text-center text-sm text-red-300 bg-red-900/20 p-3 rounded-lg">
                    {message}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-edulink-primary to-edulink-accent text-white font-semibold rounded-lg hover:from-edulink-primary/90 hover:to-edulink-accent/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
              
              <div className="text-center mt-6 text-gray-300">
                <span>Don't have an account? </span>
                <Link 
                  to="/register" 
                  className="text-edulink-accent hover:text-edulink-accent/80 font-medium transition-colors"
                >
                  Sign up here
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;