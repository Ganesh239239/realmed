#include <drogon/drogon.h>

using namespace drogon;

int main() {
    app().registerHandler(
        "/health",
        [](const HttpRequestPtr&, std::function<void(const HttpResponsePtr&)>&& cb) {
            auto resp = HttpResponse::newHttpJsonResponse(
                Json::Value("ok")
            );
            cb(resp);
        },
        {Get}
    );

    app()
        .addListener("0.0.0.0", 8080)
        .run();
}
