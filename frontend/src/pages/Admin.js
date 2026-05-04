import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { alarmService } from '../services/apiService';
import '../styles/Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [config, setConfig] = useState({ lessons: [] });
  const [scheduleType, setScheduleType] = useState('full');
  const [newLesson, setNewLesson] = useState({ startTime: '09:00', endTime: '10:30', soundType: 'bell' });

  const getSoundTypeLabel = (soundType) => {
    switch (soundType) {
      case 'bell':
        return 'Дзвінок';
      case 'hymn':
        return 'Гімн України';
      case 'custom':
        return 'Власний';
      default:
        return soundType;
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    alarmService.getConfig().then(res => {
      setConfig(res.data);
      setScheduleType(res.data.scheduleType || 'full');
    });
  }, [user, navigate]);

  const handleAddLesson = () => {
    setConfig({
      ...config,
      lessons: [...config.lessons, newLesson]
    });
    setNewLesson({ startTime: '09:00', endTime: '10:30', soundType: 'bell' });
  };

  const handleRemoveLesson = (index) => {
    setConfig({
      ...config,
      lessons: config.lessons.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      await alarmService.setConfig(config);
      alert('Налаштування збережено');
    } catch (err) {
      alert('Помилка при збереженні');
    }
  };

  const handleScheduleTypeChange = async (newType) => {
    setScheduleType(newType);
    try {
      await alarmService.setScheduleType(newType);
    } catch (err) {
      alert('Помилка при зміні типу розкладу');
    }
  };

  const handleToggleEnabled = () => {
    setConfig({ ...config, isEnabled: !config.isEnabled });
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Панель адміністратора</h1>
        <button onClick={logout} className="logout-btn">
          Вийти
        </button>
      </header>

      <div className="admin-content">
        <section className="settings-section">
          <div className="toggle-setting">
            <label>
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={handleToggleEnabled}
              />
              Увімкнути сигнали тривоги
            </label>
          </div>

          <div className="schedule-type-setting">
            <h3>Тип розкладу</h3>
            <div className="schedule-type-buttons">
              <button
                className={`type-btn ${scheduleType === 'full' ? 'active' : ''}`}
                onClick={() => handleScheduleTypeChange('full')}
              >
                Повний
              </button>
              <button
                className={`type-btn ${scheduleType === 'short' ? 'active' : ''}`}
                onClick={() => handleScheduleTypeChange('short')}
              >
                Скорочений
              </button>
            </div>
            <p className="schedule-type-info">Поточний тип: <strong>{scheduleType === 'full' ? 'Повний' : 'Скорочений'}</strong></p>
          </div>
        </section>

        <section className="lessons-section">
          <h2>Налаштування уроків</h2>

          <div className="add-lesson">
            <h3>Додати новий урок</h3>
            <div className="form-group">
              <input
                type="time"
                value={newLesson.startTime}
                onChange={(e) => setNewLesson({ ...newLesson, startTime: e.target.value })}
              />
              <input
                type="time"
                value={newLesson.endTime}
                onChange={(e) => setNewLesson({ ...newLesson, endTime: e.target.value })}
              />
              <select
                value={newLesson.soundType}
                onChange={(e) => setNewLesson({ ...newLesson, soundType: e.target.value })}
              >
                <option value="bell">Дзвінок</option>
                <option value="hymn">Гімн України</option>
                <option value="custom">Власний</option>
              </select>
              <button onClick={handleAddLesson} className="add-btn">
                Додати
              </button>
            </div>
          </div>

          <div className="lessons-list">
            <h3>Поточні уроки</h3>
            {config.lessons && config.lessons.map((lesson, index) => (
              <div key={index} className="lesson-item">
                <span>{lesson.startTime} - {lesson.endTime}</span>
                <span className="sound-type">{getSoundTypeLabel(lesson.soundType)}</span>
                <button onClick={() => handleRemoveLesson(index)} className="remove-btn">
                  Видалити
                </button>
              </div>
            ))}
          </div>

          <button onClick={handleSave} className="save-btn">
            Зберегти налаштування
          </button>
        </section>
      </div>
    </div>
  );
};

export default Admin;