```
# Orbit SDK 🪐

![NPM Version](https://img.shields.io/npm/v/@junelabs/orbit-sdk?style=flat-square&color=3b82f6&label=release)
![License](https://img.shields.io/npm/l/@junelabs/orbit-sdk?style=flat-square&color=slate)
![Downloads](https://img.shields.io/npm/dt/@junelabs/orbit-sdk?style=flat-square&color=emerald)

> **The Infrastructure for On-Device Intelligence.**

Orbit SDK is a unified runtime for executing Micro-LLMs directly in the browser. It abstracts away the complexity of WebGPU acceleration, model quantization, and local vector storage, providing developers with a simple, "Firebase-like" API for adding intelligence to web applications.

---

## ✨ Why Orbit?

Running AI locally offers three distinct advantages over cloud APIs:

| Feature | Orbit SDK (Local) | Cloud APIs (OpenAI/Anthropic) |
| :--- | :--- | :--- |
| **Latency** | **Zero** (Instant inference) | ~500ms - 2s+ |
| **Privacy** | **100% Private** (Data never leaves device) | Data sent to 3rd party servers |
| **Cost** | **$0** (Uses client hardware) | Per-token billing ($$$) |
| **Offline** | **Works Offline** | Requires Internet |

## 🚀 Installation

Orbit requires the core SDK and the transformers runtime.

```bash
npm install @junelabs/orbit-sdk @xenova/transformers

```

* * * * *

⚡ Quick Start
-------------

### 1\. Sentiment Analysis (Classification)

Ideal for real-time form validation, moderation, or UI feedback.

JavaScript

```
import { OrbitSDK } from '@junelabs/orbit-sdk';

// 1. Initialize
// (Downloads ~60MB quantized model on first run, caches forever)
await OrbitSDK.getInstance().loadModel('sentiment-analysis');

// 2. Run Inference
const result = await OrbitSDK.getInstance().run('sentiment-analysis', 'Orbit makes AI incredibly simple.');

console.log(result);
// Output: [{ label: 'POSITIVE', score: 0.998 }]

```

### 2\. RAG Chat (Persistent Memory)

Create a "Stateful" AI that remembers facts across sessions. Orbit manages a local Vector Database (embedded inside IndexedDB) for you.

JavaScript

```
import { OrbitSDK, OrbitMemory } from '@junelabs/orbit-sdk';

// 1. Teach (Saves semantic vectors to local storage)
await OrbitMemory.getInstance().add("My wifi password is 'Banana123'");
await OrbitMemory.getInstance().add("The office code is 9942");

// 2. Ask (Retrieves context + Generates answer via T5 Model)
const answer = await OrbitSDK.getInstance().ask("What is the wifi password?");

console.log(answer);
// Output: "The wifi password is 'Banana123'"

```

* * * * *

🛠️ API Reference
-----------------

### `OrbitSDK` (Singleton)

The primary controller for model inference and pipeline management.

#### `loadModel(task: ModelTask, onProgress?: (p: number) => void)`

Pre-loads a model into memory.

-   **task**: `'sentiment-analysis'` | `'generation'` | `'feature-extraction'`

-   **onProgress**: Callback receiving download percentage (0-100).

#### `run(task: ModelTask, text: string)`

Executes the model on the given text. Returns a raw inference result (JSON).

#### `ask(question: string)`

Performs a RAG (Retrieval Augmented Generation) workflow:

1.  Searches `OrbitMemory` for relevant context.

2.  Constructs a prompt with that context.

3.  Generates a natural language answer.

* * * * *

### `OrbitMemory` (Singleton)

The storage engine handling vector embeddings and semantic search.

#### `add(text: string)`

Embeds the text using `all-MiniLM-L6-v2` and saves the vector to persistent local storage.

#### `search(query: string, topK: number)`

Returns the top `K` text snippets that semantically match the query, sorted by similarity score.

#### `clear()`

Wipes all local memory. Useful for user sign-out or debugging.

* * * * *

📦 Supported Models
-------------------

Orbit currently ships with highly optimized, quantized models tested for **Intel Macs**, **M-Series Chips**, and **Windows WebGPU**.

| **Task** | **Model ID** | **Size (Quantized)** | **Use Case** |
| --- | --- | --- | --- |
| `sentiment-analysis` | `distilbert-base-uncased` | **~60 MB** | Moderation, Feedback Analysis |
| `generation` | `LaMini-Flan-T5-77M` | **~90 MB** | Q&A, Chat, Simple Logic |
| `feature-extraction` | `all-MiniLM-L6-v2` | **~23 MB** | Vector Search, Similarity |

* * * * *

🗺️ Roadmap
-----------

-   [x] **v0.1**: WebGPU Runtime & Local Vector Memory

-   [ ] **v0.2**: Sync Adapter (Sync memory to Orbit Cloud)

-   [ ] **v0.3**: Custom Model Loading (Load your own .gguf)

-   [ ] **v1.0**: React Native / Expo Support
