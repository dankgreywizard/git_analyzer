import {workerData, parentPort}  from "node:worker_threads";
console.log(`Worker thread ${workerData.request} started`);
for( let iter = 0; iter < workerData.iterations; iter ++) {

}