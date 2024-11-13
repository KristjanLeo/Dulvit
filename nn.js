const {
	Matrix,
	Vector,
	subtractMatrix,
	addMatrix,
	multiplyMatrix,
	multiplyVector,
	multiplyMatrixVector,
	subtractVector,
	dot,
	mult,
	scale
} = GV;


const NN = {};

/************* Layers ***************/
NN.LayerProto = {
	updateWeights(dW, lr) {
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
		default:
			this.activation = activation;
	}

	this.size = size;

	this.f = (x) => {
		
		if(this.W === null) this.setInputDim(x.shape[1]);

		let z = mult(x, this.W);
		if(this.activation !== undefined) {
			[g, dg] = this.activation.f(z);
			return [ g, dg ];
		}

		let zD = [];
		for(let i = 0; i < x.shape[0]; i++) {
			zD.push(Array(this.size).fill(1));
		}

		return [z, new Matrix(zD)];
	}

	this.setInputDim = (inputDim) => {

		this.W = [];
		for(let i = 0; i < inputDim; i++) {
			this.W.push([]);
			for(let j = 0; j < this.size; j++) {
				this.W[i].push(Math.random()*0.1);
			}
		}

		this.W.push([]);
		for(let j = 0; j < this.size; j++) {
			this.W[inputDim].push(0);
		}

		this.W = new Matrix(this.W);
	}

	this.getSize = () => {
		return this.size;
	}
}
Object.assign(NN.Dense.prototype, NN.LayerProto);


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
		let delta = subtractMatrix(o, y);
		let f = 0.5*GV.sum(GV.pow(delta, 2), 1);
		return [new Matrix([[f]]), delta];
	}

	this.getLoss = (y, yPred) => {
		return 0.5*GV.sum(GV.pow(GV.subtractMatrix(y.t, yPred), 2))/y.length;
	}

	this.ff = (o) => {
		return o;
	}
}
Object.assign(NN.SquareLoss.prototype, NN.LossFunctionProto);



/************* Activation functions ***************/
NN.activationProto = {}
NN.Swish = function() {

	this.f = (x) => {
		let sigmoid = GV.oneOver(GV.add(GV.exp(GV.scale(x, -1)), 1));
		let f = multiplyMatrix(x, sigmoid);
		return [f, addMatrix(f, multiplyMatrix(sigmoid, (GV.add(GV.scale(f, -1) ,1))))];
	}
}
Object.assign(NN.Swish.prototype, NN.activationProto);
NN.Sigmoid = function() {

	this.f = (x) => {
		let f = GV.oneOver(GV.add(GV.exp(GV.scale(x, -1)), 1));
		return [f, multiplyMatrix(f, (GV.add(GV.scale(f, -1) ,1)))];
	}
}
Object.assign(NN.Sigmoid.prototype, NN.activationProto);



