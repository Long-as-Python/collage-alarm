import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { alarmService } from '../services/apiService';
import '../styles/Admin.css';

const DEFAULT_SOUND = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';

const Admin = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const [scheduleType, setScheduleType] = useState('full');
  const [config, setConfig] = useState({ isEnabled: true, lessons: [] });
  const [newLesson, setNewLesson] = useState({ startTime: '09:00', endTime: '10:30', soundType: 'bell' });
  const [sounds, setSounds] = useState([
    { id: 'bell', name: 'Дзвінок', url: DEFAULT_SOUND },
    { id: 'hymn', name: 'Гімн України', url: DEFAULT_SOUND }
  ]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    Promise.all([alarmService.getConfig(), alarmService.getAllSchedules()])
      .then(([configResponse, schedulesResponse]) => {
        const nextConfig = configResponse.data || { isEnabled: true, lessons: [] };
        const nextScheduleType = nextConfig.scheduleType || 'full';
        const nextSchedules = nextConfig.schedules || schedulesResponse.data || {};
        const nextLessons = nextSchedules[nextScheduleType] || nextConfig.lessons || [];

        setScheduleType(nextScheduleType);
        setConfig({
          ...nextConfig,
          schedules: nextSchedules,
          lessons: nextLessons
        });
      })
      .catch(err => {
        console.error('Помилка при завантаженні конфігу:', err);
      });
  }, [user, navigate]);

  const normalizeTimeValue = (value) => {
    const digits = String(value || '').replace(/[^0-9:]/g, '');
    if (/^\d{2}:\d{2}$/.test(digits)) {
      return digits;
    }

    const compactDigits = digits.replace(/:/g, '');
    if (/^\d{4}$/.test(compactDigits)) {
      return `${compactDigits.slice(0, 2)}:${compactDigits.slice(2, 4)}`;
    }

    return value;
  };

  const handleScheduleTypeChange = async (value) => {
    setConfig(prev => {
      const updatedSchedules = {
        ...(prev.schedules || {}),
        [scheduleType]: prev.lessons || []
      };

      return {
        ...prev,
        scheduleType: value,
        schedules: updatedSchedules,
        lessons: updatedSchedules[value] || []
      };
    });

    setScheduleType(value);
    try {
      await alarmService.setScheduleType(value);
    } catch (err) {
      console.error('Помилка при зміні типу розкладу:', err);
    }
  };

  const handleAddLesson = () => {
    const lessons = [...(config.lessons || []), {
      ...newLesson,
      startTime: normalizeTimeValue(newLesson.startTime),
      endTime: normalizeTimeValue(newLesson.endTime)
    }];
    setConfig({
      ...config,
      lessons,
      schedules: {
        ...(config.schedules || {}),
        [scheduleType]: lessons
      }
    });
  };

  const handleRemoveLesson = (index) => {
    const lessons = (config.lessons || []).filter((_, lessonIndex) => lessonIndex !== index);
    setConfig({
      ...config,
      lessons,
      schedules: {
        ...(config.schedules || {}),
        [scheduleType]: lessons
      }
    });
  };

  const handleLessonChange = (index, field, value) => {
    const lessons = [...(config.lessons || [])];
    lessons[index] = { ...lessons[index], [field]: field === 'startTime' || field === 'endTime' ? normalizeTimeValue(value) : value };
    setConfig({
      ...config,
      lessons,
      schedules: {
        ...(config.schedules || {}),
        [scheduleType]: lessons
      }
    });
  };

  const handleAddSound = () => {
    fileInputRef.current?.click();
  };

  const handleSoundUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const newSound = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: loadEvent.target.result
      };

      setSounds(prev => [...prev, newSound]);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDeleteSound = (soundId) => {
    const remainingSounds = sounds.filter(sound => sound.id !== soundId);
    const fallbackSound = remainingSounds[0] || null;
    const rewriteLessons = (lessons) => (lessons || []).map(lesson => (
      lesson.soundType === soundId ? { ...lesson, soundType: fallbackSound ? fallbackSound.id : '' } : lesson
    ));

    const updatedSchedules = Object.entries(config.schedules || {}).reduce((accumulator, [key, lessons]) => {
      accumulator[key] = rewriteLessons(lessons);
      return accumulator;
    }, {});

    setSounds(remainingSounds);
    setConfig({
      ...config,
      lessons: rewriteLessons(config.lessons),
      schedules: updatedSchedules
    });
  };

  const handleSaveConfig = async () => {
    try {
      const schedules = {
        ...(config.schedules || {}),
        [scheduleType]: config.lessons || []
      };

      await alarmService.setConfig({
        ...config,
        scheduleType,
        schedules,
        lessons: config.lessons || [],
        sounds
      });
      alert('Налаштування збережено');
    } catch (err) {
      console.error(err);
      alert('Помилка при збереженні');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Налаштування звуків</h1>
        <button onClick={logout} className="logout-btn">Вийти</button>
      </header>

      <div className="admin-content">
        <section className="sound-control-section">
          <div className="sound-card">
            <label>Тип розкладу</label>
            <select className="song-select" value={scheduleType} onChange={(e) => handleScheduleTypeChange(e.target.value)}>
              <option value="full">Повний</option>
              <option value="short">Скорочений</option>
            </select>
          </div>

          <div className="sound-card">
            <label>Додати звук</label>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleSoundUpload} style={{ display: 'none' }} />
            <button className="plain-btn" onClick={handleAddSound}>Додати звук</button>
            <div className="sounds-list">
              {sounds.map(sound => (
                <div key={sound.id} className="sound-item">
                  <span>{sound.name}</span>
                  <button className="plain-btn danger small" onClick={() => handleDeleteSound(sound.id)}>Видалити</button>
                </div>
              ))}
            </div>
          </div>

          <div className="sound-card">
            <label>Уроки</label>
            <div className="lesson-editor">
              <input type="text" inputMode="numeric" placeholder="08:30" value={newLesson.startTime} onChange={(e) => setNewLesson({ ...newLesson, startTime: normalizeTimeValue(e.target.value) })} />
              <input type="text" inputMode="numeric" placeholder="09:50" value={newLesson.endTime} onChange={(e) => setNewLesson({ ...newLesson, endTime: normalizeTimeValue(e.target.value) })} />
              <select value={newLesson.soundType || ''} onChange={(e) => setNewLesson({ ...newLesson, soundType: e.target.value })}>
                {sounds.length === 0 && <option value="">Немає звуків</option>}
                {sounds.map(sound => <option key={sound.id} value={sound.id}>{sound.name}</option>)}
              </select>
              <button className="plain-btn" onClick={handleAddLesson}>Додати</button>
            </div>

            <div className="lessons-list">
              {(config.lessons || []).map((lesson, index) => (
                <div className="lesson-item" key={index}>
                  <input type="text" inputMode="numeric" value={lesson.startTime || ''} onChange={(e) => handleLessonChange(index, 'startTime', e.target.value)} />
                  <input type="text" inputMode="numeric" value={lesson.endTime || ''} onChange={(e) => handleLessonChange(index, 'endTime', e.target.value)} />
                  <select value={lesson.soundType || ''} onChange={(e) => handleLessonChange(index, 'soundType', e.target.value)}>
                    {sounds.length === 0 && <option value="">Немає звуків</option>}
                    {sounds.map(sound => <option key={sound.id} value={sound.id}>{sound.name}</option>)}
                  </select>
                  <button className="plain-btn danger" onClick={() => handleRemoveLesson(index)}>Видалити</button>
                </div>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={handleSaveConfig} className="plain-btn">Зберегти</button>
          </div>
        </section>
      </div>

    </div>
  );
};

export default Admin;