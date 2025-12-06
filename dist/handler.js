"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultHandler = exports.newUrlHandler = exports.notFoundHandler = exports.handler = void 0;
const fs_1 = require("fs");
const handler = async (req, resp) => {
    console.log(`${req.method} , url: ${req.url}`);
    console.log(`host: ${req.headers.host}`);
    console.log(`accept ${req.headers.accept}`);
    console.log(`user-agent ${req.headers["user-agent"]}`);
    const parsedUrl = new URL(req.url ?? "", `http://${req.headers.host}`);
    console.log(`protocol: ${parsedUrl.protocol}`);
    console.log(`hostname ${parsedUrl.hostname}`);
    console.log(`port ${parsedUrl.port}`);
    console.log(`pathName ${parsedUrl.pathname}`);
    parsedUrl.searchParams.forEach((value, key) => {
        console.log(`searchParam key: ${key}, value: ${value}`);
    });
    resp.write((0, fs_1.readFileSync)("static/index.html"));
    resp.end();
};
exports.handler = handler;
const notFoundHandler = (req, resp) => {
    resp.sendStatus(404);
};
exports.notFoundHandler = notFoundHandler;
const newUrlHandler = (req, resp) => {
    const msg = req.params.message ?? "(No Message)";
    resp.send(`Hello, ${msg}`);
};
exports.newUrlHandler = newUrlHandler;
const defaultHandler = (req, resp) => {
    if (req.query.keyword) {
        resp.send(`Hello, ${req.query.keyword}`);
    }
    else {
        resp.send(`Hello, ${req.protocol.toUpperCase()}`);
    }
};
exports.defaultHandler = defaultHandler;
//# sourceMappingURL=handler.js.map