import GV from '../gv.js';
const {
    Matrix,
    Vector,
    subtractMatrix,
    multiplyMatrix,
    multiplyMatrixVector,
    mult,
    scale,
    mapMat,
    sum,
    log,
    pow,
    abs,
    exp,
    oneOver
} = GV;

const LossFunctionProto = {};

/**
 * Softmax loss function
 * 
 * @class Softmax
 * @implements {LossFunctionProto}
 */
export class Softmax {
    constructor() {
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
}

/**
 * Square loss function
 * 
 * @class SquareLoss
 * @implements {LossFunctionProto}
 */
export class SquareLoss {
    constructor() {
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
}

/**
 * Cross entropy loss function
 * 
 * @class CrossEntropy
 * @implements {LossFunctionProto}
 */
export class CrossEntropy {
    constructor() {
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
}

/**
 * Hinge loss function
 * 
 * @class Hinge
 * @implements {LossFunctionProto}
 */
export class Hinge {
    constructor() {
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
}

/**
 * Huber loss function
 * 
 * @class Huber
 * @implements {LossFunctionProto}
 */
export class Huber {
    constructor(delta = 1.0) {
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
}

Object.assign(Softmax.prototype, LossFunctionProto);
Object.assign(SquareLoss.prototype, LossFunctionProto);
Object.assign(CrossEntropy.prototype, LossFunctionProto);
Object.assign(Hinge.prototype, LossFunctionProto);
Object.assign(Huber.prototype, LossFunctionProto); 