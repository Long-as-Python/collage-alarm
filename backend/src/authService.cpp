#include "authService.h"
#include <cstdlib>
#include <iostream>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace
{
std::string getEnvValue(const char* name, const char* fallback)
{
#ifdef _MSC_VER
  char* buffer = nullptr;
  size_t bufferSize = 0;
  if (_dupenv_s(&buffer, &bufferSize, name) == 0 && buffer != nullptr)
  {
    std::string value(buffer);
    free(buffer);
    return value.empty() ? fallback : value;
  }

  if (buffer != nullptr)
  {
    free(buffer);
  }

  return fallback;
#else
  const char* value = std::getenv(name);
  return (value != nullptr && value[0] != '\0') ? value : fallback;
#endif
}
}

AuthService::AuthService()
{
  jwtSecret = getEnvValue("JWT_SECRET", "secret-key-collage-alarm");
  adminPassword = getEnvValue("ADMIN_PASSWORD", "admin123");
}

std::string AuthService::generateToken(const std::string& role)
{
  std::time_t now = std::time(nullptr);
  std::stringstream ss;
  ss << std::hex << now << "-" << role << "-" << (now + 86400);
  return ss.str();
}

bool AuthService::verifyToken(const std::string& token)
{
  return !token.empty() && token.length() > 10;
}

bool AuthService::verifyAdminPassword(const std::string& password)
{
  return password == adminPassword;
}

json AuthService::loginStudent()
{
  json response;
  response["success"] = true;
  response["role"] = "student";
  response["token"] = generateToken("student");
  return response;
}

json AuthService::loginAdmin(const std::string& password)
{
  json response;

  if (verifyAdminPassword(password))
  {
    response["success"] = true;
    response["role"] = "admin";
    response["token"] = generateToken("admin");
  }
  else
  {
    response["success"] = false;
    response["error"] = "Невірний пароль адміністратора";
  }

  return response;
}
