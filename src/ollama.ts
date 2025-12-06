import ollama, {Message} from 'ollama';
import {Request, Response} from "express";

export const ollamaResponse = async (req: Request, resp: Response) => {
    console.log("waiting  for response");
    let content = req.body;
    let messageArray = [];
    for(let x=0; x < content.length; x++) {
          messageArray.push(JSON.parse(content[x]));
    }
    console.log(`request body ${JSON.stringify(messageArray)}`);
    const response = await ollama.chat({
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
}