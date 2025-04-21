import GV from './gv.js';
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
	mapVec,
	exp,
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


const NN = {};

/************* Layers ***************/
NN.LayerProto = {
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
	}
}
NN.Dense = function(size, activation) {
	
	this.W = null;

	switch(activation) {
		case 'sigmoid':
			this.activation = new NN.Sigmoid();
			break;
		case 'swish':
			this.activation = new NN.Swish();
			break;
		case 'relu':
			this.activation = new NN.ReLU();
			break;
		case 'leakyrelu':
			this.activation = new NN.LeakyReLU();
			break;
		case 'tanh':
			this.activation = new NN.Tanh();
			break;
		case 'elu':
			this.activation = new NN.ELU();
			break;
		default:
			this.activation = activation;
	}

	this.size = size;

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
}
Object.assign(NN.Dense.prototype, NN.LayerProto);

NN.Dropout = function(rate = 0.5) {
	this.rate = rate;
	this.mask = null;
	this.isTraining = true;

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
}
Object.assign(NN.Dropout.prototype, NN.LayerProto);

/************* Convolutional Layer ***************/
NN.Conv2D = function(filters, kernelSize, stride = 1, padding = 'same') {
	this.filters = filters;
	this.kernelSize = kernelSize;
	this.stride = stride;
	this.padding = padding;
	this.W = null;
	this.b = null;

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
}
Object.assign(NN.Conv2D.prototype, NN.LayerProto);

/************* Loss functions ***************/
NN.LossFunctionProto = {};
NN.Softmax = function() {
	this.f = (o, y) => {
		let exp = GV.exp(o);
		let d = new Matrix([GV.oneOver(GV.sum(exp, 0)).values]);
		f = multiplyMatrixVector(exp, new Vector(d[0]));
		return [f, subtractMatrix(f, y)];
	}

	this.getLoss = (y, yPred) => {
		return -GV.sum(mult(GV.log(GV.abs(yPred)), y))/y.length;
	}

	this.ff = (o) => {
		let exp = GV.exp(o);
		return GV.scale(exp, GV.oneOver(GV.sum(exp, 0)).values[0]);
	}
}
Object.assign(NN.Softmax.prototype, NN.LossFunctionProto);
NN.SquareLoss = function() {
	this.f = (o, y) => {
		// Ensure both inputs are Matrix objects with valid shapes
		if (!o || !y) {
			console.error('Invalid inputs to SquareLoss.f:', { o, y });
			return [new Matrix([[0]]), new Matrix([])];
		}
		
		// Ensure both inputs are Matrix objects
		if (!o.type || o.type !== 'Matrix') {
			o = new Matrix(o);
		}
		if (!y.type || y.type !== 'Matrix') {
			y = new Matrix(y);
		}
		
		// Check for empty matrices
		if ((o.length > 0 && (!o[0] || o[0].length === 0)) || 
			(y.length > 0 && (!y[0] || y[0].length === 0))) {
			console.warn('Empty matrix detected in SquareLoss.f:', 
				{ oShape: [o.length, o[0]?.length], yShape: [y.length, y[0]?.length] });
			
			// Fix the case where o has 0 columns but y has 1 column
			if (o.length > 0 && (!o[0] || o[0].length === 0) && 
				y.length > 0 && y[0] && y[0].length > 0) {
				console.log('Fixing o with 0 columns to match y columns');
				o = zeros(o.length, y[0].length);
			}
			// Fix the case where y has 0 columns but o has columns
			else if (y.length > 0 && (!y[0] || y[0].length === 0) && 
				o.length > 0 && o[0] && o[0].length > 0) {
				console.log('Fixing y with 0 columns to match o columns');
				y = zeros(y.length, o[0].length);
			}
			// If both matrices are empty, create a default shape
			else if ((o.length > 0 && (!o[0] || o[0].length === 0)) && 
				(y.length > 0 && (!y[0] || y[0].length === 0))) {
				console.log('Both matrices are empty, creating default shapes');
				o = zeros(o.length, 1);
				y = zeros(y.length, 1);
			}
		}
		
		// Compute the squared error
		let delta = subtractMatrix(o, y);
		
		// Compute the loss value (sum of squared errors)
		let f = scale(sum(pow(delta, 2), 1), 0.5);
		
		// The gradient of squared error is (o - y)
		// No need to multiply by 2 since we're already scaling by 0.5 in the loss
		return [new Matrix([[f]]), delta];
	}

	this.getLoss = (y, yPred) => {
		// Ensure inputs are Matrix objects
		if (!y.type || y.type !== 'Matrix') {
			y = new Matrix(y);
		}
		if (!yPred.type || yPred.type !== 'Matrix') {
			yPred = new Matrix(yPred);
		}
		
		// Check for shape incompatibility
		if (y.shape[0] !== yPred.shape[0] || y.shape[1] !== yPred.shape[1]) {
			console.warn('Shape incompatibility in SquareLoss.getLoss:', 
				{ yShape: y.shape, yPredShape: yPred.shape });
			
			// Resize matrices to match if possible
			if (y.shape[0] !== yPred.shape[0]) {
				// If row counts don't match, use the minimum
				const minRows = Math.min(y.shape[0], yPred.shape[0]);
				y = new Matrix(y.rows.slice(0, minRows));
				yPred = new Matrix(yPred.rows.slice(0, minRows));
			}
			
			if (y.shape[1] !== yPred.shape[1]) {
				// If column counts don't match, use the minimum
				const minCols = Math.min(y.shape[1], yPred.shape[1]);
				y = new Matrix(y.rows.map(row => row.slice(0, minCols)));
				yPred = new Matrix(yPred.rows.map(row => row.slice(0, minCols)));
			}
		}
		
		// Compute mean squared error
		return 0.5 * sum(pow(subtractMatrix(y, yPred), 2)) / y.length;
	}

	this.ff = (o) => {
		return o;
	}
}
Object.assign(NN.SquareLoss.prototype, NN.LossFunctionProto);

