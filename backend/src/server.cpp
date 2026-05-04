#include "server.h"
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <thread>
#include <chrono>
#include <ctime>

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
}

AppServer::AppServer(int port) : port(port)
{
}

void AppServer::start()
{
  std::cout << "Сервер системи сигналів коледжу запускається на порту " << port << std::endl;
  setupRoutes();

  httplib::Server server;

  server.set_post_routing_handler([](const httplib::Request&, httplib::Response& res) {
    addCorsHeaders(res);
  });

  server.Options(R"(/api/.*)", [](const httplib::Request&, httplib::Response& res) {
    addCorsHeaders(res);
    res.status = 204;
  });

  server.Post("/api/auth/login", [this](const httplib::Request&, httplib::Response& res) {
    auto response = authService.loginStudent();
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/auth/admin-login", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("password") || !payload["password"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      addCorsHeaders(res);
      res.set_content(response.dump(), "application/json");
      return;
    }

    auto response = authService.loginAdmin(payload["password"].get<std::string>());
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/auth/verify", [this](const httplib::Request&, httplib::Response& res) {
    auto response = nlohmann::json{{"success", true}};
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/schedule/all", [this](const httplib::Request&, httplib::Response& res) {
    auto response = nlohmann::json{
      {"success", true},
      {"scheduleType", alarmService.getConfig().value("scheduleType", "full")},
      {"full", scheduleService.getFullSchedule()},
      {"short", scheduleService.getShortSchedule()}
    };
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/schedule/current", [this](const httplib::Request&, httplib::Response& res) {
    auto scheduleType = alarmService.getConfig().value("scheduleType", "full");
    auto response = nlohmann::json{
      {"success", true},
      {"scheduleType", scheduleType},
      {"schedule", scheduleService.getScheduleByType(scheduleType)}
    };
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/alarms/config", [this](const httplib::Request&, httplib::Response& res) {
    auto response = alarmService.getConfig();
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/alarms/config", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний JSON"}};
      addCorsHeaders(res);
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    alarmService.setConfig(payload);
    auto response = nlohmann::json{{"success", true}, {"config", alarmService.getConfig()}};
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Post("/api/alarms/schedule-type", [this](const httplib::Request& req, httplib::Response& res) {
    auto payload = nlohmann::json::parse(req.body, nullptr, false);
    if (payload.is_discarded() || !payload.contains("scheduleType") || !payload["scheduleType"].is_string()) {
      auto response = nlohmann::json{{"success", false}, {"error", "Некоректний запит"}};
      addCorsHeaders(res);
      res.status = 400;
      res.set_content(response.dump(), "application/json");
      return;
    }

    alarmService.setScheduleType(payload["scheduleType"].get<std::string>());
    auto response = nlohmann::json{{"success", true}, {"config", alarmService.getConfig()}};
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  server.Get("/api/alarms/current", [](const httplib::Request&, httplib::Response& res) {
    auto response = nlohmann::json{{"success", true}, {"time", currentTimeString()}};
    addCorsHeaders(res);
    res.set_content(response.dump(), "application/json");
  });

  std::cout << "\nДоступні маршрути:" << std::endl;
  std::cout << "  POST   /api/auth/login" << std::endl;
  std::cout << "  POST   /api/auth/admin-login" << std::endl;
  std::cout << "  GET    /api/auth/verify" << std::endl;
  std::cout << "  GET    /api/schedule/all" << std::endl;
  std::cout << "  GET    /api/schedule/current" << std::endl;
  std::cout << "  GET    /api/alarms/config" << std::endl;
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