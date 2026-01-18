#include <drogon/drogon.h>
#include <json/json.h>

using namespace drogon;

int main() {
    app().registerHandler(
        "/health",
        [](const HttpRequestPtr&,
           std::function<void(const HttpResponsePtr&)>&& cb) {
            Json::Value response;
            response["status"] = "ok";

            auto resp = HttpResponse::newHttpJsonResponse(response);
            cb(resp);
        },
        {Get}
    );

    app()
        .addListener("0.0.0.0", 8080)
        .run();
}
