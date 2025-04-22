import GV from './gv.js';
import {
    Model,
    Layers,
    Loss,
    Activations
} from './nn/nn.js';

/**
 * Configuration file for model and dataset settings
 */

/*
    Dataset configuration
    Should return a dataset and a validation dataset
*/
export function generateDataset() {

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

/*
    Model configuration
    Should return a model
*/
export function createModel() {

    const model = new Model(1, new Loss.SquareLoss());
    model.addLayer(new Layers.Dense(10, 'tanh'));
    model.addLayer(new Layers.Dense(10, 'tanh'));
    model.addLayer(new Layers.Dense(10, 'tanh'));
    model.addLayer(new Layers.Dense(10, 'tanh'));
    model.addLayer(new Layers.Dense(1));
    
    return model;
}

/*
    Training configuration
    Should return a training configuration
*/
export function getTrainingConfig() {

    return {
        maxEpochs: 100,
        batchSize: 2,
        earlyStoppingPatience: 50,
        lr: 0.01,
        lrDecay: 0.1,
        lrSchedule: 'decay',
        metrics: ['loss', 'accuracy', 'precision', 'mse', 'r2'],
        checkpointFrequency: 10,
        momentum: 0.8,
        verbose: false,
        weightDecay: 0.1
    };
}

/*
    Prepare data for training
    Should return a dataset and a validation dataset split into X and Y matrices
*/
export function prepareData(dataset, validationDataset) {

    const X = new GV.Matrix(dataset.rows.map(row => [row[0]]));
    const Y = new GV.Matrix(dataset.rows.map(row => [row[1]]));
    const XValidation = new GV.Matrix(validationDataset.rows.map(row => [row[0]]));
    const YValidation = new GV.Matrix(validationDataset.rows.map(row => [row[1]]));
    
    return {
        X,
        Y,
        XValidation,
        YValidation
    };
} 