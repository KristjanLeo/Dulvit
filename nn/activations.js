import GV from '../gv.js';
const {
    Matrix,
    mapMat,
    multiplyMatrix,
    addMatrix,
    ones,
    subtractMatrix
} = GV;

/**
 * Activation prototype
 * 
 * @type {Object}
 */
const activationProto = {};

/**
 * Swish activation function
 * 
 * @class Swish
 * @implements {activationProto}
 */
export class Swish {
    constructor() {
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

    getActivationParams() {
        return {
            beta: 1.0
        };
    }
}

/**
 * Sigmoid activation function
 * 
 * @class Sigmoid
 * @implements {activationProto}
 */
export class Sigmoid {
    constructor() {
        this.f = (x) => {
            let f = mapMat(x, val => 1 / (1 + Math.exp(-val)));
            return [f, multiplyMatrix(f, subtractMatrix(ones(f.shape[0], f.shape[1]), f))];
        }
    }
}

/**
 * ReLU activation function
 * 
 * @class ReLU
 * @implements {activationProto}
 */
export class ReLU {
    constructor() {
        this.f = (x) => {
            let f = mapMat(x, val => Math.max(0, val));
            let dg = mapMat(x, val => val > 0 ? 1 : 0);
            return [f, dg];
        }
    }
}

/**
 * LeakyReLU activation function
 * 
 * @class LeakyReLU
 * @implements {activationProto}
 */
export class LeakyReLU {
    constructor(alpha = 0.01) {
        this.alpha = alpha;
        this.f = (x) => {
            let f = mapMat(x, val => val > 0 ? val : this.alpha * val);
            let dg = mapMat(x, val => val > 0 ? 1 : this.alpha);
            return [f, dg];
        }
    }

    getActivationParams() {
        return {
            alpha: this.alpha
        };
    }
}

/**
 * Tanh activation function
 * 
 * @class Tanh
 * @implements {activationProto}
 */
export class Tanh {
    constructor() {
        this.f = (x) => {
            let f = mapMat(x, Math.tanh);
            let dg = mapMat(f, val => 1 - val * val);
            return [f, dg];
        }
    }
}

/**
 * ELU activation function
 * 
 * @class ELU
 * @implements {activationProto}
 */
export class ELU {
    constructor(alpha = 1.0) {
        this.alpha = alpha;
        this.f = (x) => {
            let f = mapMat(x, val => val > 0 ? val : this.alpha * (Math.exp(val) - 1));
            let dg = mapMat(x, val => val > 0 ? 1 : this.alpha * Math.exp(val));
            return [f, dg];
        }
    }

    getActivationParams() {
        return {
            alpha: this.alpha
        };
    }
}

Object.assign(Swish.prototype, activationProto);
Object.assign(Sigmoid.prototype, activationProto);
Object.assign(ReLU.prototype, activationProto);
Object.assign(LeakyReLU.prototype, activationProto);
Object.assign(Tanh.prototype, activationProto);
Object.assign(ELU.prototype, activationProto); 