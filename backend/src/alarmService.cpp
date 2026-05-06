#include "alarmService.h"
#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>

namespace
{
std::filesystem::path configFilePath()
{
  return "/app/data/config.json";
}

void saveConfigToFile(const json& config)
{
  try
  {
    const auto path = configFilePath();
    std::filesystem::create_directories(path.parent_path());
    std::ofstream out(path);
    if (out)
    {
      out << config.dump(2);
    }
  }
  catch (...) {}
}

json loadConfigFromFile()
{
  std::ifstream in(configFilePath());
  if (!in)
  {
    return json{};
  }
  json config = json::parse(in, nullptr, false);
  return config.is_discarded() ? json{} : config;
}


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

bool soundExists(const std::string& soundType, const json& customSounds)
{
  if (findSound(soundType) != nullptr)
  {
    return true;
  }

  if (!customSounds.is_array())
  {
    return false;
  }

  for (const auto& sound : customSounds)
  {
    if (sound.is_object() && sound.value("id", "") == soundType)
    {
      return true;
    }
  }

  return false;
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

std::string currentIsoTimestamp()
{
  const std::tm localTime = getLocalTime();
  return formatTime(localTime, "%Y-%m-%dT%H:%M:%S");
}

bool lessonTriggersNow(const json& lesson, const std::string& nowTime)
{
  const bool startsNow = lesson.contains("startTime") && lesson["startTime"].is_string() && lesson["startTime"].get<std::string>() == nowTime;
  const bool endsNow = lesson.contains("endTime") && lesson["endTime"].is_string() && lesson["endTime"].get<std::string>() == nowTime;
  return startsNow || endsNow;
}

int currentIsoWeekday()
{
  std::tm localTime = getLocalTime();
  const int weekday = localTime.tm_wday;
  return weekday == 0 ? 7 : weekday;
}

json defaultDaysOfWeek()
{
  return json::array({1, 2, 3, 4, 5});
}

bool isValidDayOfWeek(int day)
{
  return day >= 1 && day <= 7;
}

bool matchesCurrentDay(const json& item, int currentDay)
{
  if (!item.contains("daysOfWeek") || !item["daysOfWeek"].is_array())
  {
    return true;
  }

  for (const auto& day : item["daysOfWeek"])
  {
    if (day.is_number_integer() && day.get<int>() == currentDay)
    {
      return true;
    }
  }

  return false;
}

std::string stringifyId(const json& value)
{
  if (value.is_string())
  {
    return value.get<std::string>();
  }
  if (value.is_number_integer())
  {
    return std::to_string(value.get<int>());
  }
  if (value.is_number_unsigned())
  {
    return std::to_string(value.get<unsigned int>());
  }
  if (value.is_number_float())
  {
    std::ostringstream stream;
    stream << value.get<double>();
    return stream.str();
  }
  return "";
}

std::string makeCustomSoundId()
{
  const auto now = std::chrono::system_clock::now().time_since_epoch();
  return "custom-" + std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(now).count());
}

std::string sanitizeExtension(const std::string& fileName)
{
  const std::size_t dot = fileName.find_last_of('.');
  if (dot == std::string::npos || dot == fileName.size() - 1)
  {
    return ".bin";
  }

  std::string extension = fileName.substr(dot);
  if (extension.size() > 10)
  {
    return ".bin";
  }

  for (char& ch : extension)
  {
    ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
  }

  for (char ch : extension)
  {
    if (!(std::isalnum(static_cast<unsigned char>(ch)) || ch == '.'))
    {
      return ".bin";
    }
  }

  return extension;
}

std::string shellQuote(const std::string& value)
{
  std::string quoted = "'";
  for (char ch : value)
  {
    if (ch == '\'')
    {
      quoted += "'\"'\"'";
    }
    else
    {
      quoted += ch;
    }
  }
  quoted += "'";
  return quoted;
}

std::filesystem::path customSoundsDirectory()
{
  return "/app/sounds/custom";
}

void normalizeCustomSounds(json& sounds)
{
  if (!sounds.is_array())
  {
    sounds = json::array();
    return;
  }

  for (auto& sound : sounds)
  {
    if (!sound.is_object())
    {
      sound = json::object();
    }

    if (!sound.contains("id") || !sound["id"].is_string() || sound["id"].get<std::string>().empty())
    {
      sound["id"] = makeCustomSoundId();
    }

    if (!sound.contains("label") || !sound["label"].is_string())
    {
      sound["label"] = "Кастомний звук";
    }

    if (!sound.contains("description") || !sound["description"].is_string())
    {
      sound["description"] = "";
    }

    if (!sound.contains("tags") || !sound["tags"].is_array())
    {
      sound["tags"] = json::array();
    }

    json normalizedTags = json::array();
    for (const auto& tag : sound["tags"])
    {
      if (tag.is_string() && !tag.get<std::string>().empty())
      {
        normalizedTags.push_back(tag.get<std::string>());
      }
    }
    sound["tags"] = normalizedTags;

    if (!sound.contains("fileName") || !sound["fileName"].is_string())
    {
      sound["fileName"] = sound["id"].get<std::string>() + ".bin";
    }

    if (!sound.contains("filePath") || !sound["filePath"].is_string() || sound["filePath"].get<std::string>().empty())
    {
      const std::string id = sound["id"].get<std::string>();
      sound["filePath"] = (customSoundsDirectory() / (id + sanitizeExtension(sound["fileName"].get<std::string>()))).string();
    }

    if (!sound.contains("createdAt") || !sound["createdAt"].is_string())
    {
      sound["createdAt"] = currentIsoTimestamp();
    }
  }
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

void normalizeLessonSounds(json& lessons, const json& customSounds)
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

    if (!lesson.contains("id"))
    {
      lesson["id"] = 0;
    }

    if (!lesson.contains("label") || !lesson["label"].is_string())
    {
      lesson["label"] = "";
    }

    if (!lesson.contains("startTime") || !lesson["startTime"].is_string())
    {
      lesson["startTime"] = "08:30";
    }

    if (!lesson.contains("endTime") || !lesson["endTime"].is_string())
    {
      lesson["endTime"] = "09:15";
    }

    if (!lesson.contains("enabled") || !lesson["enabled"].is_boolean())
    {
      lesson["enabled"] = true;
    }

    if (!lesson.contains("daysOfWeek") || !lesson["daysOfWeek"].is_array())
    {
      lesson["daysOfWeek"] = defaultDaysOfWeek();
    }

    json normalizedDays = json::array();
    for (const auto& day : lesson["daysOfWeek"])
    {
      if (day.is_number_integer())
      {
        const int dayValue = day.get<int>();
        if (isValidDayOfWeek(dayValue))
        {
          normalizedDays.push_back(dayValue);
        }
      }
    }
    lesson["daysOfWeek"] = normalizedDays.empty() ? defaultDaysOfWeek() : normalizedDays;

    const std::string legacySoundType = lesson.value("soundType", defaultSound().id);
    std::string startSoundType = lesson.value("startSoundType", legacySoundType);
    std::string endSoundType = lesson.value("endSoundType", legacySoundType);

    if (!soundExists(startSoundType, customSounds))
    {
      startSoundType = defaultSound().id;
    }
    if (!soundExists(endSoundType, customSounds))
    {
      endSoundType = defaultSound().id;
    }

    lesson["startSoundType"] = startSoundType;
    lesson["endSoundType"] = endSoundType;
    lesson["soundType"] = startSoundType;
  }
}

