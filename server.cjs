const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf"
};

function createServerOnPort(port) {
    const server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        let reqPath = decodeURIComponent(parsedUrl.pathname);
        if (reqPath === "/") reqPath = "/index.html";

        const filePath = path.normalize(path.join(ROOT, reqPath));

        if (!filePath.startsWith(ROOT)) {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("403 Forbidden");
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404 Not Found");
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || "application/octet-stream";

            const range = req.headers.range;
            if (range && ext === ".mp4") {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
                const chunksize = (end - start) + 1;

                const stream = fs.createReadStream(filePath, { start, end });
                res.writeHead(206, {
                    "Content-Range": `bytes ${start}-${end}/${stats.size}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": contentType
                });
                stream.pipe(res);
                return;
            }

            res.writeHead(200, {
                "Content-Length": stats.size,
                "Content-Type": contentType,
                "Accept-Ranges": "bytes",
                "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });
    });

    server.on("error", (e) => {
        if (e.code === "EADDRINUSE") {
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            createServerOnPort(port + 1);
        } else {
            console.error("Server error:", e);
        }
    });

    server.listen(port, "0.0.0.0", () => {
        console.log(`🚀 JustForms server running at: http://localhost:${port}`);
    });
}

createServerOnPort(PORT);
