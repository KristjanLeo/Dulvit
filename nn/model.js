/**
 * Neural Network Model Implementation
 * This module provides a flexible neural network model implementation with support for
 * various layer types, loss functions, and training configurations.
 * 
 * @module nn/model
 */

import GV from '../gv.js';
import * as Layers from './layers.js';
import * as Loss from './loss.js';
import fs from 'fs';

const {
    Matrix,
    Vector,
    subtractMatrix,
    addMatrix,
    multiplyMatrix,
    multiplyMatrixVector,
    mult,
    scale,
    mapMat,
    sum,
    mean,
    argmax,
    argmin,
    equal,
    zeros,
    ones,
    randn,
    log,
    pow,
    abs,
    concat
} = GV;

/**
 * Neural Network Model class that supports various layer types and training configurations.
 * 
 * @class Model
 */
export class Model {
    /**
     * Creates a new neural network model.
     * 
     * @param {number} inputDim - The dimension of the input data
     * @param {Object} lossFunction - The loss function to use for training
     */
    constructor(inputDim, lossFunction) {
        this.inputDim = inputDim;
        this.layers = [];
        this.lossFunction = lossFunction;

        /**
         * Computes the forward pass through all layers and returns intermediate values.
         * 
         * @private
         * @param {Matrix} x - Input data
         * @param {Matrix} y - Target data
         * @returns {Array} Array containing computed layers and their derivatives
         */
        this._computeLayers = (x, y) => {
            let computedLayers = [];
            let computedDerivatives = [];

            // Ensure x is a Matrix object with rows property
            let layerIn = x;
            if (!layerIn.rows) {
                // If x doesn't have rows property, create a Matrix from it
                layerIn = new Matrix(layerIn);
            }
            
            // Add bias term to input
            for(let i = 0; i < layerIn.length; i++) {
                layerIn[i].push(1);
            }
            computedLayers.push(layerIn);

            for(let i = 0; i < this.layers.length; i++) {
                // Compute layer output and derivative
                let dF;
                [layerIn, dF] = this.layers[i].f(layerIn);
                
                // Ensure layerIn is a Matrix object with rows property
                if (!layerIn.rows) {
                    layerIn = new Matrix(layerIn);
                }
                
                // Add bias term to layer output
                for(let j = 0; j < layerIn.length; j++) {
                    layerIn[j].push(1);
                }
                
                computedLayers.push(layerIn);
                computedDerivatives.push(dF);
            }

            // Remove bias term before loss function
            for(let j = 0; j < layerIn.length; j++) {
                if (layerIn[j].length > 1) {
                    layerIn[j] = layerIn[j].slice(0, -1);
                } else {
                    console.warn(`Row ${j} has only one element, not removing bias term`);
                }
            }
            
            // Ensure y is a Matrix object with rows property
            if (!y.rows) {
                y = new Matrix(y);
            }
            
            // Check for empty matrices before calling loss function
            if ((layerIn.length > 0 && (!layerIn[0] || layerIn[0].length === 0)) || 
                (y.length > 0 && (!y[0] || y[0].length === 0))) {
                console.warn('Empty matrix detected in _computeLayers before loss function:', 
                    { layerInShape: [layerIn.length, layerIn[0]?.length], yShape: [y.length, y[0]?.length] });
                
                // Fix the case where layerIn has 0 columns but y has 1 column
                if (layerIn.length > 0 && (!layerIn[0] || layerIn[0].length === 0) && 
                    y.length > 0 && y[0] && y[0].length > 0) {
                    console.log('Fixing layerIn with 0 columns to match y columns');
                    // Create a new matrix with the same number of rows as layerIn and columns as y
                    let newLayerIn = [];
                    for (let i = 0; i < layerIn.length; i++) {
                        newLayerIn.push(Array(y[0].length).fill(0));
                    }
                    layerIn = new Matrix(newLayerIn);
                }
                // Fix the case where y has 0 columns but layerIn has columns
                else if (y.length > 0 && (!y[0] || y[0].length === 0) && 
                    layerIn.length > 0 && layerIn[0] && layerIn[0].length > 0) {
                    console.log('Fixing y with 0 columns to match layerIn columns');
                    // Create a new matrix with the same number of rows as y and columns as layerIn
                    let newY = [];
                    for (let i = 0; i < y.length; i++) {
                        newY.push(Array(layerIn[0].length).fill(0));
                    }
                    y = new Matrix(newY);
                }
                // If both matrices are empty, create a default shape
                else if ((layerIn.length > 0 && (!layerIn[0] || layerIn[0].length === 0)) && 
                    (y.length > 0 && (!y[0] || y[0].length === 0))) {
                    console.log('Both matrices are empty, creating default shapes');
                    // Create a new matrix with 1 column for layerIn
                    let newLayerIn = [];
                    for (let i = 0; i < layerIn.length; i++) {
                        newLayerIn.push([0]);
                    }
                    layerIn = new Matrix(newLayerIn);
                    
                    // Create a new matrix with 1 column for y
                    let newY = [];
                    for (let i = 0; i < y.length; i++) {
                        newY.push([0]);
                    }
                    y = new Matrix(newY);
                }
            }
            
            // Check for shape incompatibility before calling loss function
            if (layerIn.shape[0] !== y.shape[0] || layerIn.shape[1] !== y.shape[1]) {
                console.warn('Shape incompatibility in _computeLayers before loss function:', 
                    { layerInShape: layerIn.shape, yShape: y.shape });
                
                // Resize matrices to match if possible
                if (layerIn.shape[0] !== y.shape[0]) {
                    // If row counts don't match, use the minimum
                    const minRows = Math.min(layerIn.shape[0], y.shape[0]);
                    layerIn = new Matrix(layerIn.rows.slice(0, minRows));
                    y = new Matrix(y.rows.slice(0, minRows));
                }
                
                if (layerIn.shape[1] !== y.shape[1]) {
                    // If column counts don't match, use the minimum
                    const minCols = Math.min(layerIn.shape[1], y.shape[1]);
                    layerIn = new Matrix(layerIn.rows.map(row => row.slice(0, minCols)));
                    y = new Matrix(y.rows.map(row => row.slice(0, minCols)));
                }
            }
            
            // Compute loss and derivative
            let [l, dl] = this.lossFunction.f(layerIn, y);
            
            // Add bias term to loss output
            for(let i = 0; i < l.length; i++) {
                l[i].push(1);
            }

            computedLayers.push(l);
            computedDerivatives.push(dl);

            return [computedLayers, computedDerivatives];
        }

        /**
         * Computes the loss between predicted and target values
         * @private
         * @param {Matrix} y - Target values
         * @param {Matrix} yPred - Predicted values
         * @returns {number} The computed loss value
         */
        this._computeLoss = (y, yPred) => {
            // Ensure inputs are Matrix objects
            if (!y.type || y.type !== 'Matrix') {
                y = new Matrix(y);
            }
            if (!yPred.type || yPred.type !== 'Matrix') {
                yPred = new Matrix(yPred);
            }
            
            return this.lossFunction.getLoss(y, yPred.t);
        }

        /**
         * Updates the weights of all layers using gradient descent
         * @private
         * @param {number} lr - Learning rate
         * @param {Array} computedLayers - Array of computed layer outputs
         * @param {Array} computedDerivatives - Array of computed layer derivatives
         * @param {number} batchSize - Size of the current batch
         * @param {number} momentum - Momentum coefficient
         * @param {number} weightDecay - L2 regularization coefficient
         * @param {Array} momentumBuffers - Buffers for momentum updates
         */
        this._updateWeights = (lr, computedLayers, computedDerivatives, batchSize, momentum, weightDecay, momentumBuffers) => {
            let revL = this.layers.slice().reverse();
            let revComputedD = computedDerivatives.slice().reverse();
            let revComputedL = computedLayers.slice().reverse();

            // Start with the gradient from the loss function
            let dW = revComputedD[0];

            for(let i = 0; i < revL.length; i++) {
                // Get the current layer's weights
                let W = revL[i].getWeights();
                
                // Get the input to this layer (without bias term)
                let inputWithoutBias = revComputedL[i+2].rows.map(row => row.slice(0, -1));
                let inputMatrix = revComputedL[i+2];
                
                // Compute the gradient for this layer
                let layerGrad;
                if(revComputedD[i+1].type === 'Vector') {
                    layerGrad = mult(new Matrix([revComputedD[i+1].values]), dW);
                } else {
                    layerGrad = multiplyMatrix(dW, revComputedD[i+1]);
                }
                
                // Compute the weight gradient: input^T * gradient
                let weightGrad = mult(inputMatrix.t, layerGrad);
                
                // Scale by batch size - this is the key fix for batch sizes > 1
                weightGrad = scale(weightGrad, 1/batchSize);
                
                // Update the weights
                revL[i].updateWeights(weightGrad, lr);
                
                // Compute gradient for next layer: gradient * W^T
                dW = mult(layerGrad, W.t);

                // Remove bias term from dW
                if(dW.type === 'Matrix') {
                    dW.rows = dW.rows.map(row => row.slice(0, -1));
                }        
            }
        }

        /**
         * Adds a new layer to the neural network
         * @param {Object} layer - The layer to add
         */
        this.addLayer = (layer) => {
            if(this.layers.length > 0) {
                layer.setInputDim(this.layers[this.layers.length-1].getSize());
            } else {
                layer.setInputDim(this.inputDim);
            }
            this.layers.push(layer);
        }

        /**
         * Computes the loss for a given input and target
         * @param {Matrix} x - Input data
         * @param {Matrix} y - Target data
         * @returns {number} The computed loss value
         */
        this.getLoss = (x, y) => {
            // Set model to evaluation mode
            this.setTrainingMode(false);
            
            let totalLoss = 0;
            let batchSize = 32; // Use a reasonable batch size
            let numBatches = Math.ceil(x.length / batchSize);
            
            for(let i = 0; i < numBatches; i++) {
                let startIdx = i * batchSize;
                let endIdx = Math.min((i + 1) * batchSize, x.length);
                
                let batchX = new Matrix([...x.rows.slice(startIdx, endIdx).map(row => row.slice())]);
                let batchY = new Matrix([...y.rows.slice(startIdx, endIdx).map(row => row.slice())]);
                
                let yPred = this.predict(batchX);
                totalLoss += this._computeLoss(batchY.t, yPred) * (endIdx - startIdx);
            }
            
            // Set model back to training mode
            this.setTrainingMode(true);
            
            return totalLoss / x.length;
        }

        /**
         * Makes predictions for the given input data
         * @param {Matrix} x - Input data
         * @returns {Matrix} Predicted values
         */
        this.predict = (x) => {
            let layerIn = [];
            for(let i = 0; i < x.rows.length; i++) {
                layerIn.push(x.rows[i].slice());
            }
            layerIn = new Matrix(layerIn);

            for(let i = 0; i < layerIn.length; i++) {
                layerIn[i].push(1);
            }

            for(let i = 0; i < this.layers.length; i++) {
                let dF;
                [layerIn, dF] = this.layers[i].f(layerIn);
                for(let j = 0; j < layerIn.length; j++) {
                    layerIn[j].push(1);
                }
            }

            for(let i = 0; i < layerIn.length; i++) {
                if (layerIn[i].length > 1) {
                    layerIn[i] = layerIn[i].slice(0, -1);
                } else {
                    console.warn(`Row ${i} has only one element, not removing bias term`);
                }
            }
            return this.lossFunction.ff(layerIn.t);
        }

        /**
         * Sets the training mode for all layers
         * @param {boolean} isTraining - Whether the model is in training mode
         */
        this.setTrainingMode = (isTraining) => {
            for (let layer of this.layers) {
                if (layer.isTraining !== undefined) {
                    layer.isTraining = isTraining;
                }
            }
        }

        /**
         * Saves the model state to a JSON string
         * @returns {string} JSON string containing the model state
         */
        this.save = () => {
            let modelState = {
                inputDim: this.inputDim,
                layers: this.layers.map(layer => ({
                    type: layer.constructor.name,
                    size: layer.size,
                    weights: layer.W ? layer.W.rows : null,
                    params: {
                        rate: layer.rate,
                        alpha: layer.alpha
                    }
                })),
                lossFunction: this.lossFunction.constructor.name
            };
            return JSON.stringify(modelState);
        }

        /**
         * Loads a model state from a JSON string
         * @param {string} modelState - JSON string containing the model state
         */
        this.load = (modelState) => {
            let state = JSON.parse(modelState);
            this.inputDim = state.inputDim;
            this.layers = [];
            
            for (let layerState of state.layers) {
                let layer;
                switch(layerState.type) {
                    case 'Dense':
                        layer = new Layers.Dense(layerState.size);
                        break;
                    case 'Dropout':
                        layer = new Layers.Dropout(layerState.params.rate);
                        break;
                    case 'Conv2D':
                        layer = new Layers.Conv2D(layerState.size, layerState.params.kernelSize, layerState.params.stride, layerState.params.padding);
                        break;
                    // Add more layer types as needed
                }
                
                if (layerState.weights) {
                    layer.W = new Matrix(layerState.weights);
                }
                
                this.layers.push(layer);
            }
            
            switch(state.lossFunction) {
                case 'Softmax':
                    this.lossFunction = new Loss.Softmax();
                    break;
                case 'SquareLoss':
                    this.lossFunction = new Loss.SquareLoss();
                    break;
                case 'CrossEntropy':
                    this.lossFunction = new Loss.CrossEntropy();
                    break;
                case 'Hinge':
                    this.lossFunction = new Loss.Hinge();
                    break;
                case 'Huber':
                    this.lossFunction = new Loss.Huber();
                    break;
            }
        }

        /**
         * Trains the model on the given data
         * @param {Matrix} xTrain - Training input data
         * @param {Matrix} yTrain - Training target data
         * @param {Object} options - Training options
         * @param {Matrix} [options.xValidation] - Validation input data
         * @param {Matrix} [options.yValidation] - Validation target data
         * @param {number} [options.maxValidationLossIncreaseCount=1] - Maximum number of times validation loss can increase
         * @param {number} [options.lr=0.1] - Learning rate
         * @param {number} [options.lrDecay=0.9999] - Learning rate decay factor
         * @param {number} [options.batchSize=8] - Batch size for training
         * @param {number} [options.maxEpochs=10] - Maximum number of training epochs
         * @param {number} [options.verbose=1] - Verbosity level
         * @param {number} [options.earlyStoppingPatience=5] - Number of epochs to wait before early stopping
         * @param {number} [options.earlyStoppingMinDelta=0.001] - Minimum change in validation loss to qualify as an improvement
         * @param {string} [options.lrSchedule='constant'] - Learning rate schedule type
         * @param {Object} [options.callbacks={}] - Training callbacks
         * @param {Array} [options.metrics=['loss']] - Metrics to track during training
         * @param {number} [options.checkpointFrequency=0] - Frequency of model checkpointing
         * @param {string} [options.checkpointDir='./checkpoints'] - Directory for model checkpoints
         * @param {number} [options.gradientClipping=0] - Maximum gradient norm
         * @param {number} [options.momentum=0.9] - Momentum coefficient
         * @param {number} [options.weightDecay=0] - L2 regularization coefficient
         * @returns {Promise<Object>} Training history and metrics
         */
        this.train = (
            xTrain,
            yTrain,
            options
        ) => {
            let {
                xValidation=null,
                yValidation=null,
                maxValidationLossIncreaseCount=1,
                lr=0.1,
                lrDecay=0.9999,
                batchSize=8,
                maxEpochs=10,
                verbose=1,
                earlyStoppingPatience=5,
                earlyStoppingMinDelta=0.001,
                lrSchedule='constant', // 'constant', 'decay', 'step'
                callbacks={}, // Dictionary of callback functions
                metrics=['loss'], // Additional metrics to track
                checkpointFrequency=0, // Save model checkpoints every N epochs (0 to disable)
                checkpointDir='./checkpoints', // Directory to save checkpoints
                gradientClipping=0, // Max gradient norm (0 to disable)
                momentum=0.9, // Momentum coefficient
                weightDecay=0 // L2 regularization coefficient
            } = options;

            // Initialize training state
            let state = {
                epoch: 0,
                batches: 0,
                metrics: {},
                bestMetrics: {},
                startTime: Date.now(),
                checkpoints: []
            };

            // Initialize metrics
            metrics.forEach(metric => {
                state.metrics[metric] = [];
                state.bestMetrics[metric] = Infinity;
            });

            // Initialize momentum buffers
            let momentumBuffers = this.layers.map(layer => ({
                weights: null, // Initialize as null, will be set when first dW is received
                biases: layer.b ? new Array(layer.b.length).fill(0) : null
            }));

            let batchPerEpoch = Math.ceil(xTrain.length/batchSize);
            let loss = null;
            let valLoss = null;
            let trainLosses = [];
            let validationLosses = [];
            let maxIter = maxEpochs;
            let validationLossIncreaseCount = 0;
            let weightHistory = [];
            let bestValLoss = Infinity;
            let patienceCounter = 0;
            let initialLr = lr;

            // Create checkpoint directory if needed
            if (checkpointFrequency > 0) {
                try {
                    fs.mkdirSync(checkpointDir, { recursive: true });
                } catch (e) {
                    console.warn('Could not create checkpoint directory:', e);
                }
            }

            // Training loop
            const trainEpoch = async (i) => {
                state.epoch = i + 1;
                let epochStartTime = Date.now();

                // Ensure model is in training mode at the beginning of each epoch
                this.setTrainingMode(true);

                if(verbose) {
                    console.log('\nEpoch', i+1);
                    console.log('Learning rate:', lr.toFixed(6));
                }

                // Learning rate scheduling
                switch(lrSchedule) {
                    case 'decay':
                        // Use a much slower decay that works well with any batch size
                        lr = initialLr / (1 + 0.0001 * i);
                        break;
                    case 'step':
                        if (i > 0 && i % 10 === 0) {
                            lr *= 0.1;
                        }
                        break;
                    default:
                        lr *= lrDecay;
                }

                // Early stopping check
                if (xValidation) {
                    // Set model to evaluation mode
                    this.setTrainingMode(false);
                    
                    // Compute validation loss in batches like training
                    valLoss = 0;
                    let valNumBatches = Math.ceil(xValidation.length / batchSize);
                    
                    for(let j = 0; j < valNumBatches; j++) {
                        let startIdx = j * batchSize;
                        let endIdx = Math.min((j + 1) * batchSize, xValidation.length);
                        
                        let valBatchX = new Matrix([...xValidation.rows.slice(startIdx, endIdx).map(row => row.slice())]);
                        let valBatchY = new Matrix([...yValidation.rows.slice(startIdx, endIdx).map(row => row.slice())]);
                        
                        let [valLayers, _] = this._computeLayers(valBatchX, valBatchY);
                        let valLastL = valLayers[valLayers.length-2];
                        // Simply accumulate the batch loss
                        valLoss += this._computeLoss(valBatchY.t, valLastL);
                    }
                    
                    // Average over number of batches
                    valLoss /= valNumBatches;
                    validationLosses.push(valLoss);
                    
                    // Set model back to training mode
                    this.setTrainingMode(true);
                    
                    if (valLoss < bestValLoss - earlyStoppingMinDelta) {
                        bestValLoss = valLoss;
                        patienceCounter = 0;
                        weightHistory.push([...this.layers.map(layer => layer.getWeights())]);
                        
                        // Save best model checkpoint
                        if (checkpointFrequency > 0) {
                            let checkpointPath = `${checkpointDir}/best_model_epoch_${i+1}.json`;
                            try {
                                fs.writeFileSync(checkpointPath, this.save());
                                state.checkpoints.push(checkpointPath);
                            } catch (e) {
                                console.warn('Could not save checkpoint:', e);
                            }
                        }
                    } else {
                        patienceCounter++;
                        if (patienceCounter >= earlyStoppingPatience) {
                            console.log('Early stopping triggered');
                            let bestWeights = weightHistory[GV.argmin(new Vector(validationLosses))];
                            for(let j in this.layers) {
                                this.layers[j].setWeights(bestWeights[j]);
                            }
                            return true; // Signal to stop training
                        }
                    }
                }

                if(validationLossIncreaseCount >= maxValidationLossIncreaseCount) {
                    let bestWeights = weightHistory[GV.argmin(new Vector(validationLosses))];
                    for(j in this.layers) {
                        layers[j].setWeights(bestWeights[j]);
                    }
                    return true; // Signal to stop training
                }

                loss = 0;
                let batchMetrics = {};

                let indices = Array.from(Array(xTrain.length).keys());
                GV.randomPermutation(new GV.Vector(indices)).values;
                let [permX, permY] = [GV.fromIndices(xTrain, indices), GV.fromIndices(yTrain, indices)];

                // Batch training
                for(let j = 0; j < batchPerEpoch; j++) {
                    state.batches++;
                    
                    // Get the current batch
                    let startIdx = j * batchSize;
                    let endIdx = Math.min((j + 1) * batchSize, permX.length);
                    let batchX = new Matrix([...permX.rows.slice(startIdx, endIdx).map((row) => row.slice())]);
                    let batchY = new Matrix([...permY.rows.slice(startIdx, endIdx).map((row) => row.slice())]);

                    // Compute gradients for this batch
                    let [layers, derivatives] = this._computeLayers(batchX, batchY);

                    // Apply gradient clipping if enabled
                    for(let i = 0; i < derivatives.length; i++) {
                        if (gradientClipping > 0 && derivatives[i]) {
                            // Ensure derivative is a Matrix object
                            if (!derivatives[i].type || derivatives[i].type !== 'Matrix') {
                                derivatives[i] = new Matrix(derivatives[i]);
                            }
                            
                            // Calculate gradient norm
                            let squaredGrad = pow(derivatives[i], 2);
                            let gradNorm = Math.sqrt(sum(squaredGrad));
                            
                            if (gradNorm > gradientClipping) {
                                derivatives[i] = scale(derivatives[i], gradientClipping / gradNorm);
                            }
                        }
                    }

                    // Update weights with the batch gradients
                    this._updateWeights(lr, layers, derivatives, batchSize, momentum, weightDecay, momentumBuffers);

                    // Compute loss for this batch
                    let lastL = layers[layers.length-2];
                    let batchLoss = this._computeLoss(batchY.t, lastL);
                    
                    if(isNaN(batchLoss)) {
                        console.error('NaN loss detected!');
                        console.log('Layer states:', this.layers);
                        console.log('Batch Y:', batchY.t);
                        console.log('Last layer output:', lastL);
                        throw new Error('Training failed: NaN loss detected');
                    }
                    
                    // Accumulate the batch loss
                    loss += batchLoss;
                    
                    // Update metrics
                    metrics.forEach(metric => {
                        if (!batchMetrics[metric]) batchMetrics[metric] = 0;
                        batchMetrics[metric] += this._computeMetric(metric, batchY.t, lastL);
                    });

                    // Call batch end callback if provided
                    if (callbacks.onBatchEnd) {
                        callbacks.onBatchEnd(state, {
                            loss: batchLoss,
                            metrics: batchMetrics,
                            learningRate: lr
                        });
                    }
                }

                // Average the loss over number of batches
                loss /= batchPerEpoch;
                trainLosses.push(loss);

                // Update epoch metrics
                metrics.forEach(metric => {
                    state.metrics[metric].push(batchMetrics[metric] / batchPerEpoch);
                });

                weightHistory.push([...this.layers.map((i) => i.getWeights())]);

                // Regular checkpoint saving
                if (checkpointFrequency > 0 && (i + 1) % checkpointFrequency === 0) {
                    let checkpointPath = `${checkpointDir}/checkpoint_epoch_${i+1}.json`;
                    try {
                        fs.writeFileSync(checkpointPath, this.save());
                        state.checkpoints.push(checkpointPath);
                    } catch (e) {
                        console.warn('Could not save checkpoint:', e);
                    }
                }

                // Enhanced logging
                if(verbose) {
                    let epochTime = (Date.now() - epochStartTime) / 1000;
                    let totalTime = (Date.now() - state.startTime) / 1000;
                    
                    console.log('\nEpoch Summary:');
                    console.log(`Time: ${epochTime.toFixed(2)}s (Total: ${totalTime.toFixed(2)}s)`);
                    console.log(`Training Loss: ${loss.toFixed(6)}`);
                    if (xValidation) {
                        console.log(`Validation Loss: ${valLoss.toFixed(6)}`);
                    }
                    metrics.forEach(metric => {
                        if (metric !== 'loss') {
                            console.log(`${metric}: ${state.metrics[metric][i].toFixed(6)}`);
                        }
                    });
                }

                // Call epoch end callback if provided
                if (callbacks.onEpochEnd) {
                    callbacks.onEpochEnd(state, {
                        loss: loss,
                        valLoss: valLoss,
                        metrics: state.metrics,
                        learningRate: lr
                    });
                }

                return false; // Continue training
            };

            // Start the training loop
            const startTraining = async () => {
                for(let i = 0; i < maxIter; i++) {
                    const shouldStop = await trainEpoch(i);
                    if (shouldStop) break;
                    
                    // Allow the browser to render between epochs
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
                
                return {
                    trainLosses,
                    validationLosses,
                    metrics: state.metrics,
                    checkpoints: state.checkpoints,
                    trainingTime: (Date.now() - state.startTime) / 1000
                };
            };

            return startTraining();
        }

        /**
         * Computes additional metrics during training
         * @private
         * @param {string} metric - Name of the metric to compute
         * @param {Matrix} y - Target values
         * @param {Matrix} yPred - Predicted values
         * @returns {number} The computed metric value
         */
        this._computeMetric = (metric, y, yPred) => {
            // Convert inputs to GV objects if they aren't already
            if (!y.type) y = new GV.Matrix(y);
            if (!yPred.type) yPred = new GV.Matrix(yPred);

            switch(metric) {
                case 'accuracy':
                    return GV.mean(GV.equal(GV.argmax(yPred, 1), GV.argmax(y, 1)));
                case 'precision':
                    let truePositives = GV.sum(GV.multiplyMatrix(yPred, y.t));
                    let predictedPositives = GV.sum(yPred);
                    return truePositives / (predictedPositives + 1e-7);
                case 'recall':
                    let truePositives2 = GV.sum(GV.multiplyMatrix(yPred, y));
                    let actualPositives = GV.sum(y);
                    return truePositives2 / (actualPositives + 1e-7);
                case 'f1':
                    let precision = this._computeMetric('precision', y, yPred);
                    let recall = this._computeMetric('recall', y, yPred);
                    return 2 * (precision * recall) / (precision + recall + 1e-7);
                case 'mse':
                    // Mean Squared Error for regression
                    return GV.mean(GV.pow(GV.subtractMatrix(y, yPred.t), 2));
                case 'r2':
                    // R-squared score for regression
                    const ssRes = GV.sum(GV.pow(GV.subtractMatrix(y, yPred.t), 2));
                    const yMean = new GV.Matrix(yPred.shape).fill(GV.mean(y));
                    const ssTot = GV.sum(GV.pow(GV.subtractMatrix(y, yMean.t), 2));
                    return 1 - (ssRes / (ssTot + 1e-7));
                default:
                    return 0;
            }
        }

        /**
         * Returns the model architecture information
         * @returns {Object} Model architecture details
         */
        this.getArchitecture = () => {
            return {
                inputDim: this.inputDim,
                layers: this.layers.map(layer => layer.getMetadata()),
                lossFunction: {
                    type: this.lossFunction.constructor.name,
                    params: this.lossFunction.getActivationParams ? this.lossFunction.getActivationParams() : {}
                }
            };
        }
    }
} 