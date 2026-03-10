import * as vscode from 'vscode';
import { GoogleAuth } from 'google-auth-library';
import * as os from 'os';

export interface AIProvider {
    summarize(text: string): Promise<string>;
}

export class OllamaProvider implements AIProvider {
    private model: string;
    // Ollama usually runs on this port locally
    private apiUrl: string = 'http://localhost:11434/api/generate'; 

    constructor(model: string) {
        this.model = model;
    }

    async summarize(text: string): Promise<string> {
        // Pull the user's custom prompt right out of their VS Code settings
        const config = vscode.workspace.getConfiguration('knick-knackery');
        const rawPrompt = config.get<string>('customPrompt') || '';
        
        // Swap in the actual terminal text where the placeholder is
        const finalPrompt = rawPrompt.replace('{TEXT}', text);

        try {
            // Luckily, VS Code's Node environment natively supports fetch now
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: finalPrompt,
                    // Grabbing the whole response at once is easier here than handling a stream
                    stream: false 
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            // Give the response a type
            const data = await response.json() as { response: string };
            
            // Since our custom prompt ends with "###" to guide the model, it usually 
            // leaves that part out of its output. We just glue it back on here 
            // so the markdown headers don't break!
            return "### " + data.response.trim();
            
        } catch (error) {
            console.error('Ollama Connection Error:', error);
            throw new Error('Failed to connect to Ollama. Please ensure the Ollama app is running on your machine.');
        }
    }
}

export class AnthropicProvider implements AIProvider {
    private apiKey: string;
    private apiUrl: string = 'https://api.anthropic.com/v1/messages';
    private model: string; 

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    async summarize(text: string): Promise<string> {
        // Pull the user's custom prompt right out of their VS Code settings
        const config = vscode.workspace.getConfiguration('knick-knackery');
        const rawPrompt = config.get<string>('customPrompt') || '';
        
        // Swap in the actual terminal text where the placeholder is
        const finalPrompt = rawPrompt.replace('{TEXT}', text);
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // Anthropic requires these specific headers for auth and versioning
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1024,
                    // Anthropic uses a messages array instead of a single prompt string
                    messages: [{ role: 'user', content: finalPrompt }],
                    stream: false 
                })
            });

            if (!response.ok) {
                throw new Error(`Anthropic API error: ${response.statusText}`);
            }

            // Anthropic's response object is shaped differently than Ollama's
            const data = await response.json() as { content: Array<{text: string}> };
            
            // Just like with Ollama, we glue the markdown header back on
            return "### " + data.content[0].text.trim();
            
        } catch (error) {
            console.error('Anthropic Connection Error:', error);
            throw new Error(`Failed to connect to cloud Anthropic model: ${error}`);
        }
    }
}

export class VertexAnthropicProvider implements AIProvider {
    private projectId: string;
    private region: string;
    private model: string;
    private adcPath: string;

    private auth: GoogleAuth;

    constructor(projectId: string, region: string, model: string, adcPath: string) {
        this.projectId = projectId;
        this.region = region;
        this.model = model;

        // Resolve the tilde to the absolute home directory if necessary
        this.adcPath = adcPath.replace(/^~(?=$|\/|\\)/, os.homedir());

        this.auth = new GoogleAuth({
            keyFilename: this.adcPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
    }

    async summarize(text: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('knick-knackery');
        const rawPrompt = config.get<string>('customPrompt') || '';
        const finalPrompt = rawPrompt.replace('{TEXT}', text);

        try {
            // Dynamically fetch an OAuth 2.0 access token using the ADC file
            const auth = this.auth;
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            if (!accessToken) {
                throw new Error("Failed to retrieve access token from Google Auth Library.");
            }

            // Construct the Vertex AI rawPredict endpoint
            const apiUrl = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${this.model}:rawPredict`;

            // Send the request (Vertex accepts standard Anthropic payload formatting here)
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    anthropic_version: "vertex-2023-10-16",
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: finalPrompt }],
                    stream: false 
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Vertex API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as { content: Array<{text: string}> };
            
            return "### " + data.content[0].text.trim();
            
        } catch (error) {
            console.error('Vertex Anthropic Connection Error:', error);
            throw new Error(`Failed to connect to Vertex AI: ${error}`);
        }
    }
}

export class VertexGoogleProvider implements AIProvider {
    private projectId: string;
    private region: string;
    private model: string;
    private adcPath: string;

    private auth: GoogleAuth;

    constructor(projectId: string, region: string, model: string, adcPath: string) {
        this.projectId = projectId;
        this.region = region;
        this.model = model;

        this.adcPath = adcPath.replace(/^~(?=$|\/|\\)/, os.homedir());

        this.auth = new GoogleAuth({
            keyFilename: this.adcPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
    }

    async summarize(text: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('knick-knackery');
        const rawPrompt = config.get<string>('customPrompt') || '';
        const finalPrompt = rawPrompt.replace('{TEXT}', text);

        try {
            const client = await this.auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            if (!accessToken) {
                throw new Error("Failed to retrieve access token from Google Auth Library.");
            }

            // Gemini uses the generateContent endpoint on Vertex AI
            const apiUrl = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${this.model}:generateContent`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                    generationConfig: { maxOutputTokens: 1024 }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Vertex API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as {
                candidates: Array<{ content: { parts: Array<{ text: string }> } }>
            };

            return "### " + data.candidates[0].content.parts[0].text.trim();

        } catch (error) {
            console.error('Vertex Google Connection Error:', error);
            throw new Error(`Failed to connect to Vertex AI: ${error}`);
        }
    }
}
