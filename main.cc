#include <drogon/drogon.h>
#include <json/json.h>
#include <filesystem>
#include <fstream>
#include <cstdlib>

using namespace drogon;
namespace fs = std::filesystem;

static const size_t MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    /* ---------------- MERGE ---------------- */
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
                response["error"] = "At least two PDFs required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            std::vector<std::string> inputs;
            for (const auto& f : files) {
                if (f.getFileExtension() != "pdf" ||
                    f.fileLength() > MAX_FILE_SIZE) {
                    response["error"] = "Invalid PDF file";
                    cb(HttpResponse::newHttpJsonResponse(response));
                    return;
                }
                fs::path p = fs::path("/tmp") / (utils::getUuid() + ".pdf");
                f.saveAs(p.string());
                inputs.push_back(p.string());
            }

            std::string outId = utils::getUuid();
            fs::path outPath = fs::path("/tmp") / (outId + ".pdf");

            std::string cmd = "qpdf --empty \"" + outPath.string() + "\" --pages ";
            for (auto& p : inputs) cmd += "\"" + p + "\" ";
            cmd += "-- \"" + outPath.string() + "\"";

            if (std::system(cmd.c_str()) != 0) {
                response["error"] = "Merge failed";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            response["status"] = "success";
            response["file_id"] = outId;
            cb(HttpResponse::newHttpJsonResponse(response));
        },
        {Post}
    );

    /* ---------------- SPLIT ---------------- */
    app.registerHandler(
        "/split",
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
            if (files.size() != 1) {
                response["error"] = "Exactly one PDF required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& file = files[0];
            if (file.getFileExtension() != "pdf" ||
                file.fileLength() > MAX_FILE_SIZE) {
                response["error"] = "Invalid PDF";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            fs::path inputPath = fs::path("/tmp") / (utils::getUuid() + ".pdf");
            file.saveAs(inputPath.string());

            fs::path outputDir = fs::path("/tmp") / utils::getUuid();
            fs::create_directory(outputDir);

            std::string cmd =
                "qpdf --split-pages \"" + inputPath.string() +
                "\" \"" + (outputDir / "page-%d.pdf").string() + "\"";

            if (std::system(cmd.c_str()) != 0) {
                response["error"] = "Split failed";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            Json::Value pages(Json::arrayValue);
            for (const auto& entry : fs::directory_iterator(outputDir)) {
                pages.append(entry.path().filename().string());
            }

            response["status"] = "success";
            response["files"] = pages;
            cb(HttpResponse::newHttpJsonResponse(response));
        },
        {Post}
    );

    /* ---------------- DOWNLOAD ---------------- */
    app.registerHandler(
        "/download/{id}",
        [](const HttpRequestPtr& req,
           std::function<void(const HttpResponsePtr&)>&& cb,
           std::string id) {

            fs::path filePath = fs::path("/tmp") / (id + ".pdf");

            if (!fs::exists(filePath)) {
                auto resp = HttpResponse::newNotFoundResponse();
                cb(resp);
                return;
            }

            auto resp = HttpResponse::newFileResponse(filePath.string());
            resp->addHeader("Content-Type", "application/pdf");
            resp->addHeader(
                "Content-Disposition",
                "attachment; filename=\"result.pdf\""
            );

            cb(resp);
        },
        {Get}
    );

    app.addListener("0.0.0.0", 8080);
    app.run();
}
