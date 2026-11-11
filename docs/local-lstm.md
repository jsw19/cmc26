# Local LSTM inference

The SDK supports optional single-layer LSTM inference in plain TypeScript. It
works in Expo Go and native builds without a C++ bridge or network access.
No trained model is bundled or enabled. Existing heuristic scans remain the
default; this change alone does not improve detection accuracy.

At startup, call `configureLocalLstm(trainedModel)` from `src/sdk`. All existing
`analyzeVehicleImageLocally` calls then run the model for its declared vehicle
parts after the image quality gate. Call `configureLocalLstm()` to disable it.
Invalid model data throws during configuration; surface that error at startup.

## Training/export contract

- Model metadata and tensors follow `LocalLstmModel` in `src/sdk/lstm.ts`.
- Input is 36 steps, a 6 by 6 spatial grid in row-major order, not video frames.
- Each step contains seven features: rust fraction, dark fraction, coolant
  fraction, mean raw Rec.601 luma, mean saturation, mean adjusted HSV value,
  and edge fraction. Glare is excluded; empty cells contain zeros.
- Feature extraction must match `analyzeLocal.ts`, including part-specific
  thresholds, brightness boost, sampling, and JPEG preprocessing.
- Initial hidden/cell states are zero for each photo. Gate order is input,
  forget, candidate, output. Sigmoid gates and tanh candidate/cell are used.
- Input/recurrent matrices are flattened row-major, with one combined bias.
  Sum input and recurrent biases when exporting frameworks with two biases.
- Output is a linear layer on the last hidden state followed by independent
  sigmoid heads. Each head labels a damage type and severity. Select thresholds
  using held-out labeled vehicle images; scores are not calibrated probabilities.
- Predictions above threshold add whole-image findings alongside heuristic
  findings. They do not create bounding boxes or suppress heuristic detections.
  Overall severity is the highest finding severity.

Training, dataset collection, accuracy validation and production weights are
still required. Test weights in the unit tests are synthetic mathematical
fixtures and must not be shipped as a recognition model. Train against this
feature representation, or adapt the extractor and schema for an existing model.
