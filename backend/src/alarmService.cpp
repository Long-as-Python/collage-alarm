#include "alarmService.h"
#include <chrono>
#include <cstdlib>
#include <ctime>
#include <iostream>

namespace
{
struct SoundDefinition
{
  std::string id;
  std::string label;
  std::string envCommandName;
};

const std::vector<SoundDefinition>& soundCatalog()
{
  static const std::vector<SoundDefinition> sounds = {
    {"bell", "Дзвінок", "ALARM_BELL_COMMAND"},
    {"hymn", "Гімн України", "ALARM_HYMN_COMMAND"},
    {"fire_alarm", "Пожежна тривога", "ALARM_FIRE_COMMAND"},
    {"custom", "Власний сигнал", "ALARM_CUSTOM_COMMAND"}
  };
  return sounds;
}

const SoundDefinition& defaultSound()
{
  return soundCatalog().front();
}

const SoundDefinition* findSound(const std::string& soundType)
{
  for (const auto& sound : soundCatalog())
  {
    if (sound.id == soundType)
    {
      return &sound;
    }
  }

  return nullptr;
}

std::string getEnvValue(const char* name)
{
#ifdef _MSC_VER
  char* buffer = nullptr;
  size_t bufferSize = 0;
  if (_dupenv_s(&buffer, &bufferSize, name) == 0 && buffer != nullptr)
  {
    std::string value(buffer);
    free(buffer);
    return value;
  }

  if (buffer != nullptr)
  {
    free(buffer);
  }

  return "";
#else
  const char* value = std::getenv(name);
  return value != nullptr ? value : "";
#endif
}

std::tm getLocalTime()
{
  std::time_t now = std::time(nullptr);
  std::tm localTime{};
#ifdef _WIN32
  localtime_s(&localTime, &now);
#else
  localTime = *std::localtime(&now);
#endif
  return localTime;
}

std::string formatTime(const std::tm& localTime, const char* format)
{
  char buffer[32];
  std::strftime(buffer, sizeof(buffer), format, &localTime);
  return buffer;
}

std::string currentDateTimeKey()
{
  const std::tm localTime = getLocalTime();
  return formatTime(localTime, "%Y-%m-%d %H:%M");
}

std::string currentTimeHHMM()
{
  const std::tm localTime = getLocalTime();
  return formatTime(localTime, "%H:%M");
}

bool lessonTriggersNow(const json& lesson, const std::string& nowTime)
{
  const bool startsNow = lesson.contains("startTime") && lesson["startTime"].is_string() && lesson["startTime"].get<std::string>() == nowTime;
  const bool endsNow = lesson.contains("endTime") && lesson["endTime"].is_string() && lesson["endTime"].get<std::string>() == nowTime;
  return startsNow || endsNow;
}

json makeSlot(int id, const std::string& startTime, const std::string& endTime, const std::string& soundType)
{
  return json{{"id", id}, {"startTime", startTime}, {"endTime", endTime}, {"soundType", soundType}};
}

json makeDefaultFullSchedule()
{
  json schedule = json::array();
  schedule.push_back(makeSlot(1, "08:30", "09:50", "bell"));
  schedule.push_back(makeSlot(2, "10:00", "11:20", "bell"));
  schedule.push_back(makeSlot(3, "11:50", "13:10", "bell"));
  schedule.push_back(makeSlot(4, "13:20", "14:40", "bell"));
  schedule.push_back(makeSlot(5, "15:00", "16:20", "bell"));
  schedule.push_back(makeSlot(6, "16:30", "17:50", "bell"));
  schedule.push_back(makeSlot(7, "18:00", "19:20", "bell"));
  schedule.push_back(makeSlot(8, "19:30", "20:50", "bell"));
  return schedule;
}

json makeDefaultShortSchedule()
{
  json schedule = json::array();
  schedule.push_back(makeSlot(1, "08:30", "09:30", "bell"));
  schedule.push_back(makeSlot(2, "09:40", "10:40", "bell"));
  schedule.push_back(makeSlot(3, "10:50", "11:50", "bell"));
  schedule.push_back(makeSlot(4, "12:00", "13:00", "bell"));
  schedule.push_back(makeSlot(5, "13:10", "14:10", "bell"));
  schedule.push_back(makeSlot(6, "14:20", "15:20", "bell"));
  schedule.push_back(makeSlot(7, "15:30", "16:30", "bell"));
  schedule.push_back(makeSlot(8, "16:40", "17:40", "bell"));
  return schedule;
}

void normalizeLessonSounds(json& lessons)
{
  if (!lessons.is_array())
  {
    lessons = json::array();
    return;
  }

  for (auto& lesson : lessons)
  {
    if (!lesson.is_object())
    {
      lesson = json::object();
    }

    const std::string soundType = lesson.value("soundType", defaultSound().id);
    if (findSound(soundType) == nullptr)
    {
      lesson["soundType"] = defaultSound().id;
    }
  }
}

std::string commandForSound(const std::string& soundType)
{
  const SoundDefinition* sound = findSound(soundType);
  const std::string envName = sound != nullptr ? sound->envCommandName : defaultSound().envCommandName;

  const std::string envCommand = getEnvValue(envName.c_str());
  if (!envCommand.empty())
  {
    return envCommand;
  }

#ifdef _WIN32
  if (soundType == "fire_alarm")
  {
    return "powershell -NoProfile -Command \"1..6 | ForEach-Object {[console]::beep(1200,250);[console]::beep(650,250)}\"";
  }
  if (soundType == "hymn")
  {
    return "powershell -NoProfile -Command \"[console]::beep(523,300);[console]::beep(587,300);[console]::beep(659,600)\"";
  }
  return "powershell -NoProfile -Command \"[console]::beep(1000,700)\"";
#elif defined(__APPLE__)
  if (soundType == "fire_alarm")
  {
    return "sh -c 'for i in 1 2 3 4; do afplay /System/Library/Sounds/Sosumi.aiff; afplay /System/Library/Sounds/Glass.aiff; done'";
  }
  if (soundType == "hymn")
  {
    return "osascript -e 'beep 3'";
  }
  return "afplay /System/Library/Sounds/Glass.aiff";
#else
  if (soundType == "fire_alarm")
  {
    return "sh -c 'paplay /usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga 2>/dev/null || paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || printf \"\\a\\a\\a\\a\"'";
  }
  if (soundType == "hymn")
  {
    return "sh -c 'paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || printf \"\\a\\a\\a\"'";
  }
  return "sh -c 'paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || printf \"\\a\"'";
#endif
}
}

