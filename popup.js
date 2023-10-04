// Load chat transcript from localStorage when the plugin is initialized
document.addEventListener('DOMContentLoaded', function() {
    const savedChat = localStorage.getItem('chatTranscript');
    if (savedChat) {
        document.getElementById('results').innerHTML = savedChat;
    }
});

document.getElementById('sendToOpenAI').addEventListener('click', function() {
    const model = document.getElementById('model').value;
    const inputData = document.getElementById('inputData').value;

    if (!model || !inputData) {
        console.error('Model or Input Data is missing.');
        return;
    }

    // Display user's query in the chat history with user-message styling
    const formattedInput = inputData.replace(/\n/g, '<br>');
    document.getElementById('results').innerHTML += `<div class="user-message">${formattedInput}</div>`;
    
    // Save chat transcript to localStorage
    localStorage.setItem('chatTranscript', document.getElementById('results').innerHTML);

    // Clear the input text box
    document.getElementById('inputData').value = '';

    const data = {
        model: model,
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            {
                role: "user",
                content: inputData
            }
        ],
        stream: true
    };

    fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YourAPIKey' // Replace with your API key
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const reader = response.body.getReader();
        let accumulatedResponse = "";
        let fullMessage = "";

        function processStream() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    // Display the full message with assistant-message styling
                    if (fullMessage) {
                        const formattedResponse = fullMessage.replace(/\n/g, '<br>');
                        document.getElementById('results').innerHTML += `<div class="assistant-message">${formattedResponse}</div>`;
                    }
                    return;
                }
                
                const textChunk = new TextDecoder().decode(value);
                accumulatedResponse += textChunk;
                const lines = accumulatedResponse.split("\n");

                for (let i = 0; i < lines.length - 1; i++) {
                    let line = lines[i];
                    if (line.startsWith('data: ')) {
                        line = line.substring(6); // Remove the "data: " prefix
                    }
                    if (line === "[DONE]" || line.trim() === "") {
                        continue; // Skip parsing for these chunks
                    }
                    try {
                        const chunkData = JSON.parse(line);
                        if (chunkData.choices && chunkData.choices[0] && chunkData.choices[0].delta && chunkData.choices[0].delta.content) {
                            fullMessage += chunkData.choices[0].delta.content;
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e, 'Raw chunk:', line);
                    }
                }

                accumulatedResponse = lines[lines.length - 1];
                return processStream(); // Continue processing
            });
        }

        return processStream();
    })
    .catch(error => {
        console.error('Error making API call:', error);
    }); 
});

// Add a button to start a new chat and clear the chat history
document.getElementById('startNewChat').addEventListener('click', function() {
    document.getElementById('results').innerHTML = '';
    // Clear chat transcript from localStorage
    localStorage.removeItem('chatTranscript');
});
