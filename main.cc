#include <drogon/drogon.h>
#include <json/json.h>

using namespace drogon;

int main() {
    auto& app = drogon::app();

    app.registerHandler(
        "/health",
        [](const HttpRequestPtr&,
           std::function<void(const HttpResponsePtr&)>&& callback) {
            Json::Value json;
            json["status"] = "ok";

            auto resp = HttpResponse::newHttpJsonResponse(json);
            callback(resp);
        },
        {Get}
    );

    app.addListener("0.0.0.0", 8080);
    app.run();
}