AlarmService::AlarmService()
  : schedulerRunning(true)
{
  alarmConfig = json::object();
  alarmConfig["isEnabled"] = true;
  alarmConfig["scheduleType"] = "full";
  const char* mainSoftApiUrl = std::getenv("MAIN_SOFT_API_URL");
  alarmConfig["mainSoftApiUrl"] = mainSoftApiUrl != nullptr ? mainSoftApiUrl : "";
  alarmConfig["schedules"] = json::object();
  alarmConfig["schedules"]["full"] = makeDefaultFullSchedule();
  alarmConfig["schedules"]["short"] = makeDefaultShortSchedule();
  alarmConfig["lessons"] = alarmConfig["schedules"]["full"];
  normalizeConfig();
  restartScheduler();
  schedulerThread = std::thread(&AlarmService::schedulerLoop, this);
}

AlarmService::~AlarmService()
{
  schedulerRunning = false;
  if (schedulerThread.joinable())
  {
    schedulerThread.join();
  }
}

json AlarmService::getConfig()
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  return alarmConfig;
}

json AlarmService::getAvailableSounds()
{
  json sounds = json::array();
  for (const auto& sound : soundCatalog())
  {
    sounds.push_back({
      {"id", sound.id},
      {"label", sound.label},
      {"commandEnv", sound.envCommandName}
    });
  }

  return sounds;
}

void AlarmService::setConfig(const json& config)
{
  {
    std::lock_guard<std::mutex> lock(alarmMutex);
    alarmConfig = config;
    normalizeConfig();
  }
  restartScheduler();
}

void AlarmService::setScheduleType(const std::string& scheduleType)
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  alarmConfig["scheduleType"] = scheduleType;
  if (alarmConfig.contains("schedules") && alarmConfig["schedules"].is_object())
  {
    auto& schedules = alarmConfig["schedules"];
    if (schedules.contains(scheduleType) && schedules[scheduleType].is_array())
    {
      alarmConfig["lessons"] = schedules[scheduleType];
    }
  }
  normalizeConfig();
}

void AlarmService::playAlarm()
{
  std::cout << "[SOUND] Дзвінок" << std::endl;
  playSound("bell");
}

void AlarmService::playHymn()
{
  std::cout << "[SOUND] Гімн України" << std::endl;
  playSound("hymn");
}

void AlarmService::playFireAlarm()
{
  std::cout << "[SOUND] Пожежна тривога" << std::endl;
  playSound("fire_alarm");
}

void AlarmService::restartScheduler()
{
  if (alarmConfig.value("isEnabled", true))
  {
    std::cout << "Планувальник перезапущено" << std::endl;
  }
  else
  {
    std::cout << "Планувальник вимкнено" << std::endl;
  }
}

