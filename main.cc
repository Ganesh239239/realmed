#include <drogon/drogon.h>
#include <json/json.h>
#include <filesystem>
#include <cstdlib>
#include <chrono>
#include <unordered_set>

using namespace drogon;
namespace fs = std::filesystem;

/* ---------------- CONFIG ---------------- */
static const size_t MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
static const int MAX_FILE_AGE_SECONDS = 15 * 60;     // 15 minutes

static const std::unordered_set<std::string> VALID_API_KEYS = {
    "test_api_key_123",
    "prod_api_key_abc"
};

/* -------- API KEY CHECK -------- */
bool checkApiKey(const HttpRequestPtr& req,
                 std::function<void(const HttpResponsePtr&)>& cb) {
    auto key = req->getHeader("X-API-Key");

    if (key.empty() || VALID_API_KEYS.find(key) == VALID_API_KEYS.end()) {
        Json::Value err;
        err["error"] = "Invalid or missing API key";
        auto resp = HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(k401Unauthorized);
        cb(resp);
        return false;
    }
    return true;
}

/* -------- CLEANUP OLD FILES ON STARTUP -------- */
void cleanupTmp() {
    using clock = fs::file_time_type::clock;
    auto now = clock::now();

    for (const auto& entry : fs::directory_iterator("/tmp")) {
        if (!entry.is_regular_file()) continue;

        auto ftime = fs::last_write_time(entry);
        auto age = std::chrono::duration_cast<std::chrono::seconds>(
            now - ftime
        ).count();

        if (age > MAX_FILE_AGE_SECONDS) {
            std::error_code ec;
            fs::remove(entry.path(), ec);
        }
    }
}

int main() {
    auto& app = drogon::app();

    cleanupTmp();

    /* ---------------- HEALTH (PUBLIC) ---------------- */
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

            if (!checkApiKey(req, cb)) return;

            Json::Value response;

            if (req->getContentType() != CT_MULTIPART_FORM_DATA) {
                response["error"] = "multipart/form-data required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            MultiPartParser parser;
            if (parser.parse(req) != 0) {
                response["error"] = "Failed to parse multipart data";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& files = parser.getFiles();
            if (files.size() < 2) {
                response["error"] = "At least two PDF files required";
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
            for (const auto& p : inputs) cmd += "\"" + p + "\" ";
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

            if (!checkApiKey(req, cb)) return;

            Json::Value response;

            if (req->getContentType() != CT_MULTIPART_FORM_DATA) {
                response["error"] = "multipart/form-data required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            MultiPartParser parser;
            if (parser.parse(req) != 0) {
                response["error"] = "Failed to parse multipart data";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& files = parser.getFiles();
            if (files.size() != 1) {
                response["error"] = "Exactly one PDF file required";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            const auto& file = files[0];
            if (file.getFileExtension() != "pdf" ||
                file.fileLength() > MAX_FILE_SIZE) {
                response["error"] = "Invalid PDF file";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            fs::path inputPath = fs::path("/tmp") / (utils::getUuid() + ".pdf");
            file.saveAs(inputPath.string());

            fs::path outDir = fs::path("/tmp") / utils::getUuid();
            fs::create_directory(outDir);

            std::string cmd =
                "qpdf --split-pages \"" + inputPath.string() +
                "\" \"" + (outDir / "page-%d.pdf").string() + "\"";

            if (std::system(cmd.c_str()) != 0) {
                response["error"] = "Split failed";
                cb(HttpResponse::newHttpJsonResponse(response));
                return;
            }

            Json::Value pages(Json::arrayValue);
            for (const auto& e : fs::directory_iterator(outDir)) {
                pages.append(e.path().filename().string());
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

            if (!checkApiKey(req, cb)) return;

            fs::path filePath = fs::path("/tmp") / (id + ".pdf");

            if (!fs::exists(filePath)) {
                cb(HttpResponse::newNotFoundResponse());
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
