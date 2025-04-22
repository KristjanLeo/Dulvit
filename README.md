### For Contributors
**By submitting a pull request to this project, 
you agree to license your contribution under the MIT license 
to this project.**

# Dulvit - Neural Network Library

A JavaScript-based neural network library that provides a flexible and efficient implementation of various neural network architectures and training algorithms.

## Features

- **Flexible Architecture**: Support for various layer types and network configurations
- **Multiple Loss Functions**: Includes common loss functions like MSE, Cross Entropy, etc.
- **Advanced Training Options**:
  - Batch training
  - Learning rate scheduling
  - Early stopping
  - Gradient clipping
  - Momentum and weight decay
  - Model checkpointing
- **Vector and Matrix Operations**: Comprehensive linear algebra library (GV)
- **Worker Thread Support**: Parallel processing capabilities
- **Model Persistence**: Save and load model states

## Installation

For now you can simply clone the repository to install the project.

## Quick Start

```javascript
import { Model } from 'dulvit/nn/model.js';
import { Dense } from 'dulvit/nn/layers.js';
import { MSE } from 'dulvit/nn/loss.js';

// Create a simple neural network
const model = new Model(inputDim=10, lossFunction=new MSE());
model.addLayer(new Dense(20, activation='relu'));
model.addLayer(new Dense(1));

// Train the model
const history = await model.train(xTrain, yTrain, {
    batchSize: 32,
    epochs: 100,
    lr: 0.01
});

// Make predictions
const predictions = model.predict(xTest);
```

## Documentation

### Model Class

The `Model` class is the main interface for creating and training neural networks.

#### Constructor

```javascript
new Model(inputDim, lossFunction)
```

- `inputDim`: Dimension of the input data
- `lossFunction`: Loss function to use for training

#### Methods

- `addLayer(layer)`: Add a new layer to the network
- `train(xTrain, yTrain, options)`: Train the model
- `predict(x)`: Make predictions
- `save()`: Save model state
- `load(modelState)`: Load model state
- `getLoss(x, y)`: Compute loss for given data
- `getArchitecture()`: Get model architecture details

### Training Options

The `train` method accepts various options for customizing the training process:

```javascript
{
    xValidation,              // Validation input data
    yValidation,              // Validation target data
    maxValidationLossIncreaseCount: 1,  // Early stopping criterion
    lr: 0.1,                  // Learning rate
    lrDecay: 0.9999,         // Learning rate decay
    batchSize: 8,             // Batch size
    maxEpochs: 10,            // Maximum epochs
    verbose: 1,               // Verbosity level
    earlyStoppingPatience: 5, // Early stopping patience
    earlyStoppingMinDelta: 0.001,  // Minimum improvement
    lrSchedule: 'constant',   // Learning rate schedule
    callbacks: {},            // Training callbacks
    metrics: ['loss'],        // Metrics to track
    checkpointFrequency: 0,   // Checkpoint frequency
    checkpointDir: './checkpoints',  // Checkpoint directory
    gradientClipping: 0,      // Gradient clipping
    momentum: 0.9,            // Momentum coefficient
    weightDecay: 0            // L2 regularization
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

**By submitting a pull request to this project, 
you agree to license your contribution under the MIT license 
to this project.**

## License

This project is licensed under the MIT License - see the LICENSE file for details.

### Example Websites Using Dulvit
- [https://rl-mylla.netlify.app/](https://rl-mylla.netlify.app/) (*An AI model that plays the game of Tic Tac Toe*)
- [https://erumferd.is](https://erumferd.is) (*A prediction model for traffic forecasting*)