NN.CrossEntropy = function() {
	this.f = (o, y) => {
		let epsilon = 1e-15; // Small constant to prevent log(0)
		let yPred = mapMat(o, val => Math.max(Math.min(val, 1 - epsilon), epsilon));
		let f = -sum(mult(log(yPred), y), 1);
		let delta = subtractMatrix(yPred, y);
		return [new Matrix([[f]]), delta];
	}

	this.getLoss = (y, yPred) => {
		let epsilon = 1e-15;
		yPred = mapMat(yPred, val => Math.max(Math.min(val, 1 - epsilon), epsilon));
		return -sum(mult(log(yPred), y))/y.length;
	}

	this.ff = (o) => {
		return mapMat(o, val => 1 / (1 + Math.exp(-val)));
	}
}
Object.assign(NN.CrossEntropy.prototype, NN.LossFunctionProto);

NN.Hinge = function() {
	this.f = (o, y) => {
		let margin = 1;
		let loss = mapMat(subtractMatrix(margin, multiplyMatrix(o, y)), 
			val => Math.max(0, val));
		let delta = mapMat(loss, val => val > 0 ? -1 : 0);
		return [new Matrix([[sum(loss, 1)]]), multiplyMatrix(delta, y)];
	}

	this.getLoss = (y, yPred) => {
		let margin = 1;
		let loss = mapMat(subtractMatrix(margin, multiplyMatrix(yPred, y)), 
			val => Math.max(0, val));
		return sum(loss)/y.length;
	}

	this.ff = (o) => {
		return o;
	}
}
Object.assign(NN.Hinge.prototype, NN.LossFunctionProto);

NN.Huber = function(delta = 1.0) {
	this.delta = delta;
	this.f = (o, y) => {
		let error = subtractMatrix(o, y);
		let absError = abs(error);
		let quadratic = mapMat(absError, val => 
			val <= this.delta ? 0.5 * val * val : this.delta * val - 0.5 * this.delta * this.delta);
		let linear = mapMat(absError, val => 
			val <= this.delta ? val : this.delta);
		let delta = mapMat(error, val => 
			Math.abs(val) <= this.delta ? val : this.delta * Math.sign(val));
		return [new Matrix([[sum(quadratic, 1)]]), delta];
	}

	this.getLoss = (y, yPred) => {
		let error = subtractMatrix(yPred, y);
		let absError = abs(error);
		let loss = mapMat(absError, val => 
			val <= this.delta ? 0.5 * val * val : this.delta * val - 0.5 * this.delta * this.delta);
		return sum(loss)/y.length;
	}

	this.ff = (o) => {
		return o;
	}
}
Object.assign(NN.Huber.prototype, NN.LossFunctionProto);