void normalizeSingleEvents(json& events, const json& customSounds)
{
  if (!events.is_array())
  {
    events = json::array();
    return;
  }

  for (auto& event : events)
  {
    if (!event.is_object())
    {
      event = json::object();
    }

    if (!event.contains("id"))
    {
      event["id"] = "";
    }

    if (!event.contains("label") || !event["label"].is_string())
    {
      event["label"] = "";
    }

    if (!event.contains("triggerTime") || !event["triggerTime"].is_string())
    {
      event["triggerTime"] = "08:15";
    }

    if (!event.contains("enabled") || !event["enabled"].is_boolean())
    {
      event["enabled"] = true;
    }

    if (!event.contains("daysOfWeek") || !event["daysOfWeek"].is_array())
    {
      event["daysOfWeek"] = defaultDaysOfWeek();
    }

    json normalizedDays = json::array();
    for (const auto& day : event["daysOfWeek"])
    {
      if (day.is_number_integer())
      {
        const int dayValue = day.get<int>();
        if (isValidDayOfWeek(dayValue))
        {
          normalizedDays.push_back(dayValue);
        }
      }
    }
    event["daysOfWeek"] = normalizedDays.empty() ? defaultDaysOfWeek() : normalizedDays;

    std::string soundType = event.value("soundType", defaultSound().id);
    if (!soundExists(soundType, customSounds))
    {
      soundType = defaultSound().id;
    }
    event["soundType"] = soundType;
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
  json saved = loadConfigFromFile();
  if (saved.is_object() && !saved.empty())
  {
    std::cout << "Завантажено конфіг із " << configFilePath() << std::endl;
    alarmConfig = saved;
  }
  else
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
    alarmConfig["events"] = json::array();
    alarmConfig["customSounds"] = json::array();
  }
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
  std::lock_guard<std::mutex> lock(alarmMutex);
  for (const auto& sound : soundCatalog())
  {
    sounds.push_back({
      {"id", sound.id},
      {"label", sound.label},
      {"description", ""},
      {"tags", json::array()},
      {"fileName", ""},
      {"createdAt", ""},
      {"isCustom", false},
      {"commandEnv", sound.envCommandName}
    });
  }

  if (alarmConfig.contains("customSounds") && alarmConfig["customSounds"].is_array())
  {
    for (const auto& sound : alarmConfig["customSounds"])
    {
      sounds.push_back({
        {"id", sound.value("id", "")},
        {"label", sound.value("label", "Кастомний звук")},
        {"description", sound.value("description", "")},
        {"tags", sound.value("tags", json::array())},
        {"fileName", sound.value("fileName", "")},
        {"createdAt", sound.value("createdAt", "")},
        {"isCustom", true},
        {"commandEnv", ""}
      });
    }
  }

  return sounds;
}

