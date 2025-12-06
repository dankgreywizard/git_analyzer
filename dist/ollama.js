"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ollamaResponse = void 0;
const ollama_1 = __importDefault(require("ollama"));
const ollamaResponse = async (req, resp) => {
    console.log("waiting  for response");
    let content = req.body;
    let messageArray = [];
    for (let x = 0; x < content.length; x++) {
        messageArray.push(JSON.parse(content[x]));
    }
    console.log(`request body ${JSON.stringify(messageArray)}`);
    const response = await ollama_1.default.chat({
        model: 'codellama:latest',
        messages: messageArray,
        think: false,
    });
    console.log("returning response");
    //for await (const part of response) {
    //  console.log("writing part of the response");
    // resp.write(part.message.content)
    // }
    resp.write(response.message.content);
    console.log(response.message.content);
    resp.end();
};
exports.ollamaResponse = ollamaResponse;
//# sourceMappingURL=ollama.js.map