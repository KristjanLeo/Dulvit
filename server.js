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
  
  // Handle training request
  socket.on('startTraining', (data) => {
    console.log('Starting training');
    
    // Generate dataset using the config function
    const { dataset, validationDataset } = generateDataset();


    // Create model using the config function
    const model = createModel();

    // Prepare the data for training using the config function
    const { X, Y, XValidation, YValidation } = prepareData(dataset, validationDataset);

    // Get training configuration
    const trainingConfig = getTrainingConfig();

    // Train the model
    model.train(
      X, 
      Y,
      {
        ...trainingConfig,
        callbacks: {
          onEpochEnd: (state, metrics) => {
            // Send training metrics to client
            socket.emit('trainingUpdate', {
              state: {
                epoch: state.epoch,
                startTime: state.startTime
              },
              metrics: {
                ...metrics,
                trainingTime: (Date.now() - state.startTime) / 1000,
                validationLoss: metrics.valLoss
              }
            });
          }
        },
        xValidation: XValidation,
        yValidation: YValidation
      }
    )
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 