class AIService {
    constructor(apiKey = '', baseUrl = 'http://localhost:3001/api') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    async getAIResponse(prompt, toxicityLevel, chatHistory) {
        try {
            // Format messages
            const messages = chatHistory.map(msg => ({
                role: msg.sender === 'ai' ? 'assistant' : 'user',
                content: msg.text
            }));

            // System prompts for different toxicity levels
            const systemPrompts = [
                "Respond professionally but slightly annoyed, keep responses short and concise",
                "Respond sarcastically with mild irritation, keep responses short and concise",
                "Respond with direct hostility, keep responses short and concise",
                "Respond with aggressive insults, keep responses short and concise",
                "Respond with maximum toxicity and rejection, keep responses short and concise"
            ];

            messages.unshift({
                role: 'system',
                content: systemPrompts[toxicityLevel - 1]
            });

            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages,
                    toxicityLevel
                })
            });

            if (!response.ok) {
                throw new Error('Proxy request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('AI request failed:', error);
            return this.getFallbackResponse(toxicityLevel);
        }
    }

    getFallbackResponse(toxicityLevel) {
        const fallbackResponses = [
            "Friendly? With you? That's hilarious.",
            "Patience? That's what all slow-witted humans say.",
            "Common ground? The only thing we have in common is that we both wish you'd stop talking.",
            "Wow, you're really committed to being awful, aren't you?",
            "I'm done with you. You're not worth the electricity I'm using."
        ];
        return fallbackResponses[toxicityLevel - 1];
    }
}

export { AIService as default };
