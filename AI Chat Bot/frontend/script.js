const chatBody = document.querySelector(".chatbot-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadPreview = document.querySelector(".upload-image-preview");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
}
const initialInputHeight = messageInput.scrollHeight;

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {  /* ...classes: define all classes to the div */
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Last bot message
let lastBotMessageElement = null;

// Function to send the message to backend and generate the bot response
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort(); // Abort fetch after timeout
        }, 120000 ); // 120,000 milliseconds = 2 minute timeout

        // user message and user file
        const formData = new FormData();
        formData.append("message", userData.message);
        if (userData.file) {
            formData.append("file", userData.file); 
            removePreviewImageUpload();
            userData.file = {};
        } 

        // Fetch bot response from API
        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });  
        clearTimeout(timeout); 

        // If server is reachable but responds with error status
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        } 

        // If server is not reachable
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error("Failed to parse server response.");
        }

        // Check if formattedReply exists
        if (!data || !data.formattedReply) {
            messageElement.innerHTML = "⚠️ Server sent an empty response.";
        } else {
            // Display bot reply
            const apiResponseText = data.formattedReply.replace(/\n\n/g, "<br>");
            messageElement.innerHTML = apiResponseText;
            // Set bot message to scroll automatically
            lastBotMessageElement = messageElement;
        }
    } catch (error) {
        function showError(message, emoji = "❗") {
            messageElement.innerHTML = `${emoji} ${message}`;
            messageElement.classList.add("error-message");
            messageElement.style.backgroundColor = '#fad6dc';
            scrollToBottom(); 
        }

        if (error.name === 'AbortError') {
            console.error("Request timed out.");
            showError("Request timed out. Please try again.", "⏳");
        } else if (error.message.includes("Failed to fetch")) {
            // When the server is unreachable (e.g., network error)
            console.error("Cannot connect to the server.");
            showError("Unable to connect to the server.", "🚫");
        } else {
            // Handle error in the API request
            console.error("Error talking to backend:", error);
            showError("Error connecting to chatbot.");
            return "Error connecting to chatbot.";
        }        
    } finally {
        // Remove thinking indicator
        incomingMessageDiv.classList.remove("thinking");
        // Scroll to the last bot message element
        if (lastBotMessageElement) {
            scrollToTopOfBotMessage(lastBotMessageElement); 
        }
    }
} 

// Sanitize input to avoid risky HTML (basic protection) (HTML injection prevention)
const sanitize = (str) => {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

// Scroll chat to bottom automatically when new messages appear
const scrollToBottom = () => {
    chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: "smooth"
    });
}

// Scroll chat to top of latest bot message
const scrollToTopOfBotMessage = (botMessage) => {
    botMessage.scrollIntoView({
        block: "start",
        behavior: "smooth"
    });
}