/************* Model ***************/
NN.Model = function(inputDim, lossFunction) {

	this.inputDim = inputDim;
	this.layers = [];
	this.lossFunction = lossFunction;

	this._computeLayers = (x, y) => {
		
		let computedLayers = [];
		let computedDerivatives = [];

		let layerIn = x;
		for(let i = 0; i < layerIn.length; i++) {
			layerIn[i].push(1);
		}
		computedLayers.push(layerIn);

		for(let i = 0; i < this.layers.length; i++) {
			[layerIn, dF] = this.layers[i].f(layerIn);
			for(let j = 0; j < layerIn.length; j++) {
				layerIn[j].push(1);
			}
			computedLayers.push(layerIn);
			computedDerivatives.push(dF);
		}

		for(let j = 0; j < layerIn.length; j++) {
			layerIn[j] = layerIn[j].slice(0, -1);
			layerIn.rows[j] = layerIn.rows[j].slice(0, -1);
		}
		let [l, dl] = this.lossFunction.f(layerIn, y);
		for(let i = 0; i < l.length; i++) {
			l[i].push(1);
		}

		computedLayers.push(l);
		computedDerivatives.push(dl);

		return [computedLayers, computedDerivatives];
	}


	this._computeLoss = (y, yPred) => this.lossFunction.getLoss(y, yPred);


	this._updateWeights = (lr, computedLayers, computedDerivatives, batchSize) => {

		let revL = this.layers.slice().reverse();
		let revComputedD = computedDerivatives.slice().reverse();
		let revComputedL = computedLayers.slice().reverse();

		let dW = new Matrix(revComputedD[0].rows).t;

		for(let i = 0; i < revL.length; i++) {

			if(revComputedD[i+1].type === 'Vector') {
				dW = mult((new Matrix([revComputedD[i+1].values])), dW.t);
			} else {
				dW = multiplyMatrix(dW.t, revComputedD[i+1]);
			}

			let W = revL[i].getWeights();

			revL[i].updateWeights(
				GV.scale(mult(revComputedL[i+2].t, dW), 1/batchSize), 
				lr
			);

			dW = mult(dW, W.t);
			for(let j = 0; j < dW.length; j++) {
				dW[j] = dW[j].slice(0, -1);
				dW.rows[j] = dW.rows[j].slice(0, -1);
			}
			dW = dW.t;
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
		return this._computeLoss(y, this.predict(x));
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
			[layerIn, _] = this.layers[i].f(layerIn);
			for(let j = 0; j < layerIn.length; j++) {
				layerIn[j].push(1);
			}
		}

		for(let i = 0; i < layerIn.length; i++) {
			layerIn[i] = layerIn[i].slice(0, -1);
			layerIn.rows[i] = layerIn.rows[i].slice(0, -1);
		}

		return this.lossFunction.ff(layerIn);
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
			minEpochs=10,
			verbose=1
		} = options;

		let batchPerEpoch = Math.ceil(xTrain.length/batchSize);
		let loss = null;
		let valLoss = null;
		let trainLosses = [];
		let validationLosses = [];
		let maxIter = maxEpochs;
		let validationLossIncreaseCount = 0;
		let weightHistory = [];

		for(let i = 0; i < maxIter; i++) {

			if(verbose) console.log('Epoch', i+1);

			if(xValidation) {
				if(validationLosses.length > 1 && validationLosses[validationLosses.length - 1] > validationLosses[validationLosses.length-2]) {
					validationLossIncreaseCount += 1;
				} else {
					validationLossIncreaseCount = 0;
				}
			} else {
				if(trainLosses.length > minEpochs && trainLosses[trainLosses.length-1] > trainLosses[trainLosses.length-2]) break;
			}

			loss = 0;

			if(validationLossIncreaseCount >= maxValidationLossIncreaseCount) {
				let bestWeights = weightHistory[GV.argmin(new Vector(validationLosses))];
				for(j in this.layers) {
					layers[j].setWeights(bestWeights[j]);
				}
				break;
			}

			lr *= lrDecay;

			let indices = Array.from(Array(xTrain.length).keys());
			GV.randomPermutation(indices);
			let [permX, permY] = [GV.fromIndices(xTrain, indices), GV.fromIndices(yTrain, indices)];

			for(let j = 0; j < batchPerEpoch; j++) {

				let batchX = new Matrix([...permX.rows.slice(j*batchSize, (j+1)*batchSize).map((row) => row.slice())]);
				let batchY = new Matrix([...permY.rows.slice(j*batchSize, (j+1)*batchSize).map((row) => row.slice())]);

				let [layers, derivatives] = this._computeLayers(batchX, batchY);

				this._updateWeights(lr, layers, derivatives, batchSize);

				let lastL = layers[layers.length-2];

				if(isNaN(this._computeLoss(batchY.t, lastL))) {
					console.log(this.layers);
					console.log(batchY.t, lastL);
					console.log(this._computeLoss(batchY.t, lastL));
					throw Error;
				}
				loss += this._computeLoss(batchY.t, lastL)/batchX.length;
			}

			loss /= xTrain.length;
			trainLosses.push(loss);

			weightHistory.push([...this.layers.map((i) => i.getWeights())]);


			// TODO: validation loss

			if(verbose) console.log('Training loss:', loss);

			if(!maxEpochs) i -= 1;
		}
		
		return [trainLosses, validationLosses];
	}
}