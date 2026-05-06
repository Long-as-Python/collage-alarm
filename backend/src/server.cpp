#include "server.h"
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <thread>
#include <chrono>
#include <ctime>
#include <sstream>
#include <vector>

namespace
{
void addCorsHeaders(httplib::Response& res)
{
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

std::string currentTimeString()
{
  std::time_t now = std::time(nullptr);
  std::tm localTime{};
#ifdef _WIN32
  localtime_s(&localTime, &now);
#else
  localTime = *std::localtime(&now);
#endif

  char buffer[32];
  std::strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &localTime);
  return buffer;
}

json getStoredSchedule(const json& config, const std::string& scheduleType, const json& fallback)
{
  if (config.contains("schedules") && config["schedules"].is_object())
  {
    const auto& schedules = config["schedules"];
    if (schedules.contains(scheduleType) && schedules[scheduleType].is_array())
    {
      return schedules[scheduleType];
    }
  }

  return fallback;
}

std::vector<std::string> splitTags(const std::string& tags)
{
  std::vector<std::string> result;
  std::stringstream stream(tags);
  std::string item;
  while (std::getline(stream, item, ','))
  {
    const auto start = item.find_first_not_of(" \t\n\r");
    if (start == std::string::npos)
    {
      continue;
    }
    const auto end = item.find_last_not_of(" \t\n\r");
    result.push_back(item.substr(start, end - start + 1));
  }
  return result;
}

std::string multipartValue(const httplib::Request& req, const std::string& key)
{
  if (req.has_param(key))
  {
    return req.get_param_value(key);
  }

  if (req.has_file(key))
  {
    return req.get_file_value(key).content;
  }

  return "";
}
}

AppServer::AppServer(int port) : port(port)
{
}

