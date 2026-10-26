import { pipeline, env } from '@huggingface/transformers';

// Skip local model checks, fetch directly from HuggingFace Hub into browser Cache API
env.allowLocalModels = false;

class ModelSingleton {
    static task = 'image-segmentation';
    static model = 'briaai/RMBG-1.4';
    static instance = null;

    static async getInstance(progress_callback) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, {
                progress_callback,
                device: 'webgpu' // Automatically falls back to WASM if WebGPU is unavailable
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'LOAD_MODEL') {
        try {
            self.postMessage({ status: 'loading', data: 'Initializing WebGPU / WASM pipeline...' });
            await ModelSingleton.getInstance((progress) => {
                self.postMessage({ status: 'progress', data: progress });
            });
            self.postMessage({ status: 'ready' });
        } catch (err) {
            self.postMessage({ status: 'error', data: err.message });
        }
    }

    if (type === 'RUN_INFERENCE') {
        try {
            self.postMessage({ status: 'processing', data: 'Removing image background locally...' });
            const segmenter = await ModelSingleton.getInstance();

            // Process image data in-browser
            const output = await segmenter(data);

            // Convert tensor output back to transferable blob/image data
            const blob = output.blob;
            self.postMessage({ status: 'complete', data: blob });
        } catch (err) {
            self.postMessage({ status: 'error', data: err.message });
        }
    }
});