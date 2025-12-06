/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./static/client.js":
/*!**************************!*\
  !*** ./static/client.js ***!
  \**************************/
/***/ (() => {

eval("\ndocument.addEventListener('DOMContentLoaded', function() {\n    document.getElementById(\"btn\").addEventListener(\"click\", sendReq);\n});\nsendReq = async () => {\n    let payload = [];\n    for (let i = 0; i < 5; i++) {\n        payload.push({ id: i, message: `Payload Message: ${i}\\n`});\n    }\n    const response = await fetch(\"/read\", {\n        method: \"POST\", body: JSON.stringify(payload),\n        headers: {\n            \"Content-Type\": \"application/json\"\n        }\n    })\n    document.getElementById(\"msg\").textContent = response.statusText;\n    document.getElementById(\"body\").textContent = `Resp ${await response.text()}`;\n}\n\n//# sourceURL=webpack://webapp/./static/client.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./static/client.js"]();
/******/ 	
/******/ })()
;