import {IncomingMessage, ServerResponse} from "node:http";
import {Request, Response} from "express";
import {readFileSync} from "fs";

export const handler = async(req: IncomingMessage, resp: ServerResponse) => {
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
    resp.write(readFileSync("static/index.html"));
    resp.end();
}

export const notFoundHandler = (req: Request, resp: Response) => {
    resp.sendStatus(404);
}

export const newUrlHandler = (req: Request, resp: Response) => {
    const msg = req.params.message ?? "(No Message)";
    resp.send(`Hello, ${msg}`);
}

export const defaultHandler = (req: Request, resp:Response) => {
    if(req.query.keyword) {
        resp.send(`Hello, ${req.query.keyword}`);
    } else {
        resp.send(`Hello, ${req.protocol.toUpperCase()}`);
    }
}