void AlarmService::normalizeConfig()
{
  if (!alarmConfig.contains("isEnabled") || !alarmConfig["isEnabled"].is_boolean())
  {
    alarmConfig["isEnabled"] = true;
  }

  if (!alarmConfig.contains("scheduleType") || !alarmConfig["scheduleType"].is_string())
  {
    alarmConfig["scheduleType"] = "full";
  }

  if (!alarmConfig.contains("schedules") || !alarmConfig["schedules"].is_object())
  {
    alarmConfig["schedules"] = json::object();
  }

  alarmConfig.erase("sounds");
  const auto scheduleType = alarmConfig["scheduleType"].get<std::string>();
  auto& schedules = alarmConfig["schedules"];

  if (!schedules.contains("full") || !schedules["full"].is_array())
  {
    schedules["full"] = makeDefaultFullSchedule();
  }

  if (!schedules.contains("short") || !schedules["short"].is_array())
  {
    schedules["short"] = makeDefaultShortSchedule();
  }

  for (auto& schedule : schedules.items())
  {
    normalizeLessonSounds(schedule.value());
  }

  if (alarmConfig.contains("lessons") && alarmConfig["lessons"].is_array())
  {
    normalizeLessonSounds(alarmConfig["lessons"]);
    schedules[scheduleType] = alarmConfig["lessons"];
  }
  else if (schedules.contains(scheduleType) && schedules[scheduleType].is_array())
  {
    alarmConfig["lessons"] = schedules[scheduleType];
  }
  else
  {
    alarmConfig["scheduleType"] = "full";
    alarmConfig["lessons"] = schedules["full"];
  }
}

void AlarmService::triggerLesson(const json& lesson)
{
  const auto soundType = lesson.value("soundType", defaultSound().id);
  const SoundDefinition* sound = findSound(soundType);
  const std::string resolvedSoundType = sound != nullptr ? sound->id : defaultSound().id;

  if (resolvedSoundType == "hymn")
  {
    playHymn();
  }
  else if (resolvedSoundType == "fire_alarm")
  {
    playFireAlarm();
  }
  else if (resolvedSoundType == "bell")
  {
    playAlarm();
  }
  else
  {
    std::cout << "[SOUND] " << (sound != nullptr ? sound->label : defaultSound().label) << std::endl;
    playSound(resolvedSoundType);
  }

  sendTriggerToMainSoft(lesson);
}

void AlarmService::sendTriggerToMainSoft(const json& lesson)
{
  const auto apiUrl = alarmConfig.value("mainSoftApiUrl", "");
  if (apiUrl.empty())
  {
    std::cout << "[API] Main soft URL not configured, local trigger only" << std::endl;
    return;
  }

  std::cout << "[API] Trigger sent to main soft: " << apiUrl << std::endl;
  std::cout << "[API] Lesson start: " << lesson.value("startTime", "") << std::endl;
}

void AlarmService::schedulerLoop()
{
  while (schedulerRunning)
  {
    try
    {
      json configSnapshot;
      {
        std::lock_guard<std::mutex> lock(alarmMutex);
        configSnapshot = alarmConfig;
      }

      if (configSnapshot.value("isEnabled", true) && configSnapshot.contains("lessons") && configSnapshot["lessons"].is_array())
      {
        const auto nowTime = currentTimeHHMM();
        const auto nowKey = currentDateTimeKey();

        for (const auto& lesson : configSnapshot["lessons"])
        {
          const auto lessonKey = nowKey + "|" + lesson.value("startTime", "") + "|" + lesson.value("endTime", "");

          if (lessonTriggersNow(lesson, nowTime) && lastTriggeredKey != lessonKey)
          {
            lastTriggeredKey = lessonKey;
            triggerLesson(lesson);
          }
        }
      }
    }
    catch (const std::exception& e)
    {
      std::cout << "Помилка планувальника: " << e.what() << std::endl;
    }

    std::this_thread::sleep_for(std::chrono::seconds(20));
  }
}

void AlarmService::playSound(const std::string& soundType)
{
  const std::string command = commandForSound(soundType);
  const int result = std::system(command.c_str());
  if (result != 0)
  {
    const SoundDefinition* sound = findSound(soundType);
    const std::string envName = sound != nullptr ? sound->envCommandName : defaultSound().envCommandName;
    std::cerr << "Не вдалося відтворити звук типу '" << soundType
              << "'. Перевірте аудіо середовище або задайте "
              << envName
              << "." << std::endl;
  }
}
