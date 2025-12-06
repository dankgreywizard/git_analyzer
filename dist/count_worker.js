"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_worker_threads_1 = require("node:worker_threads");
console.log(`Worker thread ${node_worker_threads_1.workerData.request} started`);
for (let iter = 0; iter < node_worker_threads_1.workerData.iterations; iter++) {
}
//# sourceMappingURL=count_worker.js.map