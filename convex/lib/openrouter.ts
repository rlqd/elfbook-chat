
// Must support structured outputs, used to generate chat title and tags
const utilityModel = process.env.ELF_UTILITY_MODEL ?? 'google/gemini-2.0-flash-lite-001';
const maxMsgLengthForMetadata = parseInt(process.env.ELF_METADATA_GEN_MAX_MSG_LENGTH!) || 1000;

interface ContextMessage {
    role: string,
    content: string,
}
interface ChatMetadata {
    title: string,
    tags: string[],
}

export async function* streamLLMResponse(
    keySecret: string,
    model: string,
    messages: ContextMessage[],
): AsyncGenerator<string, void, undefined> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${keySecret}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
        }),
    });
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Response body is not readable');
    }
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Append new chunk to buffer
            buffer += decoder.decode(value, { stream: true });
            // Process complete lines from buffer
            while (true) {
                const lineEnd = buffer.indexOf('\n');
                if (lineEnd === -1) break;
                const line = buffer.slice(0, lineEnd).trim();
                buffer = buffer.slice(lineEnd + 1);
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0].delta.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        console.warn('Failed to parse data line in LLM stream: ', data, '\nError: ', e);
                    }
                }
            }
        }
    } finally {
        reader.cancel();
    }
}

export async function generateChatMetadata(
    keySecret: string,
    userMessage: ContextMessage,
    modelMessage: ContextMessage,
): Promise<ChatMetadata|undefined> {
    const messages = [
        {...userMessage},
        {...modelMessage},
        {
            role: 'user',
            content: `Please generate chat info based on our conversation above`,
        },
    ];
    for (const message of messages) {
        if (message.content.length > maxMsgLengthForMetadata) {
            message.content = message.content.substring(0, maxMsgLengthForMetadata) + '...';
        }
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${keySecret}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: utilityModel,
            provider: {require_parameters: true},
            messages,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'chat_info',
                    strict: true,
                    schema: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string',
                                description: 'Very short chat title',
                            },
                            tags: {
                                type: 'array',
                                description: 'Between 1 and 3 relevant single word tags',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                        required: ['title', 'tags'],
                        additionalProperties: false,
                    },
                },
            },
        }),
    });
    const data = await response.json();
    let chatInfo;
    try {
        chatInfo = JSON.parse(data.choices[0].message.content);
        if (typeof chatInfo !== 'object') {
            throw new Error('Generated chat info is not an object');
        }
    } catch (e) {
        console.warn(
            'Got bad json when generating chat info. Content: ',
            data.choices[0].message.content, '\nError: ', e,
        );
    }
    return chatInfo;
}
