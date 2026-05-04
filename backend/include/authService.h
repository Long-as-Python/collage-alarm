#ifndef AUTH_SERVICE_H
#define AUTH_SERVICE_H

#include <nlohmann/json.hpp>
#include <string>

using json = nlohmann::json;

class AuthService
{
private:
  std::string jwtSecret;
  std::string adminPassword;

public:
  AuthService();
  std::string generateToken(const std::string& role);
  bool verifyToken(const std::string& token);
  bool verifyAdminPassword(const std::string& password);
  json loginStudent();
  json loginAdmin(const std::string& password);
};

#endif