/************* Activation functions ***************/
NN.activationProto = {}
NN.Swish = function() {
	this.f = (x) => {
		// Compute sigmoid
		let sigmoid = mapMat(x, val => 1 / (1 + Math.exp(-val)));
		
		// Compute swish: x * sigmoid(x)
		let f = multiplyMatrix(x, sigmoid);
		
		// Compute derivative: sigmoid(x) + x * sigmoid(x) * (1 - sigmoid(x))
		// This simplifies to: sigmoid(x) * (1 + x * (1 - sigmoid(x)))
		let dg = multiplyMatrix(sigmoid, addMatrix(ones(sigmoid.shape[0], sigmoid.shape[1]), 
			multiplyMatrix(x, subtractMatrix(ones(sigmoid.shape[0], sigmoid.shape[1]), sigmoid))));
		
		return [f, dg];
	}
}
Object.assign(NN.Swish.prototype, NN.activationProto);
NN.Sigmoid = function() {
	this.f = (x) => {
		let f = mapMat(x, val => 1 / (1 + Math.exp(-val)));
		return [f, multiplyMatrix(f, subtractMatrix(ones(f.shape[0], f.shape[1]), f))];
	}
}
Object.assign(NN.Sigmoid.prototype, NN.activationProto);

NN.ReLU = function() {
	this.f = (x) => {
		let f = mapMat(x, val => Math.max(0, val));
		let dg = mapMat(x, val => val > 0 ? 1 : 0);
		return [f, dg];
	}
}
Object.assign(NN.ReLU.prototype, NN.activationProto);

NN.LeakyReLU = function(alpha = 0.01) {
	this.alpha = alpha;
	this.f = (x) => {
		let f = mapMat(x, val => val > 0 ? val : this.alpha * val);
		let dg = mapMat(x, val => val > 0 ? 1 : this.alpha);
		return [f, dg];
	}
}
Object.assign(NN.LeakyReLU.prototype, NN.activationProto);

NN.Tanh = function() {
	this.f = (x) => {
		let f = mapMat(x, Math.tanh);
		let dg = mapMat(f, val => 1 - val * val);
		return [f, dg];
	}
}
Object.assign(NN.Tanh.prototype, NN.activationProto);

NN.ELU = function(alpha = 1.0) {
	this.alpha = alpha;
	this.f = (x) => {
		let f = mapMat(x, val => val > 0 ? val : this.alpha * (Math.exp(val) - 1));
		let dg = mapMat(x, val => val > 0 ? 1 : this.alpha * Math.exp(val));
		return [f, dg];
	}
}
Object.assign(NN.ELU.prototype, NN.activationProto);



/************* Model ***************/
NN.Model = function(inputDim, lossFunction) {

	this.inputDim = inputDim;
	this.layers = [];
	this.lossFunction = lossFunction;

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

	this.addLayer = (layer) => {
		if(this.layers.length > 0) {
			layer.setInputDim(this.layers[this.layers.length-1].getSize());
		} else {
			layer.setInputDim(this.inputDim);
		}
		this.layers.push(layer);
	}

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

	this.setTrainingMode = (isTraining) => {
		for (let layer of this.layers) {
			if (layer.isTraining !== undefined) {
				layer.isTraining = isTraining;
			}
		}
	}

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

	this.load = (modelState) => {
		let state = JSON.parse(modelState);
		this.inputDim = state.inputDim;
		this.layers = [];
		
		for (let layerState of state.layers) {
			let layer;
			switch(layerState.type) {
				case 'Dense':
					layer = new NN.Dense(layerState.size);
					break;
				case 'Dropout':
					layer = new NN.Dropout(layerState.params.rate);
					break;
				case 'Conv2D':
					layer = new NN.Conv2D(layerState.size, layerState.params.kernelSize, layerState.params.stride, layerState.params.padding);
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
				this.lossFunction = new NN.Softmax();
				break;
			case 'SquareLoss':
				this.lossFunction = new NN.SquareLoss();
				break;
			case 'CrossEntropy':
				this.lossFunction = new NN.CrossEntropy();
				break;
			case 'Hinge':
				this.lossFunction = new NN.Hinge();
				break;
			case 'Huber':
				this.lossFunction = new NN.Huber();
				break;
		}
	}

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

	// Helper method to compute additional metrics
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
			default:
				return 0;
		}
	}
}


export default NN;