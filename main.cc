#include <drogon/drogon.h>
#include <json/json.h>
#include <filesystem>

using namespace drogon;
namespace fs = std::filesystem;

static const size_t MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

int main() {
    auto& app = drogon::app();

    // Health check
    app.registerHandler(
        "/health",
        [](const HttpRequestPtr&,
           std::function<void(const HttpResponsePtr&)>&& cb) {
            Json::Value json;
            json["status"] = "ok";
            cb(HttpResponse::newHttpJsonResponse(json));
        },
        {Get}
    );

    // File upload endpoint
    app.registerHandler(
        "/upload",
        [](const HttpRequestPtr& req,
           std::function<void(const HttpResponsePtr&)>&& cb) {

            Json::Value response;

            // Check content type
            if (req->getContentType() != CT_MULTIPART_FORM_DATA) {
                response["error"] = "Content-Type must be multipart/form-data";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            auto files = req->getFiles();
            if (files.empty()) {
                response["error"] = "No file uploaded";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& file = files[0];

            // Validate size
            if (file.fileLength() > MAX_FILE_SIZE) {
                response["error"] = "File too large (max 10MB)";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            // Validate extension
            if (file.getFileExtension() != "pdf") {
                response["error"] = "Only PDF files allowed";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            // Create safe temp path
            std::string uuid = utils::getUuid();
            fs::path outputPath = fs::path("/tmp") / (uuid + ".pdf");

            // Save file
            file.saveAs(outputPath.string());

            response["status"] = "success";
            response["file_id"] = uuid;
            response["path"] = outputPath.string();

            cb(HttpResponse::newHttpJsonResponse(response));
        },
        {Post}
    );

    app.addListener("0.0.0.0", 8080);
    app.run();
}
