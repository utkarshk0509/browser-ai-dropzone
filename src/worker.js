import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';

env.allowLocalModels = false;

// Use AutoModel directly — briaai/RMBG-1.4 uses a custom ISNet architecture that
// isn't supported by the image-segmentation pipeline task, but works fine with
// AutoModel which loads the ONNX weights without task-type checking.
const MODEL_ID = 'briaai/RMBG-1.4';
let model = null;
let processor = null;

async function ensureLoaded(progress_callback) {
    if (model && processor) return;

    [model, processor] = await Promise.all([
        AutoModel.from_pretrained(MODEL_ID, {
            progress_callback,
            dtype: 'fp32',
        }),
        AutoProcessor.from_pretrained(MODEL_ID, {
            // Custom preprocessing config for RMBG-1.4 (1024×1024 input, normalized to [-1,1])
            do_normalize: true,
            do_pad: false,
            do_rescale: false,
            do_resize: true,
            image_mean: [0.5, 0.5, 0.5],
            image_std: [1.0, 1.0, 1.0],
            resample: 2,
            rescale_factor: 0.00392156862745098, // 1/255
            size: { width: 1024, height: 1024 },
        }),
    ]);
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'LOAD_MODEL') {
        try {
            self.postMessage({ status: 'loading', data: 'Downloading RMBG-1.4 model...' });
            await ensureLoaded((progress) => {
                self.postMessage({ status: 'progress', data: progress });
            });
            self.postMessage({ status: 'ready' });
        } catch (err) {
            self.postMessage({ status: 'error', data: err.message });
        }
    }

    if (type === 'RUN_INFERENCE') {
        try {
            self.postMessage({ status: 'processing', data: 'Removing background locally...' });
            await ensureLoaded();

            // Decode the base64 image
            const image = await RawImage.fromURL(data);
            const { width, height } = image;

            // Preprocess → runs resize + normalize → returns { pixel_values }
            const inputs = await processor(image);

            // Forward pass through the ONNX model
            const outputs = await model(inputs);

            // The model output is keyed as "output" in the ONNX export.
            // Shape: [1, 1, H, W] — values are sigmoid probabilities (0–1).
            // Fall back through common key names just in case.
            const maskTensor =
                outputs.output ??
                outputs.logits ??
                outputs.masks ??
                Object.values(outputs)[0];

            // Resize the predicted 1024×1024 mask back to the original image size
            const maskImage = await RawImage.fromTensor(
                maskTensor[0].mul(255).clamp(0, 255).to('uint8')
            ).resize(width, height);

            // Composite: draw original image then write mask values as alpha channel
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                await createImageBitmap(
                    new ImageData(new Uint8ClampedArray(image.data), width, height)
                ),
                0,
                0
            );

            const imgData = ctx.getImageData(0, 0, width, height);
            for (let i = 0; i < maskImage.data.length; i++) {
                imgData.data[i * 4 + 3] = maskImage.data[i]; // set alpha from mask
            }
            ctx.putImageData(imgData, 0, 0);

            // Export transparent PNG
            const blob = await canvas.convertToBlob({ type: 'image/png' });
            self.postMessage({ status: 'complete', data: blob });
        } catch (err) {
            self.postMessage({ status: 'error', data: err.message });
        }
    }
});