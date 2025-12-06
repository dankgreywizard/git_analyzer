import { createServer } from "http";
import express, {Express } from "express";
import { ollamaResponse } from "./ollama";
import cors from "cors";
import httpProxy from "http-proxy";

const port = 5000;

const expressApp: Express = express();
const proxy = httpProxy.createServer({
    target: "http://localhost:5100", ws: true
});
expressApp.use(cors({origin: "http://localhost:5100"}));
expressApp.use(express.json());

expressApp.post("/read", ollamaResponse);
expressApp.use(express.static("static"));
expressApp.use(express.static("node_modules/bootstrap/dist"));
//expressApp.use(express.static("dist/client"));
expressApp.use((req, resp) => proxy.web(req,resp));

const server = createServer(expressApp);
server.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
server.listen(port,
    () => console.log(`HTTP Server listening on port ${port}`));


