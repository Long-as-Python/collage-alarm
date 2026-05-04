import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/apiService';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = async () => {
    try {
      const response = await authService.adminLogin(adminPassword.trim());

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Невірний пароль');
      }

      login(response.data.token || 'admin-session', 'admin');
      navigate('/admin');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Невірний пароль');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Вхід до налаштувань</h1>
        <div className="admin-form">
          <input
            type="password"
            placeholder="Пароль адміністратора"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="admin-input"
          />
          <button onClick={handleAdminLogin} className="submit-btn">
            Увійти
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;