void AppServer::start()
{
  std::cout << "Сервер системи сигналів коледжу запускається на порту " << port << std::endl;
  setupRoutes();

  httplib::Server server;

  server.set_post_routing_handler([](const httplib::Request& req, httplib::Response& res) {
    addCorsHeaders(res);
  });

  server.Options(R"(/api/.*)", [](const httplib::Request&, httplib::Response& res) {
    res.status = 204;
  });

  server.Post("/api/auth/login", [this](const httplib::Request&, httplib::Response& res) {
    auto response = authService.loginStudent();
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/auth/admin-login", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("password") || !payload["password"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      res.set_content(response.dump(), "application/json");
      return;
    }

    auto response = authService.loginAdmin(payload["password"].get<std::string>());
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/auth/verify", [this](const httplib::Request&, httplib::Response& res) {
    auto response = nlohmann::json{{"success", true}};
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/schedule/all", [this](const httplib::Request&, httplib::Response& res) {
    auto config = alarmService.getConfig();
    auto response = nlohmann::json{
      {"success", true},
      {"scheduleType", config.value("scheduleType", "full")},
      {"full", getStoredSchedule(config, "full", scheduleService.getFullSchedule())},
      {"short", getStoredSchedule(config, "short", scheduleService.getShortSchedule())}
    };
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/schedule/current", [this](const httplib::Request&, httplib::Response& res) {
    auto config = alarmService.getConfig();
    auto scheduleType = config.value("scheduleType", "full");
    auto response = nlohmann::json{
      {"success", true},
      {"scheduleType", scheduleType},
      {"schedule", getStoredSchedule(config, scheduleType, scheduleService.getScheduleByType(scheduleType))}
    };
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/alarms/config", [this](const httplib::Request&, httplib::Response& res) {
    auto response = alarmService.getConfig();
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/alarms/sounds", [this](const httplib::Request&, httplib::Response& res) {
    auto response = nlohmann::json{{"success", true}, {"sounds", alarmService.getAvailableSounds()}};
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/alarms/sounds", [this](const httplib::Request& req, httplib::Response& res) {
    if (!req.has_file("file"))
    {
      auto response = nlohmann::json{{"success", false}, {"error", "Файл звуку обов'язковий"}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    const std::string name = multipartValue(req, "name");
    const std::string description = multipartValue(req, "description");
    const std::string tagsRaw = multipartValue(req, "tags");
    const auto file = req.get_file_value("file");

    try
    {
      auto sound = alarmService.addCustomSound(name, description, splitTags(tagsRaw), file.filename, file.content);
      auto response = nlohmann::json{{"success", true}, {"sound", sound}};
      res.set_content(response.dump(), "application/json");
    }
    catch (const std::exception& e)
    {
      auto response = nlohmann::json{{"success", false}, {"error", e.what()}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
    }
  });

  server.Post("/api/alarms/sounds/update", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("id") || !payload["id"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    try
    {
      const std::vector<std::string> tags = payload.contains("tags") && payload["tags"].is_array()
        ? payload["tags"].get<std::vector<std::string>>()
        : std::vector<std::string>{};
      auto sound = alarmService.updateCustomSound(
        payload["id"].get<std::string>(),
        payload.value("name", ""),
        payload.value("description", ""),
        tags
      );
      auto response = nlohmann::json{{"success", true}, {"sound", sound}};
      res.set_content(response.dump(), "application/json");
    }
    catch (const std::exception& e)
    {
      auto response = nlohmann::json{{"success", false}, {"error", e.what()}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
    }
  });

  server.Post("/api/alarms/sounds/delete", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("id") || !payload["id"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    try
    {
      alarmService.deleteCustomSound(payload["id"].get<std::string>());
      auto response = nlohmann::json{{"success", true}};
      res.set_content(response.dump(), "application/json");
    }
    catch (const std::exception& e)
    {
      auto response = nlohmann::json{{"success", false}, {"error", e.what()}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
    }
  });

  server.Post("/api/alarms/fire", [this](const httplib::Request&, httplib::Response& res) {
    alarmService.playFireAlarm();
    auto response = nlohmann::json{{"success", true}, {"soundType", "fire_alarm"}};
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/alarms/play", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("soundType") || !payload["soundType"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }
    alarmService.triggerManual(payload["soundType"].get<std::string>());
    auto response = nlohmann::json{{"success", true}, {"soundType", payload["soundType"]}};
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/alarms/config", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний JSON"}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    alarmService.setConfig(payload);
    auto response = nlohmann::json{{"success", true}, {"config", alarmService.getConfig()}};
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/alarms/schedule-type", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("scheduleType") || !payload["scheduleType"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    alarmService.setScheduleType(payload["scheduleType"].get<std::string>());
    auto response = nlohmann::json{{"success", true}, {"config", alarmService.getConfig()}};
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/alarms/current", [](const httplib::Request&, httplib::Response& res) {
    auto response = nlohmann::json{{"success", true}, {"time", currentTimeString()}};
    res.set_content(response.dump(), "application/json");
  });

  std::cout << "\nДоступні маршрути:" << std::endl;
  std::cout << "  POST   /api/auth/login" << std::endl;
  std::cout << "  POST   /api/auth/admin-login" << std::endl;
  std::cout << "  GET    /api/auth/verify" << std::endl;
  std::cout << "  GET    /api/schedule/all" << std::endl;
  std::cout << "  GET    /api/schedule/current" << std::endl;
  std::cout << "  GET    /api/alarms/config" << std::endl;
  std::cout << "  GET    /api/alarms/sounds" << std::endl;
  std::cout << "  POST   /api/alarms/sounds" << std::endl;
  std::cout << "  POST   /api/alarms/sounds/update" << std::endl;
  std::cout << "  POST   /api/alarms/sounds/delete" << std::endl;
  std::cout << "  POST   /api/alarms/fire" << std::endl;
  std::cout << "  POST   /api/alarms/play" << std::endl;
  std::cout << "  POST   /api/alarms/config" << std::endl;
  std::cout << "  POST   /api/alarms/schedule-type" << std::endl;
  std::cout << "  GET    /api/alarms/current" << std::endl;

  std::cout << "\nСервер працює. Натисніть Ctrl+C, щоб зупинити.\n" << std::endl;

  if (!server.listen("0.0.0.0", port))
  {
    throw std::runtime_error("Не вдалося запустити HTTP-сервер");
  }
}

void AppServer::setupRoutes()
{
  std::cout << "Налаштування маршрутів API" << std::endl;
}