void AlarmService::setConfig(const json& config)
{
  {
    std::lock_guard<std::mutex> lock(alarmMutex);
    alarmConfig = config;
    normalizeConfig();
    saveConfigToFile(alarmConfig);
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
  saveConfigToFile(alarmConfig);
}

json AlarmService::addCustomSound(const std::string& name, const std::string& description, const std::vector<std::string>& tags, const std::string& fileName, const std::string& fileContent)
{
  if (name.empty())
  {
    throw std::runtime_error("Назва звуку обов'язкова");
  }
  if (fileName.empty() || fileContent.empty())
  {
    throw std::runtime_error("Файл звуку обов'язковий");
  }

  const std::string id = makeCustomSoundId();
  const std::filesystem::path directory = customSoundsDirectory();
  std::filesystem::create_directories(directory);
  const std::filesystem::path filePath = directory / (id + sanitizeExtension(fileName));

  {
    std::ofstream output(filePath, std::ios::binary);
    if (!output)
    {
      throw std::runtime_error("Не вдалося зберегти файл звуку");
    }
    output.write(fileContent.data(), static_cast<std::streamsize>(fileContent.size()));
    if (!output.good())
    {
      throw std::runtime_error("Не вдалося записати файл звуку");
    }
  }

  json sound = {
    {"id", id},
    {"label", name},
    {"description", description},
    {"tags", tags},
    {"fileName", fileName},
    {"filePath", filePath.string()},
    {"createdAt", currentIsoTimestamp()}
  };

  {
    std::lock_guard<std::mutex> lock(alarmMutex);
    if (!alarmConfig.contains("customSounds") || !alarmConfig["customSounds"].is_array())
    {
      alarmConfig["customSounds"] = json::array();
    }
    alarmConfig["customSounds"].push_back(sound);
    normalizeConfig();
    saveConfigToFile(alarmConfig);
  }

  return sound;
}

json AlarmService::updateCustomSound(const std::string& id, const std::string& name, const std::string& description, const std::vector<std::string>& tags)
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  json* sound = findCustomSoundUnlocked(id);
  if (sound == nullptr)
  {
    throw std::runtime_error("Кастомний звук не знайдено");
  }

  if (!name.empty())
  {
    (*sound)["label"] = name;
  }
  (*sound)["description"] = description;
  (*sound)["tags"] = tags;
  normalizeConfig();
  saveConfigToFile(alarmConfig);
  return *findCustomSoundUnlocked(id);
}

