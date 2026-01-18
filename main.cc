#include <drogon/drogon.h>
#include <json/json.h>
#include <filesystem>
#include <cstdlib>

using namespace drogon;
namespace fs = std::filesystem;

static const size_t MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file

int main() {
    auto& app = drogon::app();

    /* ---------------- HEALTH ---------------- */
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

    /* ---------------- MERGE PDFs ---------------- */
    app.registerHandler(
        "/merge",
        [](const HttpRequestPtr& req,
           std::function<void(const HttpResponsePtr&)>&& cb) {

            Json::Value response;

            if (req->getContentType() != CT_MULTIPART_FORM_DATA) {
                response["error"] = "multipart/form-data required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            MultiPartParser parser;
            if (parser.parse(req) != 0) {
                response["error"] = "Failed to parse multipart body";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& files = parser.getFiles();
            if (files.size() < 2) {
                response["error"] = "At least two PDF files are required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            std::vector<std::string> inputPaths;

            // Save uploaded PDFs
            for (const auto& file : files) {
                if (file.getFileExtension() != "pdf") {
                    response["error"] = "Only PDF files are allowed";
                    cb(HttpResponse::newHttpJsonResponse(response));
                    return;
                }

                if (file.fileLength() > MAX_FILE_SIZE) {
                    response["error"] = "One or more files exceed 10MB";
                    cb(HttpResponse::newHttpJsonResponse(response));
                    return;
                }

                std::string id = utils::getUuid();
                fs::path path = fs::path("/tmp") / (id + ".pdf");
                file.saveAs(path.string());
                inputPaths.push_back(path.string());
            }

            // Output file
            std::string outputId = utils::getUuid();
            fs::path outputPath = fs::path("/tmp") / (outputId + ".pdf");

            // Build QPDF command
            std::string cmd = "qpdf --empty \"" + outputPath.string() + "\" --pages ";
            for (const auto& p : inputPaths) {
                cmd += "\"" + p + "\" ";
            }
            cmd += "-- \"" + outputPath.string() + "\"";

            int result = std::system(cmd.c_str());
            if (result != 0) {
                response["error"] = "PDF merge failed";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            response["status"] = "success";
            response["file_id"] = outputId;

            cb(HttpResponse::newHttpJsonResponse(response));
        },
        {Post}
    );

    app.addListener("0.0.0.0", 8080);
    app.run();
}
