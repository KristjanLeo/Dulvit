import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateDataset, createModel, getTrainingConfig, prepareData } from './config.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  let currentModel = null;
  let isTraining = false;
  let isPaused = false;
  
  // Handle training request
  socket.on('startTraining', (config) => {
    if (isTraining) return;
    
    console.log('Starting training with config:', config);
    isTraining = true;
    
    // Generate dataset using the config function
    const { dataset, validationDataset } = generateDataset();

    // Create model using the config function
    currentModel = createModel(config);

    // Send model architecture to client
    socket.emit('modelArchitecture', currentModel.getArchitecture());

    // Prepare the data for training using the config function
    const { X, Y, XValidation, YValidation } = prepareData(dataset, validationDataset);

    // Get training configuration
    const trainingConfig = getTrainingConfig(config);

    // Train the model
    currentModel.train(
      X, 
      Y,
      {
        ...trainingConfig,
        callbacks: {
          onEpochEnd: (state, metrics) => {
            if (isPaused) return;
            
            // Send training metrics to client
            socket.emit('trainingUpdate', {
              state: {
                epoch: state.epoch,
                startTime: state.startTime
              },
              metrics: {
                loss: metrics.loss,
                valLoss: metrics.valLoss,
                accuracy: metrics.metrics.accuracy,
                precision: metrics.metrics.precision,
                mse: metrics.metrics.mse,
                r2: metrics.metrics.r2,
                learningRate: metrics.learningRate,
                trainingTime: (Date.now() - state.startTime) / 1000
              }
            });
          }
        },
        xValidation: XValidation,
        yValidation: YValidation
      }
    );
  });
  
  // Handle pause training
  socket.on('pauseTraining', () => {
    if (isTraining && !isPaused) {
      isPaused = true;
      if (currentModel) {
        currentModel.pauseTraining();
      }
    }
  });
  
  // Handle resume training
  socket.on('resumeTraining', () => {
    if (isTraining && isPaused) {
      isPaused = false;
      if (currentModel) {
        currentModel.resumeTraining();
      }
    }
  });
  
  // Handle stop training
  socket.on('stopTraining', () => {
    if (isTraining) {
      isTraining = false;
      isPaused = false;
      if (currentModel) {
        currentModel.stopTraining();
        currentModel = null;
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentModel) {
      currentModel.stopTraining();
      currentModel = null;
    }
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 