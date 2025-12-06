"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const ollama_1 = require("./ollama");
const cors_1 = __importDefault(require("cors"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const port = 5000;
const expressApp = (0, express_1.default)();
const proxy = http_proxy_1.default.createServer({
    target: "http://localhost:5100", ws: true
});
expressApp.use((0, cors_1.default)({ origin: "http://localhost:5100" }));
expressApp.use(express_1.default.json());
expressApp.post("/read", ollama_1.ollamaResponse);
expressApp.use(express_1.default.static("static"));
expressApp.use(express_1.default.static("node_modules/bootstrap/dist"));
//expressApp.use(express.static("dist/client"));
expressApp.use((req, resp) => proxy.web(req, resp));
const server = (0, http_1.createServer)(expressApp);
server.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
server.listen(port, () => console.log(`HTTP Server listening on port ${port}`));
//# sourceMappingURL=server.js.map