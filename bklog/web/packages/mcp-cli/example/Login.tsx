import React, { useState } from 'react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { username, password });
  };

  return (
    <div data-testid="login-container">
      <h1 data-testid="login-title">Login</h1>
      
      <form data-testid="login-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            data-testid="username-input"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        
        <div>
          <label htmlFor="password">Password:</label>
          <input
            data-testid="password-input"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        
        <button 
          data-testid="login-btn"
          type="submit"
        >
          Login
        </button>
        
        <button 
          data-testid="forgot-password-btn"
          type="button"
          onClick={() => console.log('Forgot password')}
        >
          Forgot Password?
        </button>
      </form>
    </div>
  );
}