# Dulvit

A neural network training package with real-time visualization.

## Project Structure

- `server.js` - Main server file that handles HTTP and WebSocket connections
- `config.js` - Configuration file for model, dataset, and training parameters
- `gv.js` - Vector and matrix operations library
- `nn.js` - Neural network implementation
- `grof.js` - Visualization library
- `views/` - EJS templates for the web interface
- `public/` - Static assets (CSS, JavaScript)

## Configuration

The project now uses a separate configuration file (`config.js`) to define the model architecture, dataset generation, and training parameters. This makes it easier to modify these settings without touching the server code.

### Modifying the Model

To change the model architecture, edit the `createModel()` function in `config.js`:

```javascript
export function createModel() {
  // Define the model
  const model = new NN.Model(1, new NN.SquareLoss());
  model.addLayer(new NN.Dense(10, 'tanh'));
  model.addLayer(new NN.Dense(10, 'tanh'));
  model.addLayer(new NN.Dense(10, 'tanh'));
  model.addLayer(new NN.Dense(10, 'tanh'));
  model.addLayer(new NN.Dense(1));
  
  return model;
}
```

### Modifying the Dataset

To change the dataset generation, edit the `generateDataset()` function in `config.js`:

```javascript
export function generateDataset() {
  // Create a dataset of the form (100 x 2) from a sin function
  const dataset = GV.addMatrix(
    GV.reshapeMatrix(new GV.Matrix(Array(100).fill(0).map((_, i) => [i/100 * 2 * Math.PI, Math.sin(i/100 * 2 * Math.PI)])), 100, 2), 
    GV.scale(GV.randn(100, 2), 0.1)
  );

  const validationDataset = GV.addMatrix(
    GV.reshapeMatrix(new GV.Matrix(Array(100).fill(0).map((_, i) => [i/100 * 2 * Math.PI, Math.sin(i/100 * 2 * Math.PI)])), 100, 2), 
    GV.scale(GV.randn(100, 2), 0.1)
  );

  return {
    dataset,
    validationDataset
  };
}
```

### Modifying Training Parameters

To change the training parameters, edit the `getTrainingConfig()` function in `config.js`:

```javascript
export function getTrainingConfig() {
  return {
    maxEpochs: 100,
    batchSize: 2,
    earlyStoppingPatience: 50,
    lr: 0.01,
    lrDecay: 0.1,
    lrSchedule: 'decay',
    metrics: ['loss', 'accuracy', 'precision'],
    checkpointFrequency: 10,
    momentum: 0.8,
    verbose: false,
    weightDecay: 0.1
  };
}
```

## Running the Application

```bash
npm start
```

This will start the server on http://localhost:3000.