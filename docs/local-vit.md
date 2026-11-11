# Local Vision Transformer

The optional pure TypeScript ViT runs offline in Expo Go and development builds.
It uses RGB patch projection, a CLS token, learned position embeddings, pre-norm
multi-head scaled dot-product self-attention, residuals, GELU MLPs, final layer
normalization and sigmoid classification heads. Architecture reference:
https://arxiv.org/abs/2010.11929

No trained weights are bundled. The default app still uses heuristics. This
addition is an inference implementation, not an accuracy improvement or trained
vehicle inspection model. Mobile performance has not been benchmarked.

Call `configureLocalVit(model)` at app startup with a `LocalVitModel` to enable
it for its supported vehicle parts. Invalid configurations throw; handle startup
errors in the app. `configureLocalVit()` disables it. Existing camera, sell and
buyer-check calls automatically use a configured model after the quality gate.
LSTM and ViT may both run; findings are appended, not ensembled or calibrated.
Scores are model outputs, not established probabilities of real defects.

## Exact training and export contract

- Square image resize uses nearest-neighbor sampling at floor(x*width/size),
  floor(y*height/size), stretching the original aspect ratio. RGB normalization
  is byte/127.5-1. Alpha is ignored. Input comes from the decoded processed JPEG.
- Patches and pixels within patches are row-major; RGB channels are interleaved.
- All linear weights are flattened [output,input], with an output bias.
- CLS precedes the projected patches; positions are [tokens,embeddingSize].
- QKV output is concatenated Q, K, V; contiguous equal-sized attention heads.
- Softmax is over all source tokens, with no mask. Dropout is disabled.
- LayerNorm uses population variance, epsilon 1e-5, learned scale and bias.
- GELU uses the tanh approximation with coefficient 0.044715.
- Final normalized CLS token feeds independent sigmoid heads. Labels specify
  damage type, severity and a held-out-data-selected threshold.
- Limits: image size 8–64, patch size >=2, at most 64 patches, embedding width
  2–64, up to four blocks and MLP width 256. Heads must divide embedding width.
- Predictions are whole-image findings without localization. The maximum
  severity across heuristics and optional learned models becomes overall severity.

Train and evaluate on labeled vehicle damage photos using this preprocessing.
Standard pretrained ViT checkpoints cannot be passed directly to this small
custom schema. Export compatible weights, validate numerical parity against the
training framework, measure held-out detection quality, and profile real phones
before enabling a production model. Synthetic test weights are not detectors.
