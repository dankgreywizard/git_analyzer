
let currentAbortController = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("btn").addEventListener("click", sendReq);
    const cancelBtn = document.getElementById("cancel");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            if (currentAbortController) {
                currentAbortController.abort();
            }
        });
    }
});
const requestUrl = "/read";
sendReq = async () => {
    const btn = document.getElementById("btn");
    const msgEl = document.getElementById("msg");
    const bodyEl = document.getElementById("body");
    const cancelBtn = document.getElementById("cancel");
    const userInput = document.getElementById("input").value || "";
    // Disable button while request is in-flight
    btn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = false;
    msgEl.textContent = "Sending...";
    bodyEl.textContent = "";
    const controller = new AbortController();
    currentAbortController = controller;
    try {
        // ollamaResponse expects req.body to be an array of JSON strings,
        // each string parseable into a message object for Ollama.
        const messages = [JSON.stringify({ role: "user", content: userInput })];

        const response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messages),
            signal: controller.signal
        });

        // If the server streams, consume incrementally
        if (!response.ok) {
            msgEl.textContent = response.statusText || "Error";
            bodyEl.textContent = await response.text();
            return;
        }

        msgEl.textContent = "Streaming...";
        const reader = response.body && response.body.getReader ? response.body.getReader() : null;
        if (reader) {
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                bodyEl.textContent += decoder.decode(value, { stream: true });
            }
            // Flush the decoder
            bodyEl.textContent += decoder.decode();
            msgEl.textContent = "Done";
        } else {
            // Fallback: not a stream-capable response
            bodyEl.textContent = await response.text();
            msgEl.textContent = response.statusText || "OK";
        }
    } catch (e) {
        if (e && (e.name === 'AbortError' || e.code === 'ABORT_ERR')) {
            msgEl.textContent = "Canceled";
        } else {
            msgEl.textContent = "Request failed";
            bodyEl.textContent = (e && e.message) ? e.message : String(e);
        }
    } finally {
        // Re-enable the button
        btn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = true;
        currentAbortController = null;
    }
}