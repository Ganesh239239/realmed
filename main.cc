#include <drogon/drogon.h>
#include <json/json.h>
#include <filesystem>

using namespace drogon;
namespace fs = std::filesystem;

static const size_t MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

int main() {
    auto& app = drogon::app();

    // Health endpoint
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

    // Upload endpoint (VERSION-SAFE)
    app.registerHandler(
        "/upload",
        [](const HttpRequestPtr& req,
           std::function<void(const HttpResponsePtr&)>&& cb) {

            Json::Value response;

            if (req->getContentType() != CT_MULTIPART_FORM_DATA) {
                response["error"] = "multipart/form-data required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& filesMap = req->getFilesMap();

            if (filesMap.empty()) {
                response["error"] = "No file uploaded";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            // Take first uploaded file (field name does not matter)
            const auto& firstEntry = filesMap.begin()->second;
            if (firstEntry.empty()) {
                response["error"] = "Empty file upload";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& file = firstEntry[0];

            if (file.fileLength() > MAX_FILE_SIZE) {
                response["error"] = "File too large (max 10MB)";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            if (file.getFileExtension() != "pdf") {
                response["error"] = "Only PDF files allowed";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            std::string uuid = utils::getUuid();
            fs::path outputPath = fs::path("/tmp") / (uuid + ".pdf");

            file.saveAs(outputPath.string());

            response["status"] = "success";
            response["file_id"] = uuid;

            cb(HttpResponse::newHttpJsonResponse(response));
        },
        {Post}
    );

    app.addListener("0.0.0.0", 8080);
    app.run();
}
