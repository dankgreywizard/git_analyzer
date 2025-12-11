import path from "path";
import {fileURLToPath}  from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default {
    mode: "development",
    entry: "./static/client.js",
    output: {
        path: path.resolve(__dirname, "dist/client"),
        filename: "bundle.js"
    },
    devServer: {
        port: 5100,
        static: {
            directory: path.resolve(__dirname, "static"),
            publicPath: "/"
        },
        proxy: [
            {
                context: ["/read"],
                target: "http://localhost:5000",
                changeOrigin: true
            }
        ],
        client: {
            webSocketURL: "http://localhost:5000/ws"
        }
    }
}