import { pipeline, env } from "@xenova/transformers";

// Disable local models to force downloading from HF hub
env.allowLocalModels = false;
env.useBrowserCache = false;

class PipelineSingleton {
  static task = "feature-extraction" as const;
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: any = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await PipelineSingleton.getInstance();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
