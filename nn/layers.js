import GV from '../gv.js';
import * as Activations from './activations.js';

const {
    Matrix,
    subtractMatrix,
    scale,
    mult,
    zeros,
    ones,
    randn,
    concat,
    multiplyMatrix
} = GV;

const LayerProto = {
    updateWeights(dW, lr) {
        // Check if dW is properly defined
        if (!dW || !dW.length) {
            console.warn('Invalid dW in updateWeights:', dW);
            return;
        }
        
        // Ensure dW is a Matrix object
        if (!dW.type || dW.type !== 'Matrix') {
            dW = new GV.Matrix(dW);
        }
        
        subtractMatrix(this.W, scale(dW, lr), true);
    },
    getWeights() {
        return this.W;
    },
    setWeights(weights) {
        this.W = weights;
    },
    getMetadata() {
        return {
            type: this.constructor.name,
            name: this.name,
            units: this.size,
            activation: this.activation ? this.activation.constructor.name : null,
            params: this.getLayerParams()
        };
    },
    getLayerParams() {
        return {};
    }
};

export class Dense {
    constructor(size, activation) {
        this.W = null;
        this.size = size;
        this.name = 'Dense';

        switch(activation) {
            case 'sigmoid':
                this.activation = new Activations.Sigmoid();
                break;
            case 'swish':
                this.activation = new Activations.Swish();
                break;
            case 'relu':
                this.activation = new Activations.ReLU();
                break;
            case 'leakyrelu':
                this.activation = new Activations.LeakyReLU();
                break;
            case 'tanh':
                this.activation = new Activations.Tanh();
                break;
            case 'elu':
                this.activation = new Activations.ELU();
                break;
            default:
                this.activation = activation;
        }

        this.f = (x) => {
            if(this.W === null) this.setInputDim(x.shape[1]);

            let z = mult(x, this.W);
            
            // Check if z has 0 columns
            if (z.length > 0 && (!z[0] || z[0].length === 0)) {
                console.warn('Dense layer output has 0 columns:', { 
                    xShape: [x.length, x[0]?.length], 
                    wShape: [this.W.length, this.W[0]?.length],
                    zShape: [z.length, z[0]?.length]
                });
                
                // Create a new matrix with the same number of rows as z but 1 column
                z = zeros(z.length, 1);
            }
            
            if(this.activation !== undefined && this.activation !== null) {
                let [g, dg] = this.activation.f(z);
                return [ g, dg ];
            }

            let zD = ones(z.shape[0], this.size).rows;
            return [z, new Matrix(zD)];
        }

        this.setInputDim = (inputDim) => {
            // Use He initialization for better training with ReLU-like activations
            let scale = Math.sqrt(2.0 / (inputDim + this.size));
            
            // Initialize weights with a better distribution
            this.W = randn(inputDim, this.size).apply(val => val * scale);
            
            // Initialize bias terms with small random values instead of zeros
            let bias = randn(1, this.size).apply(val => val * 0.01);
            this.W = concat(this.W, bias, 0);
        }

        this.getSize = () => {
            return this.size;
        }

        this.getLayerParams = () => {
            return {
                units: this.size,
                activation: this.activation ? this.activation.constructor.name : null,
                hasBias: true,
                kernelInitializer: 'he',
                weightShape: this.W ? this.W.shape : null
            };
        }
    }
}

export class Dropout {
    constructor(rate = 0.5) {
        this.rate = rate;
        this.mask = null;
        this.isTraining = true;
        this.name = 'Dropout';

        this.f = (x) => {
            if (this.isTraining) {
                this.mask = GV.mapMat(x, () => Math.random() > this.rate ? 1 : 0);
                let output = multiplyMatrix(x, this.mask);
                let scale = 1 / (1 - this.rate);
                output = GV.scale(output, scale);
                return [output, this.mask];
            } else {
                return [x, GV.ones(x.shape[0], x.shape[1])];
            }
        }

        this.setInputDim = (inputDim) => {
            this.inputDim = inputDim;
        }

        this.getSize = () => {
            return this.inputDim;
        }

        this.getLayerParams = () => {
            return {
                rate: this.rate,
                noiseShape: null,
                seed: null
            };
        }
    }
}

export class Conv2D {
    constructor(filters, kernelSize, stride = 1, padding = 'same') {
        this.filters = filters;
        this.kernelSize = kernelSize;
        this.stride = stride;
        this.padding = padding;
        this.W = null;
        this.b = null;
        this.name = 'Conv2D';

        this.f = (x) => {
            if (this.W === null) this.setInputDim(x.shape);

            let [batchSize, inHeight, inWidth, inChannels] = x.shape;
            let outHeight = Math.floor((inHeight - this.kernelSize[0]) / this.stride) + 1;
            let outWidth = Math.floor((inWidth - this.kernelSize[1]) / this.stride) + 1;

            let output = new Matrix(batchSize, outHeight, outWidth, this.filters);
            let gradients = new Matrix(batchSize, outHeight, outWidth, this.filters);

            // Convolution operation
            for (let b = 0; b < batchSize; b++) {
                for (let f = 0; f < this.filters; f++) {
                    for (let i = 0; i < outHeight; i++) {
                        for (let j = 0; j < outWidth; j++) {
                            let sum = 0;
                            for (let kh = 0; kh < this.kernelSize[0]; kh++) {
                                for (let kw = 0; kw < this.kernelSize[1]; kw++) {
                                    for (let c = 0; c < inChannels; c++) {
                                        let h = i * this.stride + kh;
                                        let w = j * this.stride + kw;
                                        if (h < inHeight && w < inWidth) {
                                            sum += x.get(b, h, w, c) * this.W.get(kh, kw, c, f);
                                        }
                                    }
                                }
                            }
                            output.set(b, i, j, f, sum + this.b[f]);
                            gradients.set(b, i, j, f, 1); // ReLU derivative
                        }
                    }
                }
            }

            return [output, gradients];
        }

        this.setInputDim = (inputShape) => {
            let [_, inHeight, inWidth, inChannels] = inputShape;
            
            // Initialize weights
            this.W = new Matrix(this.kernelSize[0], this.kernelSize[1], inChannels, this.filters);
            for (let i = 0; i < this.W.size; i++) {
                this.W.values[i] = (Math.random() * 2 - 1) * Math.sqrt(2.0 / (inChannels * this.kernelSize[0] * this.kernelSize[1]));
            }

            // Initialize biases
            this.b = new Array(this.filters).fill(0);
        }

        this.getSize = () => {
            return [this.filters];
        }

        this.updateWeights = (dW, lr) => {
            // Update weights
            for (let i = 0; i < this.W.size; i++) {
                this.W.values[i] -= lr * dW.values[i];
            }
            // Update biases
            for (let i = 0; i < this.b.length; i++) {
                this.b[i] -= lr * dW.bias[i];
            }
        }

        this.getLayerParams = () => {
            return {
                filters: this.filters,
                kernelSize: this.kernelSize,
                stride: this.stride,
                padding: this.padding,
                activation: null,
                useBias: true,
                kernelInitializer: 'he',
                biasInitializer: 'zeros',
                kernelShape: this.W ? this.W.shape : null
            };
        }
    }
}

Object.assign(Dense.prototype, LayerProto);
Object.assign(Dropout.prototype, LayerProto);
Object.assign(Conv2D.prototype, LayerProto); 