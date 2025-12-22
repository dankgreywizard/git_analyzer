import path from "path";
import {fileURLToPath}  from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default {
    mode: "development",
    entry: "./src/client/index.jsx",
    output: {
        path: path.resolve(__dirname, "dist/client"),
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            ["@babel/preset-env", { targets: "defaults" }],
                            ["@babel/preset-react", { runtime: "automatic" }],
                            "@babel/preset-typescript"
                        ]
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".jsx", ".js"],
    },
    devServer: {
        // Allow overriding ports via environment; defaults retained for CI/local
        port: Number(process.env.WDS_PORT || 5100),
        static: {
            directory: path.resolve(__dirname, "static"),
            publicPath: "/"
        },
        proxy: [
            {
                context: ["/read"],
                target: `http://localhost:${process.env.PORT || 5000}`,
                changeOrigin: true
            },
            {
                context: ["/api"],
                target: `http://localhost:${process.env.PORT || 5000}`,
                changeOrigin: true
            }
        ],
        client: {
            webSocketURL: `http://localhost:${process.env.WDS_PORT || 5100}/ws`
        }
    }
}