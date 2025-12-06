"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePromise = exports.endPromise = void 0;
const node_http_1 = require("node:http");
const node_util_1 = require("node:util");
exports.endPromise = (0, node_util_1.promisify)(node_http_1.ServerResponse.prototype.end);
exports.writePromise = (0, node_util_1.promisify)(node_http_1.ServerResponse.prototype.write);
//# sourceMappingURL=promises.js.map