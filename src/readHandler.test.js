import {test} from "node:test";
import {readHandler} from "./readHandler";

test("readHandler tests", (testCtx) => {
    const req = {
        pipe: testCtx.mock.fn()
    };
    const resp = {
        cookie: testCtx.mock.fn()
    }
    readHandler(req, resp);
    if(req.pipe.mock.callCount() !== 1 ||
        req.pipe.mock.calls[0].arguments[0] !== resp) {
        throw new Error("Request not piped");
    }
    if(resp.cookie.mock.callCount() === 1) {
        const [name, val] = resp.cookie.mock.calls[0].arguments;
        if (name !== "sessionID" || val !== "mysecretcode") {
            throw new Error("Cookie not set correctly");
        }
    } else {
        throw new Error("cookie method not called once");
    }

});