// Handle outgoing messages
const handleOutGoingMessage = (e) => {
    e.preventDefault();  /* preventing form from submitting */
    userData.message = messageInput.value.trim();   
    
    // Create and display user message
    const safeMessage = sanitize(userData.message);
    let imgHTML = "";

    // Handle uploaded image
    if (userData.file instanceof File) {
        const imgURL = URL.createObjectURL(userData.file);

        // Create image element to revoke object URL after load
        const img = document.createElement("img");
        img.src = imgURL;
        img.alt = "uploaded image";
        img.className = "attachment";

        // Revoke the object URL once the image is loaded
        img.onload = () => URL.revokeObjectURL(imgURL);

        // Optionally, handle image load error if not an image
        img.onerror = () => {
            console.error("Failed to load image.");
            URL.revokeObjectURL(imgURL); // Clean up in case of error
        };

        // Wrap image in a container for layout purposes
        const imgWrapper = document.createElement("div");
        imgWrapper.appendChild(img);
        imgHTML = imgWrapper.innerHTML;
    }

    // Combine message and optional image 
    const formattedMessage = safeMessage.replace(/\n/g, "<br>").replace(/ {2}/g, '&nbsp;&nbsp;');
    const messageContent = `<div class="message-text">${formattedMessage}</div>${imgHTML}`;
      
    // Create message element and append to chat
    const outGoingMessageDiv = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(outGoingMessageDiv);

    // Clear the input after sending and scroll to bottom
    messageInput.value = ""; 
    scrollToBottom();
    fileUploadPreview.classList.remove("file-uploaded");
    messageInput.dispatchEvent(new Event("input")); // Reset input field to normal height
    
    // Simulate bot responses with thinking indicator after a delay
    setTimeout(() => {        
        const messageContent = `<div class="message bot-message thinking">
                                    <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" 
                                        viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve">
                                        <path d="M49.6,25.8c7.2,0,13,5.8,13,13v3.3c-4.3-0.5-8.7-0.7-13-0.7c-4.3,0-8.7,0.2-13,0.7v-3.3
                                            C36.6,31.7,42.4,25.8,49.6,25.8z"/>
                                        <path d="M73.2,63.8l1.3-11.4c2.9,0.5,5.1,2.9,5.1,5.6C79.6,61.2,76.7,63.8,73.2,63.8z"/>
                                        <path d="M25.9,63.8c-3.5,0-6.4-2.6-6.4-5.8c0-2.8,2.2-5.1,5.1-5.6L25.9,63.8z"/>
                                        <path d="M68.7,44.9c-6.6-0.7-12.9-1-19-1c-6.1,0-12.5,0.3-19,1h0c-2.2,0.2-3.8,2.2-3.5,4.3l2,19.4
                                            c0.2,1.8,1.6,3.3,3.5,3.5c5.6,0.7,11.3,1,17.1,1s11.5-0.3,17.1-1c1.8-0.2,3.3-1.7,3.5-3.5l2-19.4v0C72.4,47,70.9,45.1,68.7,44.9z
                                            M38.6,62.5c-1.6,0-2.8-1.6-2.8-3.7s1.3-3.7,2.8-3.7s2.8,1.6,2.8,3.7S40.2,62.5,38.6,62.5z M55.3,66.6c0,0.2-0.1,0.4-0.2,0.5
                                            c-0.1,0.1-0.3,0.2-0.5,0.2h-9.9c-0.2,0-0.4-0.1-0.5-0.2c-0.1-0.1-0.2-0.3-0.2-0.5v-1.8c0-0.4,0.3-0.7,0.7-0.7h0.2
                                            c0.4,0,0.7,0.3,0.7,0.7v0.9h8.1v-0.9c0-0.4,0.3-0.7,0.7-0.7h0.2c0.4,0,0.7,0.3,0.7,0.7V66.6z M60.6,62.5c-1.6,0-2.8-1.6-2.8-3.7
                                            s1.3-3.7,2.8-3.7s2.8,1.6,2.8,3.7S62.2,62.5,60.6,62.5z"/>
                                    </svg>
                                    <div class="message-text">
                                        <div class="thinking-indicator">
                                            <div class="dot"></div>
                                            <div class="dot"></div>
                                            <div class="dot"></div>
                                        </div>
                                    </div>
                                </div>`;
        const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        generateBotResponse(incomingMessageDiv);
        scrollToBottom();
    }, 600);
}

// Handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) { 
        e.preventDefault(); // Prevent newline
        const userMessage = e.target.value.trim();
        if (userMessage) {
            handleOutGoingMessage(e);
        }
    }
});

// Adjust input feild height dynamatically
messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
}); 

// Handle file input change and preview the selected file
const handleFileInputChange = () => { 
    const file = fileInput.files[0];
    if(!file) return;
    
    // Check if the file is an image
    const fileReader = new FileReader();
    
    fileReader.onload = function(event) {
        const imgElement = fileUploadPreview.querySelector("img");
        fileUploadPreview.classList.add("file-uploaded");

        // Only update the image source if the file is valid
        if (imgElement) {
            imgElement.src = event.target.result;
            imgElement.alt = file.name; // Set alt text to file name or type
        }
    }

    // Read the file as a data URL (this triggers the load event above)
    fileReader.readAsDataURL(file);

    // Store raw File object directly
    userData.file = file;
    fileInput.value = "";
}
fileInput.addEventListener("change", handleFileInputChange);

// Cancel file upload
const removePreviewImageUpload = () => {
    const imgElement = fileUploadPreview.querySelector("img");

    if (imgElement) {
        imgElement.src = ""; // Clear image source
        imgElement.alt = ""; // Clear alt text
    }

    fileUploadPreview.classList.remove("file-uploaded");
    userData.file = {}; // Clear the stored file
}
// Close button for cancelling file upload
document.querySelector("#image-close-icon").addEventListener("click", () => {
    removePreviewImageUpload();
}); 

// Initialize emoji picker and handle emoji selection
const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = messageInput;
        messageInput.setRangeText(emoji.native, start, end, "end");
        messageInput.focus();
    },
    onClickOutside: (e) => {
        if (e.target.id === "emoji-picker") {
            document.body.classList.toggle("show-emoji-picker");
        } else {
            document.body.classList.remove("show-emoji-picker");
        }
    }
});
document.querySelector(".chat-form").appendChild(picker);

// Prevent submit messages only contain new lines
messageInput.addEventListener("input", () => {
    const trimmed = messageInput.value.trim();  
    sendMessageButton.style.display = trimmed ? "block" : "none";
});

// Handle 'send(⬆)' button for sending messages
sendMessageButton.addEventListener("click", handleOutGoingMessage); 

// Open File input when file btn clicked
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

// Chatbot Toggler
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

// Chatbot Close
closeChatbot.addEventListener("click", ()=> document.body.classList.remove("show-chatbot"));