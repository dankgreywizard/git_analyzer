
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("btn").addEventListener("click", sendReq);
});
const requestUrl = "/read";
sendReq = async () => {
    const userInput = document.getElementById("input").value || "";
    // ollamaResponse expects req.body to be an array of JSON strings,
    // each string parseable into a message object for Ollama.
    const messages = [JSON.stringify({ role: "user", content: userInput })];

    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(messages)
    });

    document.getElementById("msg").textContent = response.statusText;
    document.getElementById("body").innerHTML = await response.text();
}