void AlarmService::deleteCustomSound(const std::string& id)
{
  std::lock_guard<std::mutex> lock(alarmMutex);
  if (!alarmConfig.contains("customSounds") || !alarmConfig["customSounds"].is_array())
  {
    throw std::runtime_error("Кастомний звук не знайдено");
  }

  auto& customSounds = alarmConfig["customSounds"];
  for (auto it = customSounds.begin(); it != customSounds.end(); ++it)
  {
    if (it->is_object() && it->value("id", "") == id)
    {
      const std::string filePath = it->value("filePath", "");
      customSounds.erase(it);
      normalizeConfig();
      saveConfigToFile(alarmConfig);
      if (!filePath.empty())
      {
        std::error_code error;
        std::filesystem::remove(filePath, error);
      }
      return;
    }
  }

  throw std::runtime_error("Кастомний звук не знайдено");
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

void AlarmService::triggerManual(const std::string& soundType)
{
  if (soundType == "hymn")
  {
    playHymn();
  }
  else if (soundType == "fire_alarm")
  {
    playFireAlarm();
  }
  else if (soundType == "bell")
  {
    playAlarm();
  }
  else
  {
    std::cout << "[SOUND] Manual: " << soundType << std::endl;
    playSound(soundType);
  }
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
  if (!alarmConfig.contains("customSounds") || !alarmConfig["customSounds"].is_array())
  {
    alarmConfig["customSounds"] = json::array();
  }

  alarmConfig.erase("sounds");
  const auto scheduleType = alarmConfig["scheduleType"].get<std::string>();
  auto& schedules = alarmConfig["schedules"];
  auto& customSounds = alarmConfig["customSounds"];
  normalizeCustomSounds(customSounds);

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
    normalizeLessonSounds(schedule.value(), customSounds);
  }

  if (alarmConfig.contains("lessons") && alarmConfig["lessons"].is_array())
  {
    normalizeLessonSounds(alarmConfig["lessons"], customSounds);
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

  if (!alarmConfig.contains("events") || !alarmConfig["events"].is_array())
  {
    alarmConfig["events"] = json::array();
  }
  normalizeSingleEvents(alarmConfig["events"], customSounds);
}

bool AlarmService::soundExistsUnlocked(const std::string& soundType) const
{
  if (findSound(soundType) != nullptr)
  {
    return true;
  }

  const json* customSound = findCustomSoundUnlocked(soundType);
  return customSound != nullptr;
}

json* AlarmService::findCustomSoundUnlocked(const std::string& soundId)
{
  if (!alarmConfig.contains("customSounds") || !alarmConfig["customSounds"].is_array())
  {
    return nullptr;
  }

  for (auto& sound : alarmConfig["customSounds"])
  {
    if (sound.is_object() && sound.value("id", "") == soundId)
    {
      return &sound;
    }
  }

  return nullptr;
}

const json* AlarmService::findCustomSoundUnlocked(const std::string& soundId) const
{
  if (!alarmConfig.contains("customSounds") || !alarmConfig["customSounds"].is_array())
  {
    return nullptr;
  }

  for (const auto& sound : alarmConfig["customSounds"])
  {
    if (sound.is_object() && sound.value("id", "") == soundId)
    {
      return &sound;
    }
  }

  return nullptr;
}

void AlarmService::triggerLesson(const json& lesson, bool isEndTrigger)
{
  const auto soundType = lesson.value(isEndTrigger ? "endSoundType" : "startSoundType", lesson.value("soundType", defaultSound().id));
  const SoundDefinition* sound = findSound(soundType);

  if (sound == nullptr)
  {
    std::cout << "[SOUND] Custom: " << soundType << std::endl;
    playSound(soundType);
  }
  else if (sound->id == "hymn") { playHymn(); }
  else if (sound->id == "fire_alarm") { playFireAlarm(); }
  else { playAlarm(); }

  sendTriggerToMainSoft(lesson);
}

void AlarmService::triggerSingleEvent(const json& event)
{
  const auto soundType = event.value("soundType", defaultSound().id);
  const SoundDefinition* sound = findSound(soundType);

  if (sound == nullptr)
  {
    std::cout << "[SOUND] Custom: " << soundType << std::endl;
    playSound(soundType);
  }
  else if (sound->id == "hymn") { playHymn(); }
  else if (sound->id == "fire_alarm") { playFireAlarm(); }
  else { playAlarm(); }
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
        const int currentDay = currentIsoWeekday();

        if (lastTriggerMinuteKey != nowKey)
        {
          lastTriggerMinuteKey = nowKey;
          triggeredKeysForMinute.clear();
        }

        for (const auto& lesson : configSnapshot["lessons"])
        {
          if (!lesson.value("enabled", true) || !matchesCurrentDay(lesson, currentDay))
          {
            continue;
          }

          const std::string lessonId = lesson.contains("id") ? stringifyId(lesson["id"]) : "";
          if (lesson.contains("startTime") && lesson["startTime"].is_string() && lesson["startTime"].get<std::string>() == nowTime)
          {
            const auto lessonKey = nowKey + "|lesson|" + lessonId + "|start|" + lesson.value("startTime", "");
            if (triggeredKeysForMinute.find(lessonKey) == triggeredKeysForMinute.end())
            {
              triggeredKeysForMinute.insert(lessonKey);
              triggerLesson(lesson, false);
            }
          }

          if (lesson.contains("endTime") && lesson["endTime"].is_string() && lesson["endTime"].get<std::string>() == nowTime)
          {
            const auto lessonKey = nowKey + "|lesson|" + lessonId + "|end|" + lesson.value("endTime", "");
            if (triggeredKeysForMinute.find(lessonKey) == triggeredKeysForMinute.end())
            {
              triggeredKeysForMinute.insert(lessonKey);
              triggerLesson(lesson, true);
            }
          }
        }

        if (configSnapshot.contains("events") && configSnapshot["events"].is_array())
        {
          for (const auto& event : configSnapshot["events"])
          {
            if (!event.value("enabled", true) || !matchesCurrentDay(event, currentDay))
            {
              continue;
            }

            if (!event.contains("triggerTime") || !event["triggerTime"].is_string() || event["triggerTime"].get<std::string>() != nowTime)
            {
              continue;
            }

            const std::string eventId = event.contains("id") ? stringifyId(event["id"]) : "";
            const auto eventKey = nowKey + "|single|" + eventId + "|" + event.value("triggerTime", "");
            if (triggeredKeysForMinute.find(eventKey) == triggeredKeysForMinute.end())
            {
              triggeredKeysForMinute.insert(eventKey);
              triggerSingleEvent(event);
            }
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
  std::string command;
  {
    std::lock_guard<std::mutex> lock(alarmMutex);
    const json* customSound = findCustomSoundUnlocked(soundType);
    if (customSound != nullptr)
    {
      const std::string filePath = customSound->value("filePath", "");
      if (!filePath.empty())
      {
        const std::string quotedPath = shellQuote(filePath);
        command = "ffplay -nodisp -autoexit -loglevel error " + quotedPath + " >/dev/null 2>&1 || aplay " + quotedPath + " >/dev/null 2>&1";
      }
    }
  }

  if (command.empty())
  {
    command = commandForSound(soundType);
  }

  const int result = std::system(command.c_str());
  if (result != 0)
  {
    const SoundDefinition* sound = findSound(soundType);
    const std::string envName = sound != nullptr ? sound->envCommandName : "custom sound file";
    std::cerr << "Не вдалося відтворити звук типу '" << soundType
              << "'. Перевірте аудіо середовище або задайте "
              << envName
              << "." << std::endl;
  }
}
