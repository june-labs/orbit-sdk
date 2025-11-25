import { env, pipeline, Pipeline } from '@xenova/transformers';

// Skip local model checks
env.allowLocalModels = false;

export type ModelTask = 'sentiment-analysis' | 'generation' | 'feature-extraction';

export const MODEL_MAP: Record<ModelTask, string> = {
    'sentiment-analysis': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    'generation': 'Xenova/LaMini-Flan-T5-77M',
    'feature-extraction': 'Xenova/all-MiniLM-L6-v2'
};

export class OrbitSDK {
    private static instance: OrbitSDK;
    private pipelines: Map<ModelTask, Pipeline> = new Map();

    private constructor() { }

    public static getInstance(): OrbitSDK {
        if (!OrbitSDK.instance) {
            OrbitSDK.instance = new OrbitSDK();
        }
        return OrbitSDK.instance;
    }

    public async loadModel(task: ModelTask, onProgress?: (progress: any) => void) {
        if (this.pipelines.has(task)) {
            return this.pipelines.get(task);
        }

        const modelName = MODEL_MAP[task];
        let pipelineTask = task as string;

        // Map 'generation' to the correct pipeline task name
        if (task === 'generation') {
            pipelineTask = 'text2text-generation';
        }

        // @ts-ignore - pipeline types might be slightly off for the progress callback or model name in some versions, but this is standard usage
        const pipe = await pipeline(pipelineTask, modelName, {
            progress_callback: onProgress
        });

        this.pipelines.set(task, pipe as any);
        return pipe;
    }

    public async run(task: ModelTask, text: string) {
        const pipe = this.pipelines.get(task);
        if (!pipe) {
            throw new Error(`Pipeline for task "${task}" not initialized. Call loadModel("${task}") first.`);
        }

        let options = {};
        if (task === 'generation') {
            options = {
                max_new_tokens: 128,
                temperature: 0.1,
                repetition_penalty: 1.2
            };
        } else if (task === 'feature-extraction') {
            options = { pooling: 'mean', normalize: true };
        }

        const result = await pipe(text, options);
        return result;
    }

    public async ask(question: string) {
        // Step 1: Retrieve
        const memory = OrbitMemory.getInstance();
        const facts = await memory.search(question, 3);

        // Step 2: Contextualize
        const context = facts.map(f => "- " + f.text).join('\n');

        // Step 3: Prompt
        const prompt = `Question: ${question}\nContext:\n${context}\nAnswer:`;

        // Step 4: Generate
        // Ensure generation model is loaded
        await this.loadModel('generation');

        // Run generation pipeline
        const result = await this.run('generation', prompt);

        // Result format for text2text-generation is [{ generated_text: string }]
        if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
            return result[0].generated_text;
        }
        return "I couldn't generate an answer.";
    }
}

function cosineSimilarity(a: number[], b: number[]) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class OrbitMemory {
    private static instance: OrbitMemory;
    private memoryBank: { id: string, text: string, embedding: number[] }[] = [];
    private readonly STORAGE_KEY = 'orbit_memory_v1';

    private constructor() {
        this.loadFromDisk();
    }

    public static getInstance(): OrbitMemory {
        if (!OrbitMemory.instance) {
            OrbitMemory.instance = new OrbitMemory();
        }
        return OrbitMemory.instance;
    }

    private saveToDisk() {
        try {
            const data = JSON.stringify(this.memoryBank);
            localStorage.setItem(this.STORAGE_KEY, data);
        } catch (error) {
            console.warn('Failed to save memory to disk (quota exceeded?):', error);
        }
    }

    private loadFromDisk() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                this.memoryBank = JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load memory from disk:', error);
        }
    }

    async add(text: string) {
        const sdk = OrbitSDK.getInstance();
        // Ensure model is loaded
        await sdk.loadModel('feature-extraction');

        const output = await sdk.run('feature-extraction', text);
        // output is a Tensor. output.data is the Float32Array.
        const embedding = Array.from(output.data as Float32Array);

        const id = Date.now().toString();
        this.memoryBank.push({ id, text, embedding });

        this.saveToDisk();

        return id;
    }

    async search(query: string, topK: number = 3) {
        const sdk = OrbitSDK.getInstance();
        // Ensure model is loaded
        await sdk.loadModel('feature-extraction');

        const output = await sdk.run('feature-extraction', query);
        const queryEmbedding = Array.from(output.data as Float32Array);

        const scores = this.memoryBank.map(v => ({
            id: v.id,
            text: v.text,
            score: cosineSimilarity(queryEmbedding, v.embedding)
        }));

        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, topK);
    }
}
