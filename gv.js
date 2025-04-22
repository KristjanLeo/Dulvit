/**
 * GV (General Vector) Library
 * A comprehensive linear algebra and mathematical operations library for JavaScript.
 * Provides vector and matrix operations, mathematical functions, and utility methods
 * for neural network computations.
 * 
 * @module gv
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { cpus } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create workers directory if it doesn't exist
try {
    mkdirSync(`${__dirname}/workers`, { recursive: true });
} catch (e) {
    if (e.code !== 'EEXIST') {
        console.error('Error creating workers directory:', e);
    }
}

/**
 * Main GV namespace containing all vector and matrix operations
 * @namespace GV
 */
const GV = {};

/**
 * Vector prototype containing methods for vector operations
 * @namespace GV.VectorPrototype
 */
GV.VectorPrototype = {
	/**
	 * Iterator implementation for Vector objects
	 * @generator
	 * @yields {number} The next value in the vector
	 */
	[Symbol.iterator]: function* () {
		for(let i = 0; i < this.values.length; i++) {
			yield this.values[i];
		}
	},
	
	/**
	 * Pushes a value to the end of the vector
	 * @param {number} value - The value to push
	 * @returns {number} The new length of the vector
	 */
	push: function(value) {
		this.values.push(value);
		this[this.values.length - 1] = value; // Update proxy properties
		return this.values.length;
	},
	
	/**
	 * Maps a function over all elements of the vector
	 * @param {Function} f - The function to apply to each element
	 * @param {boolean} [inplace=false] - Whether to modify the vector in place
	 * @returns {Vector} A new vector with the mapped values, or the modified vector if inplace
	 */
	map: function(f, inplace=false) {
		if(inplace) {
			for(let i = 0; i < this.values.length; i++) {
				this.values[i] = f(this.values[i]);
				this[i] = this.values[i]; // Update proxy properties
			}
			return this;
		}
		return new GV.Vector(this.values.map(f));
	},
	
	/**
	 * Fills all elements of the vector with a specified value
	 * @param {number} value - The value to fill the vector with
	 * @returns {Vector} The modified vector
	 */
	fill: function(value) {
		for(let i = 0; i < this.values.length; i++) {
			this.values[i] = value;
			this[i] = value; // Update proxy properties
		}
		return this;
	},
	
	// Apply a function to each element
	apply: function(f) {
		for(let i = 0; i < this.values.length; i++) {
			this.values[i] = f(this.values[i]);
			this[i] = this.values[i]; // Update proxy properties
		}
		return this;
	},
	
	// Get a slice of the vector
	slice: function(start, end) {
		return new GV.Vector(this.values.slice(start, end));
	},
	
	// Check if all elements satisfy a condition
	every: function(f) {
		return this.values.every(f);
	},
	
	// Check if any element satisfies a condition
	some: function(f) {
		return this.values.some(f);
	},
	
	// Find the first element that satisfies a condition
	find: function(f) {
		return this.values.find(f);
	},
	
	// Find the index of the first element that satisfies a condition
	findIndex: function(f) {
		return this.values.findIndex(f);
	},
	
	// Filter elements that satisfy a condition
	filter: function(f) {
		return new GV.Vector(this.values.filter(f));
	},
	
	// Reduce the vector to a single value
	reduce: function(f, initialValue) {
		return this.values.reduce(f, initialValue);
	},
	
	// Create a copy of the vector
	clone: function() {
		return new GV.Vector([...this.values]);
	},
	
	// Check if the vector contains a value
	includes: function(value) {
		return this.values.includes(value);
	},
	
	// Get the index of a value
	indexOf: function(value) {
		return this.values.indexOf(value);
	},
	
	// Get the last index of a value
	lastIndexOf: function(value) {
		return this.values.lastIndexOf(value);
	},
	
	// Reverse the vector
	reverse: function() {
		this.values.reverse();
		// Update proxy properties
		for(let i = 0; i < this.values.length; i++) {
			this[i] = this.values[i];
		}
		return this;
	},
	
	// Sort the vector
	sort: function(compareFn) {
		this.values.sort(compareFn);
		// Update proxy properties
		for(let i = 0; i < this.values.length; i++) {
			this[i] = this.values[i];
		}
		return this;
	},
	
	// Join elements into a string
	join: function(separator) {
		return this.values.join(separator);
	},
	
	// Get the sum of all elements
	sum: function() {
		return this.values.reduce((a, b) => a + b, 0);
	},
	
	// Get the average of all elements
	mean: function() {
		return this.sum() / this.values.length;
	},
	
	// Get the minimum value
	min: function() {
		return Math.min(...this.values);
	},
	
	// Get the maximum value
	max: function() {
		return Math.max(...this.values);
	},
	
	// Get the standard deviation
	std: function() {
		const avg = this.mean();
		const squareDiffs = this.values.map(value => {
			const diff = value - avg;
			return diff * diff;
		});
		const avgSquareDiff = new GV.Vector(squareDiffs).mean();
		return Math.sqrt(avgSquareDiff);
	},
	
	// Get the variance
	var: function() {
		const avg = this.mean();
		const squareDiffs = this.values.map(value => {
			const diff = value - avg;
			return diff * diff;
		});
		return new GV.Vector(squareDiffs).mean();
	}
}

/**
 * Vector constructor
 * @param {Array|number} values - The values to initialize the vector with
 * @returns {Vector} A new Vector object
 */
GV.Vector = function(values) {
	
	if(values.constructor.name !== 'Array') {
		// Handle shape initialization
		if(typeof values === 'number') {
			values = Array(values).fill(0);
		} else {
			return null;
		}
	}

	this.type = 'Vector';
	this.values = values;

	// Create a proxy to intercept property access and assignment
	const self = this;
	const handler = {
		get: function(target, prop) {
			// Handle Symbol properties directly
			if (typeof prop === 'symbol') {
				return target[prop];
			}
			// Handle numeric indices
			if (!isNaN(prop) && prop >= 0 && prop < target.values.length) {
				return target.values[prop];
			}
			// Handle other properties
			return target[prop];
		},
		set: function(target, prop, value) {
			// Handle numeric indices
			if (!isNaN(prop) && prop >= 0 && prop < target.values.length) {
				target.values[prop] = value;
				return true;
			}
			// Handle other properties
			target[prop] = value;
			return true;
		}
	};

	// Create the proxy
	const proxy = new Proxy(this, handler);
	
	// Initialize direct properties
	for(let i = 0; i < values.length; i++) {
		proxy[i] = values[i];
	}

	proxy.toString = () => {
		return '[' + proxy.values.toString() + ']';
	}

	return proxy;
}
Object.assign(GV.Vector.prototype, GV.VectorPrototype);
Object.defineProperties(GV.Vector.prototype, {
	size: {
		get: function() {
			return this.values.length;
		}
	},
	length: {
		get: function() {
			return this.values.length;
		}
	},
	shape: {
		get: function() {
			return [this.values.length];
		}
	}
});




/**
 * Matrix prototype containing methods for matrix operations
 * @namespace GV.MatrixPrototype
 */
GV.MatrixPrototype = {
	[Symbol.iterator]: function* () {
		for(let i = 0; i < this.rows.length; i++) {
			yield this.rows[i];
		}
	},
	
	// Push a row to the end of the matrix
	pushRow: function(row) {
		if (!Array.isArray(row)) {
			console.error('Row must be an array');
			return null;
		}
		if (this.rows.length > 0 && row.length !== this.rows[0].length) {
			console.error('Row length must match matrix column count');
			return null;
		}
		this.rows.push(row);
		this[this.rows.length - 1] = row; // Update proxy properties
		return this.rows.length;
	},
	
	// Push a column to the end of the matrix
	pushColumn: function(column) {
		if (!Array.isArray(column)) {
			console.error('Column must be an array');
			return null;
		}
		if (this.rows.length > 0 && column.length !== this.rows.length) {
			console.error('Column length must match matrix row count');
			return null;
		}
		if (this.rows.length === 0) {
			// If matrix is empty, create first row
			this.rows.push([column[0]]);
			this[0] = this.rows[0];
			return 1;
		}
		for (let i = 0; i < this.rows.length; i++) {
			this.rows[i].push(column[i]);
		}
		return this.rows[0].length;
	},
	
	// Map a function over all elements
	map: function(f, inplace=false) {
		if(inplace) {
			for(let i = 0; i < this.rows.length; i++) {
				for(let j = 0; j < this.rows[i].length; j++) {
					this.rows[i][j] = f(this.rows[i][j]);
				}
				this[i] = this.rows[i]; // Update proxy properties
			}
			return this;
		}
		return new GV.Matrix(this.rows.map(row => row.map(f)));
	},
	
	// Fill all elements with a value
	fill: function(value) {
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < this.rows[i].length; j++) {
				this.rows[i][j] = value;
			}
			this[i] = this.rows[i]; // Update proxy properties
		}
		return this;
	},
	
	// Apply a function to each element
	apply: function(f) {
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < this.rows[i].length; j++) {
				this.rows[i][j] = f(this.rows[i][j]);
			}
			this[i] = this.rows[i]; // Update proxy properties
		}
		return this;
	},
	
	// Get a submatrix
	slice: function(startRow, endRow, startCol, endCol) {
		const slicedRows = this.rows.slice(startRow, endRow).map(row => 
			row.slice(startCol, endCol)
		);
		return new GV.Matrix(slicedRows);
	},
	
	// Check if all elements satisfy a condition
	every: function(f) {
		return this.rows.every(row => row.every(f));
	},
	
	// Check if any element satisfies a condition
	some: function(f) {
		return this.rows.some(row => row.some(f));
	},
	
	// Find the first element that satisfies a condition
	find: function(f) {
		for(let i = 0; i < this.rows.length; i++) {
			const found = this.rows[i].find(f);
			if(found !== undefined) return found;
		}
		return undefined;
	},
	
	// Find the indices of the first element that satisfies a condition
	findIndices: function(f) {
		for(let i = 0; i < this.rows.length; i++) {
			const j = this.rows[i].findIndex(f);
			if(j !== -1) return {row: i, col: j};
		}
		return null;
	},
	
	// Filter elements that satisfy a condition
	filter: function(f) {
		const result = [];
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < this.rows[i].length; j++) {
				if(f(this.rows[i][j])) {
					result.push(this.rows[i][j]);
				}
			}
		}
		return new GV.Vector(result);
	},
	
	// Create a copy of the matrix
	clone: function() {
		const clonedRows = this.rows.map(row => [...row]);
		return new GV.Matrix(clonedRows);
	},
	
	// Check if the matrix contains a value
	includes: function(value) {
		return this.rows.some(row => row.includes(value));
	},
	
	// Find the indices of a value
	findValue: function(value) {
		for(let i = 0; i < this.rows.length; i++) {
			const j = this.rows[i].indexOf(value);
			if(j !== -1) return {row: i, col: j};
		}
		return null;
	},
	
	// Get the sum of all elements
	sum: function() {
		return this.rows.reduce((rowSum, row) => 
			rowSum + row.reduce((colSum, val) => colSum + val, 0), 0);
	},
	
	// Get the average of all elements
	mean: function() {
		return this.sum() / this.size;
	},
	
	// Get the minimum value
	min: function() {
		return Math.min(...this.rows.flat());
	},
	
	// Get the maximum value
	max: function() {
		return Math.max(...this.rows.flat());
	},
	
	// Get the standard deviation
	std: function() {
		const avg = this.mean();
		const squareDiffs = this.rows.flat().map(value => {
			const diff = value - avg;
			return diff * diff;
		});
		const avgSquareDiff = new GV.Vector(squareDiffs).mean();
		return Math.sqrt(avgSquareDiff);
	},
	
	// Get the variance
	var: function(ddof = 0) {
		const avg = this.mean();
		const squareDiffs = this.rows.flat().map(value => {
			const diff = value - avg;
			return diff * diff;
		});
		return new GV.Vector(squareDiffs).mean();
	},
	
	// Get row sums
	rowSums: function() {
		return new GV.Vector(this.rows.map(row => 
			row.reduce((sum, val) => sum + val, 0)
		));
	},
	
	// Get column sums
	colSums: function() {
		const colSums = new Array(this.rows[0].length).fill(0);
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < this.rows[i].length; j++) {
				colSums[j] += this.rows[i][j];
			}
		}
		return new GV.Vector(colSums);
	},
	
	// Get row means
	rowMeans: function() {
		return this.rowSums().apply(val => val / this.rows[0].length);
	},
	
	// Get column means
	colMeans: function() {
		return this.colSums().apply(val => val / this.rows.length);
	},
	
	// Get diagonal elements
	diagonal: function() {
		const minDim = Math.min(this.rows.length, this.rows[0].length);
		const diag = new Array(minDim);
		for(let i = 0; i < minDim; i++) {
			diag[i] = this.rows[i][i];
		}
		return new GV.Vector(diag);
	},
	
	// Create an identity matrix of the same size
	identity: function() {
		const size = Math.min(this.rows.length, this.rows[0].length);
		const idMatrix = new GV.Matrix(this.rows.map((row, i) => 
			row.map((_, j) => i === j ? 1 : 0)
		));
		return idMatrix;
	},
	
	// Check if the matrix is symmetric
	isSymmetric: function() {
		if(this.rows.length !== this.rows[0].length) return false;
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < i; j++) {
				if(this.rows[i][j] !== this.rows[j][i]) return false;
			}
		}
		return true;
	},
	
	// Check if the matrix is diagonal
	isDiagonal: function() {
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < this.rows[i].length; j++) {
				if(i !== j && this.rows[i][j] !== 0) return false;
			}
		}
		return true;
	},
	
	// Check if the matrix is upper triangular
	isUpperTriangular: function() {
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = 0; j < i; j++) {
				if(this.rows[i][j] !== 0) return false;
			}
		}
		return true;
	},
	
	// Check if the matrix is lower triangular
	isLowerTriangular: function() {
		for(let i = 0; i < this.rows.length; i++) {
			for(let j = i + 1; j < this.rows[i].length; j++) {
				if(this.rows[i][j] !== 0) return false;
			}
		}
		return true;
	}
}

/**
 * Matrix constructor
 * @param {Array|number} rows - The rows to initialize the matrix with
 * @returns {Matrix} A new Matrix object
 */
GV.Matrix = function(rows) {

	// Check if this is a shape specification
	if(Array.isArray(rows) && rows.length === 2 && typeof rows[0] === 'number' && typeof rows[1] === 'number') {
		// If array of [rows, cols] provided
		rows = Array(rows[0]).fill(0).map(() => Array(rows[1]).fill(0));
	} else if(typeof rows === 'number') {
		// If only one number provided, create a square matrix
		rows = Array(rows).fill(0).map(() => Array(rows).fill(0));
	} else if(!Array.isArray(rows)) {
		return null;
	}

	this.type = 'Matrix';
	this.rows = rows;

	// Create a proxy to intercept property access and assignment
	const self = this;
	const handler = {
		get: function(target, prop) {
			// Handle Symbol properties directly
			if (typeof prop === 'symbol') {
				return target[prop];
			}
			// Handle numeric indices
			if (!isNaN(prop) && prop >= 0 && prop < target.rows.length) {
				return target.rows[prop];
			}
			// Handle other properties
			return target[prop];
		},
		set: function(target, prop, value) {
			// Handle numeric indices
			if (!isNaN(prop) && prop >= 0 && prop < target.rows.length) {
				target.rows[prop] = value;
				return true;
			}
			// Handle other properties
			target[prop] = value;
			return true;
		}
	};

	// Create the proxy
	const proxy = new Proxy(this, handler);
	
	// Initialize direct properties
	for(let i = 0; i < rows.length; i++) {
		proxy[i] = rows[i];
	}

	proxy.toString = () => {
		let str = '[';
		for(let i in rows) str += '[' + rows[i].toString() + '],';
		str = str.slice(0, str.length-1) + ']';
		return str;
	}

	return proxy;
}
Object.assign(GV.Matrix.prototype, GV.MatrixPrototype);
Object.defineProperties(GV.Matrix.prototype, {
	size: {
		get: function() {
			if (this.rows.length === 0) return 0;
			return this.rows.length * this.rows[0].length;
		}
	},
	length: {
		get: function() {
			return this.rows.length;
		}
	},
	shape: {
		get: function() {
			if (this.rows === undefined || this.rows.length === 0) return `(0)`;
			return [this.rows.length, this.rows[0].length];
		}
	},
	t: {
		get: function() {
			let n = [];
			for(let i = 0; i < this.rows[0].length; i++) {
				n.push([]);
				for(let j = 0; j < this.rows.length; j++) {
					n[i].push(this.rows[j][i]);
				}
			}
			return new GV.Matrix(n);
		}
	}
});





// ******************* Static *********************

/**
 * Multiplies two matrices
 * @param {Matrix} a - The first matrix
 * @param {Matrix} b - The second matrix
 * @returns {Matrix} The product of the two matrices
 */
GV._matMult = (a, b) => {
    if (!a || !b || a.length === 0 || b.length === 0) {
        console.error('Invalid matrices for matrix multiplication:', { a, b });
        return new GV.Matrix([]);
    }
    
    if (a[0].length !== b.length) {
        console.error('Shapes do not match for matrix multiplication:', 
            { aShape: [a.length, a[0]?.length], bShape: [b.length, b[0]?.length] });
        return new GV.Matrix([]);
    }
    
    if (b[0].length === 0) {
        console.error('Second matrix has 0 columns:', 
            { aShape: [a.length, a[0]?.length], bShape: [b.length, b[0]?.length] });
        return new GV.Matrix(Array(a.length).fill([]));
    }

    // Use synchronous version for small matrices
    if (a.length * b[0].length < 1000) {
        const c = Array(a.length).fill(0).map(() => Array(b[0].length).fill(0));
        for(let i = 0; i < a.length; i++) {
            for(let j = 0; j < b[0].length; j++) {
                let sum = 0;
                for(let k = 0; k < a[0].length; k++) {
                    sum += a[i][k] * b[k][j];
                }
                c[i][j] = sum;
            }
        }
        return new GV.Matrix(c);
    }

    // Use parallel version for large matrices
    const numWorkers = navigator.hardwareConcurrency || 4;
    const rowsPerWorker = Math.ceil(a.length / numWorkers);
    const workers = [];
    const results = [];
    let completedWorkers = 0;

    // Convert Matrix objects to raw arrays if necessary
    const aData = a.type === 'Matrix' ? a.rows : a;
    const bData = b.type === 'Matrix' ? b.rows : b;

    for(let i = 0; i < numWorkers; i++) {
        const startRow = i * rowsPerWorker;
        const endRow = Math.min(startRow + rowsPerWorker, a.length);
        
        if(startRow >= a.length) break;
        
        const worker = GV._createWorker();
        workers.push(worker);
        
        worker.onmessage = (e) => {
            const { data } = e.data;
            results.push(...data);
            completedWorkers++;
            
            if(completedWorkers === workers.length) {
                workers.forEach(w => w.terminate());
                return new GV.Matrix(results);
            }
        };
        
        worker.postMessage({
            operation: 'matrixMultiply',
            data: { 
                a: aData, 
                b: bData, 
                startRow, 
                endRow 
            }
        });
    }

    // Fallback to synchronous version if workers fail
    const c = Array(a.length).fill(0).map(() => Array(b[0].length).fill(0));
    for(let i = 0; i < a.length; i++) {
        for(let j = 0; j < b[0].length; j++) {
            let sum = 0;
            for(let k = 0; k < a[0].length; k++) {
                sum += a[i][k] * b[k][j];
            }
            c[i][j] = sum;
        }
    }
    return new GV.Matrix(c);
};

/**
 * Dot product of two vectors
 * @param {Vector} a - The first vector
 * @param {Vector} b - The second vector
 * @returns {number} The dot product of the two vectors
 */
GV.dot = (a, b) => {
	if(a.type !== 'Vector' || b.type !== 'Vector') {
		console.error('Items must be of type Vector.');
		return null;
	}

	// Use a single loop and avoid array access overhead
	let sum = 0;
	const len = a.length;
	for(let i = 0; i < len; i++) {
		sum += a[i] * b[i];
	}
	return sum;
}

/**
 * Multiplies multiple matrices and vectors
 * @param {...Matrix|Vector} args - The matrices and vectors to multiply
 * @returns {Matrix|Vector} The result of the multiplication
 */
GV.mult = (...args) => {
	
	if(args.length === 0) return null;
	if(args.length === 1) return args[1];

	let m = args[0];
	for(let i = 1; i < args.length; i++) {
		
		if(args[i].type === 'Matrix' && m.type === 'Matrix') {
			m = GV._matMult(m, args[i]);
		}

		if(args[i].type === 'Vector' && m.type === 'Vector') {
			m = GV.dot(m, args[i]);
		}

		if(args[i].type === 'Matrix' && m.type === 'Vector') {
			m = GV._vecMatMult(m, args[i]);
		}

		if(args[i].type === 'Vector' && m.type === 'Matrix') {
			m = GV._matVecMult(m, args[i]);
		}
	}

	return m;
}

/**
 * Subtracts two vectors
 * @param {Vector} a - The first vector
 * @param {Vector} b - The second vector
 * @param {boolean} [inplace=false] - Whether to modify the first vector in place
 * @returns {Vector} The result of the subtraction	
 */
GV.subtractVector = (a, b, inplace=false) => {

	if(inplace) {
		for(let i = 0; i < a.length; i++) {
			a[i] -= b[i];
			// No need to update a.values[i] as the proxy will handle it
		}
		return;
	}

	let newV = [];
	for(let i = 0; i < a.length; i++) newV.push(a[i]-b[i]);
	return new GV.Vector(newV);
}

/**
 * Multiplies two vectors element-wise
 * @param {Vector} a - The first vector
 * @param {Vector} b - The second vector
 * @param {boolean} [inplace=false] - Whether to modify the first vector in place
 * @returns {Vector} The result of the multiplication
 */
GV.multiplyVector = (a, b, inplace=false) => {
	if(inplace) {
		for(let i = 0; i < a.length; i++) {
			a[i] *= b[i];
			// No need to update a.values[i] as the proxy will handle it
		}
		return;
	}

	let newV = [];
	for(let i = 0; i < a.length; i++) newV.push(a[i]*b[i]);
	return new GV.Vector(newV);
}

/**
 * Subtracts two matrices
 * @param {Matrix} m1 - The first matrix
 * @param {Matrix} m2 - The second matrix
 * @param {boolean} [inplace=false] - Whether to modify the first matrix in place
 * @returns {Matrix} The result of the subtraction	
 */
GV.subtractMatrix = (m1, m2, inplace=false) => {
	// Check if inputs are valid
	if (!m1 || !m2) {
		console.error('Invalid inputs to subtractMatrix:', { m1, m2 });
		return m1; // Return the first matrix if inputs are invalid
	}
	
	// Ensure both inputs are Matrix objects
	if (!m1.type || m1.type !== 'Matrix') {
		m1 = new GV.Matrix(m1);
	}
	if (!m2.type || m2.type !== 'Matrix') {
		m2 = new GV.Matrix(m2);
	}
	
	// Handle empty matrices with more detailed logging
	if ((m1.length > 0 && (!m1[0] || m1[0].length === 0)) || 
		(m2.length > 0 && (!m2[0] || m2[0].length === 0))) {
		console.warn('Empty matrix detected in subtractMatrix:', 
			{ m1Shape: [m1.length, m1[0]?.length], m2Shape: [m2.length, m2[0]?.length] });
		
		// Try to fix the empty matrix if possible
		if (m1.length > 0 && (!m1[0] || m1[0].length === 0)) {
			console.log('Attempting to fix empty first matrix');
			m1[0] = Array(m2[0]?.length || 0).fill(0);
			m1.rows[0] = m1[0];
		}
		if (m2.length > 0 && (!m2[0] || m2[0].length === 0)) {
			console.log('Attempting to fix empty second matrix');
			m2[0] = Array(m1[0]?.length || 0).fill(0);
			m2.rows[0] = m2[0];
		}
		
		// Check if matrices are still empty after fixing
		if ((m1.length > 0 && (!m1[0] || m1[0].length === 0)) || 
			(m2.length > 0 && (!m2[0] || m2[0].length === 0))) {
			console.warn('Could not fix empty matrices, returning first matrix');
			return m1;
		}
	}
	
	// Check if matrices have compatible shapes
	if (m1.length !== m2.length || (m1[0] && m2[0] && m1[0].length !== m2[0].length)) {
		console.error('Incompatible matrix shapes in subtractMatrix:', 
			{ m1Shape: [m1.length, m1[0]?.length], m2Shape: [m2.length, m2[0]?.length] });
		return m1; // Return the first matrix if shapes are incompatible
	}
	
	if(inplace) {
		for(let i = 0; i < m1.length; i++) {
			for(let j = 0; j < m1[0].length; j++) {
				m1[i][j] -= m2[i][j];
				// No need to update m1.rows[i][j] as the proxy will handle it
			}
		}
		return;
	}

	let newM = [];
	for(let i = 0; i < m1.length; i++) {
		newM.push([]);
		for(let j = 0; j < m1[0].length; j++) {
			newM[i].push(m1[i][j] - m2[i][j]);
		}
	}
	return new GV.Matrix(newM);
}

/**
 * Adds two matrices
 * @param {Matrix} m1 - The first matrix
 * @param {Matrix} m2 - The second matrix
 * @param {boolean} [inplace=false] - Whether to modify the first matrix in place
 * @returns {Matrix} The result of the addition	
 */
GV.addMatrix = (m1, m2, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m1.length; i++) {
			for(let j = 0; j < m1[0].length; j++) {
				m1[i][j] += m2[i][j];
				// No need to update m1.rows[i][j] as the proxy will handle it
			}
		}
		return;
	}

	let newM = [];
	for(let i = 0; i < m1.length; i++) {
		newM.push([]);
		for(let j = 0; j < m1[0].length; j++) {
			newM[i].push(m1[i][j] + m2[i][j]);
		}
	}
	return new GV.Matrix(newM);
}

/**
 * Multiplies two matrices
 * @param {Matrix} m1 - The first matrix
 * @param {Matrix} m2 - The second matrix
 * @param {boolean} [inplace=false] - Whether to modify the first matrix in place
 * @returns {Matrix} The result of the multiplication
 */	
GV.multiplyMatrix = (m1, m2, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m1.length; i++) {
			for(let j = 0; j < m1[0].length; j++) {
				m1[i][j] *= m2[i][j];
				// No need to update m1.rows[i][j] as the proxy will handle it
			}
		}
		return;
	}

	let newM = [];
	for(let i = 0; i < m1.length; i++) {
		newM.push([]);
		for(let j = 0; j < m1[0].length; j++) {
			newM[i].push(m1[i][j] * m2[i][j]);
		}
	}
	return new GV.Matrix(newM);
}

/**
 * Multiplies a matrix and a vector
 * @param {Matrix} m - The matrix
 * @param {Vector} v - The vector
 * @param {boolean} [inplace=false] - Whether to modify the first matrix in place
 * @returns {Matrix} The result of the multiplication
 */	
GV.multiplyMatrixVector = (m, v, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m.length; i++) {
			for(let j = 0; j < m[0].length; j++) {
				m[i][j] *= v[i];
			}
		}
		return;
	}

	let newM = [];
	for(let i = 0; i < m.length; i++) {
		newM.push([]);
		for(let j = 0; j < m[0].length; j++) {
			newM[i].push(m[i][j]*v[i]);
		}
	}
	return new GV.Matrix(newM);
}

/**
 * Maps a function over all elements of a matrix
 * @param {Matrix} m - The matrix
 * @param {Function} f - The function to apply to each element
 * @param {boolean} [inplace=false] - Whether to modify the matrix in place
 * @returns {Matrix} The result of the mapping
 */	
GV.mapMat = (m, f, inplace=false) => {
	if (!m) {
		console.error('Invalid input to mapMat function:', m);
		return null;
	}
	
	if (m.length > 0 && (!m[0] || m[0].length === 0)) {
		console.warn('Empty matrix detected in mapMat function, returning original matrix');
		return m;
	}
	
	if(inplace) {
		const rows = m.length;
		const cols = m[0].length;
		for(let i = 0; i < rows; i++) {
			const row = m[i];
			for(let j = 0; j < cols; j++) {
				row[j] = f(row[j]);
			}
			m[i] = row;
		}
		return;
	}

	// Pre-allocate result matrix
	const newM = Array(m.length).fill(0).map(() => Array(m[0].length).fill(0));
	const rows = m.length;
	const cols = m[0].length;
	
	for(let i = 0; i < rows; i++) {
		const row = m[i];
		for(let j = 0; j < cols; j++) {
			newM[i][j] = f(row[j]);
		}
	}
	return new GV.Matrix(newM);
}

/**
 * Maps a function over all elements of a vector
 * @param {Vector} v - The vector
 * @param {Function} f - The function to apply to each element
 * @param {boolean} [inplace=false] - Whether to modify the vector in place
 * @returns {Vector} The result of the mapping
 */	
GV.mapVec = (v, f, inplace=false) => {
	if(inplace) {
		const len = v.length;
		for(let i = 0; i < len; i++) {
			v[i] = f(v[i]);
		}
		return;
	}
	
	// Pre-allocate result vector
	const newV = new Array(v.length);
	const len = v.length;
	for(let i = 0; i < len; i++) {
		newV[i] = f(v[i]);
	}
	return new GV.Vector(newV);
}

/**
 * Exponentiates all elements of a matrix
 * @param {Matrix} m - The matrix
 * @param {boolean} [inplace=false] - Whether to modify the matrix in place
 * @returns {Matrix} The result of the exponentiation
 */		
GV.expMat = (m, inplace=false) => {
	if(inplace) { GV.mapMat(m, Math.exp, true); return; }
	return GV.mapMat(m, Math.exp, false);
}

/**
 * Exponentiates all elements of a vector
 * @param {Vector} v - The vector
 * @param {boolean} [inplace=false] - Whether to modify the vector in place
 * @returns {Vector} The result of the exponentiation
 */		
GV.expVec = (v, inplace=false) => {
	if(inplace) { GV.mapVec(v, Math.exp, true); return; }
	return GV.mapVec(v, Math.exp, false);
}

/**
 * Exponentiates all elements of a matrix or vector
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the exponentiation
 */		
GV.exp = (mv, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.expMat(mv, true); return; }
		return GV.expMat(mv, false);
	} else if(mv.type === 'Vector') {
		if(inplace) { GV.expVec(mv, true); return; }
		return GV.expVec(mv, false);
	}
}

/**
 * Calculates the sum of all elements in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to sum
 * @param {number|null} axis - The axis along which to sum (0 for columns, 1 for rows, null for global sum)
 * @returns {number|Vector} The sum value(s)
 */
GV.sum = (mv, axis = null) => {
	if(mv.type === 'Vector') {
		if(axis !== null) {
			throw new Error('Vector sum operation does not support axis parameter');
		}
		let sum = 0;
		for(let i = 0; i < mv.values.length; i++) {
			sum += mv.values[i];
		}
		return sum;
	} else if(mv.type === 'Matrix') {
		if(axis === null) {
			// Use a single loop for better performance
			let sum = 0;
			const rows = mv.length;
			const cols = mv[0].length;
			for(let i = 0; i < rows; i++) {
				const row = mv[i];
				for(let j = 0; j < cols; j++) {
					sum += row[j];
				}
			}
			return sum;
		} else if(axis === 0) {
			// Pre-allocate result vector
			const sums = new Array(mv[0].length).fill(0);
			const rows = mv.length;
			for(let i = 0; i < rows; i++) {
				for(let j = 0; j < mv[0].length; j++) {
					sums[j] += mv[i][j];
				}
			}
			return new GV.Vector(sums);
		} else if(axis === 1) {
			// Pre-allocate result vector
			const sums = new Array(mv.length).fill(0);
			for(let i = 0; i < mv.length; i++) {
				const row = mv[i];
				for(let j = 0; j < row.length; j++) {
					sums[i] += row[j];
				}
			}
			return new GV.Vector(sums);
		}
	}
}

/**
 * Adds a value to all elements of a matrix or vector
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {number} value - The value to add
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the addition	
 */
GV.add = (mv, value, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => x+value, true); return; }
		return GV.mapMat(mv, (x) => x+value, false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => x+value, true); return; }
		return GV.mapVec(mv, (x) => x+value, false);
	}
}

/**
 * Raises all elements of a matrix or vector to a power
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {number} pow - The power to raise the elements to
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the power operation
 */	
GV.pow = (mv, pow, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => x**pow, true); return; }
		return GV.mapMat(mv, (x) => x**pow, false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => x**pow, true); return; }
		return GV.mapVec(mv, (x) => x**pow, false);
	}
}

/**
 * Scales all elements of a matrix or vector by a given value
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {number} scale - The value to scale the elements by
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the scaling operation	
 */
GV.scale = (mv, scale, inplace=false) => {
	// Check if mv is valid
	if (!mv) {
		console.error('Invalid input to scale function:', mv);
		return null;
	}
	
	// Handle empty matrices
	if (mv.type === 'Matrix' && mv.length > 0 && (!mv[0] || mv[0].length === 0)) {
		console.warn('Empty matrix detected in scale function, returning original matrix');
		return mv;
	}
	
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => x*scale, true); return; }
		return GV.mapMat(mv, (x) => x*scale, false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => x*scale, true); return; }
		return GV.mapVec(mv, (x) => x*scale, false);
	}
}

/**
 * Logs all elements of a matrix or vector
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the logarithm operation
 */	
GV.log = (mv, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => Math.log(x), true); return; }
		return GV.mapMat(mv, (x) => Math.log(x), false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => Math.log(x), true); return; }
		return GV.mapVec(mv, (x) => Math.log(x), false);
	}
}

/**
 * Returns the absolute value of all elements of a matrix or vector
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the absolute value operation
 */		
GV.abs = (mv, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => Math.abs(x), true); return; }
		return GV.mapMat(mv, (x) => Math.abs(x), false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => Math.abs(x), true); return; }
		return GV.mapVec(mv, (x) => Math.abs(x), false);
	}
}

/**
 * Returns one over all elements of a matrix or vector
 * @param {Matrix|Vector} mv - The matrix or vector
 * @param {boolean} [inplace=false] - Whether to modify the matrix or vector in place
 * @returns {Matrix|Vector} The result of the operation
 */	
GV.oneOver = (mv, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => 1/x, true); return; }
		return GV.mapMat(mv, (x) => 1/x, false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => 1/x, true); return; }
		return GV.mapVec(mv, (x) => 1/x, false);
	}
}

/**
 * Inverts a matrix
 * @param {Matrix} m - The matrix to invert
 * @returns {Matrix} The inverse of the matrix
 */	
GV.inverse = async (m) => {

	let augmented = [];

	for(let i = 0; i < m.length; i++) {

		let newRow = new Array(m.length).fill(0);
		newRow[i] = 1;
	
		augmented.push(m[i].slice().concat(newRow));
	}

	for(let i = 0; i < augmented.length; i++) {
		
		let scale = augmented[i][i];
		if(scale === 0) return null;

		GV.scaleVector(augmented[i], 1/scale, true);

		for(let j = 0; j < augmented.length; j++) {

			if(i === j) continue;

			let newScale = augmented[j][i];
			let toSubtract = GV.scaleVector(new GV.Vector(augmented[i]), newScale);
			GV.subtractVector(augmented[j], toSubtract, true);
		}
	}


	let ret = [];
	for(let i = 0; i < m.length; i++) {
		ret.push(augmented[i].slice(m.length, 2*m.length));
	}

	return new GV.Matrix(ret);
}

/**
 * Finds the index of the minimum value in a vector
 * @param {Vector} mv - The vector to find the minimum value in
 * @returns {number} The index of the minimum value
 */	
GV.argmin = (mv) => {
	if(mv.type === 'Vector') {
		let min = mv[0];
		let minIdx = 0;
		for(let i = 0; i < mv.length; i++) {
			if(mv[i] < min) {
				min = mv[i];
				minIdx = i;
			}
		}
		return minIdx;
	}
}

/**
 * Finds the index of the maximum value in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to find the maximum value in
 * @param {number|null} axis - The axis along which to find the maximum value (0 for columns, 1 for rows, null for global maximum)
 * @returns {number|Vector} The index of the maximum value(s)
 */	
GV.argmax = (mv, axis=null) => {
	if (!mv) {
		console.error('GV.argmax: Input is undefined or null');
		return null;
	}
	if (!mv.type) {
		console.error('GV.argmax: Input must be a Vector or Matrix');
		return null;
	}

	if(mv.type === 'Vector') {
		let max = mv[0];
		let maxIdx = 0;
		for(let i = 0; i < mv.length; i++) {
			if(mv[i] > max) {
				max = mv[i];
				maxIdx = i;
			}
		}
		return maxIdx;
	} else if(mv.type === 'Matrix') {
		if (axis === null) {
			// Find global maximum
			let max = mv[0][0];
			let maxIdx = {row: 0, col: 0};
			for(let i = 0; i < mv.length; i++) {
				for(let j = 0; j < mv[0].length; j++) {
					if(mv[i][j] > max) {
						max = mv[i][j];
						maxIdx = {row: i, col: j};
					}
				}
			}
			return maxIdx;
		} else if (axis === 0) {
			// Find maximum along rows (return column indices)
			let maxIndices = [];
			for(let i = 0; i < mv.length; i++) {
				let max = mv[i][0];
				let maxIdx = 0;
				for(let j = 0; j < mv[0].length; j++) {
					if(mv[i][j] > max) {
						max = mv[i][j];
						maxIdx = j;
					}
				}
				maxIndices.push(maxIdx);
			}
			return new GV.Vector(maxIndices);
		} else if (axis === 1) {
			// Find maximum along columns (return row indices)
			let maxIndices = [];
			for(let j = 0; j < mv[0].length; j++) {
				let max = mv[0][j];
				let maxIdx = 0;
				for(let i = 0; i < mv.length; i++) {
					if(mv[i][j] > max) {
						max = mv[i][j];
						maxIdx = i;
					}
				}
				maxIndices.push(maxIdx);
			}
			return new GV.Vector(maxIndices);
		}
	}
	console.error('GV.argmax: Invalid axis parameter or input type');
	return null;
}

/**
 * Randomly permutes the elements of a vector or matrix
 * @param {Vector|Matrix} v - The vector or matrix to permute
 * @param {number|null} axis - The axis along which to permute (0 for rows, 1 for columns, null for all elements)
 * @returns {Vector|Matrix} The permuted vector or matrix
 */	
GV.randomPermutation = (v, axis=null) => {
	// Input validation
	if (!v) {
		console.error('Input is undefined or null');
		return null;
	}
	
	// Handle Vector type
	if (v.type === 'Vector') {
		// Create a copy of the vector to avoid modifying the original
		const result = v.clone();
		
		// Fisher-Yates (Knuth) shuffle algorithm
		for (let i = result.length - 1; i > 0; i--) {
			// Generate a random index between 0 and i (inclusive)
			const j = Math.floor(Math.random() * (i + 1));
			
			// Swap elements
			const temp = result.values[i];
			result.values[i] = result.values[j];
			result.values[j] = temp;
			
			// Update direct properties
			result[i] = result.values[i];
			result[j] = result.values[j];
		}
		
		return result;
	}
	
	// Handle Matrix type
	if (v.type === 'Matrix') {
		// Create a copy of the matrix to avoid modifying the original
		const result = v.clone();
		
		// If axis is null, permute all elements (flatten, shuffle, reshape)
		if (axis === null) {
			// Flatten the matrix
			const flattened = GV.flatten(result);
			
			// Shuffle the flattened vector
			const shuffled = GV.randomPermutation(flattened);
			
			// Reshape back to the original dimensions
			return GV.reshapeMatrix(shuffled, result.length, result[0].length);
		}
		
		// If axis is 0, permute rows
		if (axis === 0) {
			// Fisher-Yates shuffle for rows
			for (let i = result.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				
				// Swap rows
				const temp = result.rows[i];
				result.rows[i] = result.rows[j];
				result.rows[j] = temp;
				
				// Update direct properties
				result[i] = result.rows[i];
				result[j] = result.rows[j];
			}
			
			return result;
		}
		
		// If axis is 1, permute columns
		if (axis === 1) {
			// Fisher-Yates shuffle for columns
			for (let i = result[0].length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				
				// Swap columns
				for (let row = 0; row < result.length; row++) {
					const temp = result.rows[row][i];
					result.rows[row][i] = result.rows[row][j];
					result.rows[row][j] = temp;
					
					// Update direct properties
					result[row][i] = result.rows[row][i];
					result[row][j] = result.rows[row][j];
				}
			}
			
			return result;
		}
		
		console.error('Invalid axis parameter for matrix permutation');
		return result;
	}
	
	console.error('Input must be a Vector or Matrix');
	return null;
}

/**
 * Creates a new matrix or vector from specified indices
 * @param {Matrix|Vector} mv - The matrix or vector to extract elements from
 * @param {Vector} indices - The indices of the elements to extract
 * @param {number|null} axis - The axis along which to extract elements (0 for rows, 1 for columns, null for all elements)
 * @returns {Matrix|Vector} The new matrix or vector with extracted elements	
 */
GV.fromIndices = (mv, indices, axis=null) => {

	if(mv.type === 'Matrix') {

		let newM = [];

		if(axis === null || axis === 0) {
			
			for(let i = 0; i < indices.length; i++) {
				newM.push(mv[i]);
			}
			
		}

		if(axis === 1) {
			
			for(let i = 0; i < mv.length; i++) {
				newM.push([]);
				for(let j = 0; j < indices.length; j++) {
					newM[i].push(mv[i][j]);
				}
			}
		}

		return new GV.Matrix(newM);

	} else if(mv.type === 'Vector') {

		let newV = [];
		for(let i = 0; i < indices.length; i++) {
			newV.push(mv[i]);
		}
		return new GV.Vector(newV);
	}
}

/**
 * Creates a vector of numbers from 0 to n-1
 * @param {number} n - The number of elements in the vector
 * @returns {Vector} The vector of numbers from 0 to n-1
 */	
GV.toN = (n) => new GV.Vector(Array.from(Array(n).keys()));

/**
 * Creates a matrix or vector of zeros with the specified shape
 * @param {...number} shape - The dimensions of the matrix or vector
 * @returns {Matrix|Vector} The matrix or vector of zeros
 */	
GV.zeros = (...shape) => {

	if(shape.length === 0) return new GV.Vector([]);
	if(shape.length === 1) return new GV.Vector(Array(shape[0]).fill(0));
	
	let m = [];
	for(let i = 0; i < shape[0]; i++) {
		m.push(Array(shape[1]).fill(0));
	}

	return new GV.Matrix(m);
}

/**
 * Creates a matrix or vector of ones with the specified shape
 * @param {...number} shape - The dimensions of the matrix or vector
 * @returns {Matrix|Vector} The matrix or vector of ones
 */	
GV.ones = (...shape) => {

	if(shape.length === 0) return new GV.Vector([]);
	if(shape.length === 1) return new GV.Vector(Array(shape[0]).fill(1));

	let m = [];
	for(let i = 0; i < shape[0]; i++) {
		m.push(Array(shape[1]).fill(1));
	}

	return new GV.Matrix(m);
}

/**
 * Scales all elements of a vector
 * @param {Vector} v - The vector to scale
 * @param {number} scale - The value to scale the elements by
 * @param {boolean} [inplace=false] - Whether to modify the vector in place
 * @returns {Vector} The scaled vector	
 */	
GV.scaleVector = (v, scale, inplace=false) => {
	if(inplace) {
		for(let i = 0; i < v.length; i++) {
			v[i] *= scale;
			// No need to update v.values[i] as the proxy will handle it
		}
		return;
	}

	let newV = [];
	for(let i = 0; i < v.length; i++) {
		newV.push(v[i] * scale);
	}
	return new GV.Vector(newV);
}

// ******************* Statistical Functions *********************

/**
 * Calculates the mean of elements in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to calculate mean for
 * @param {number|null} axis - The axis along which to calculate mean (0 for columns, 1 for rows, null for global mean)
 * @returns {number|Vector} The mean value(s)
 */
GV.mean = (mv, axis=null) => {
    if(mv.type === 'Vector') {
        return mv.values.reduce((a, b) => a + b, 0) / mv.values.length;
    } else if(mv.type === 'Matrix') {
        if(axis === null) {
            return mv.rows.flat().reduce((a, b) => a + b, 0) / (mv.rows.length * mv.rows[0].length);
        } else if(axis === 0) {
            const means = new Array(mv.rows[0].length).fill(0);
            for(let i = 0; i < mv.rows.length; i++) {
                for(let j = 0; j < mv.rows[0].length; j++) {
                    means[j] += mv.rows[i][j];
                }
            }
            return new GV.Vector(means.map(m => m / mv.rows.length));
        } else if(axis === 1) {
            const means = new Array(mv.rows.length).fill(0);
            for(let i = 0; i < mv.rows.length; i++) {
                for(let j = 0; j < mv.rows[0].length; j++) {
                    means[i] += mv.rows[i][j];
                }
            }
            return new GV.Vector(means.map(m => m / mv.rows[0].length));
        }
    }
    throw new Error('Unsupported operation');
}

/**
 * Calculates the variance of elements in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to calculate variance for
 * @param {number|null} axis - The axis along which to calculate variance (0 for columns, 1 for rows, null for global variance)
 * @param {number} [ddof=0] - Delta degrees of freedom. The divisor used in calculations is N - ddof, where N represents the number of elements
 * @returns {number|Vector} The variance value(s)
 */
GV.var = (mv, axis = null, ddof = 0) => {
	if(mv.type === 'Vector') {
		if(axis !== null) {
			throw new Error('Vector variance operation does not support axis parameter');
		}
		const n = mv.values.length;
		const meanVal = GV.mean(mv);
		let sumSquaredDiff = 0;
		for(let i = 0; i < n; i++) {
			const diff = mv.values[i] - meanVal;
			sumSquaredDiff += diff * diff;
		}
		return sumSquaredDiff / (n - ddof);
	} else if(mv.type === 'Matrix') {
		if(axis === null) {
			// Global variance
			const meanVal = GV.mean(mv);
			let sumSquaredDiff = 0;
			const rows = mv.length;
			const cols = mv[0].length;
			for(let i = 0; i < rows; i++) {
				for(let j = 0; j < cols; j++) {
					const diff = mv[i][j] - meanVal;
					sumSquaredDiff += diff * diff;
				}
			}
			return sumSquaredDiff / (rows * cols - ddof);
		} else if(axis === 0) {
			// Variance along columns
			const means = GV.mean(mv, 0);
			const rows = mv.length;
			const cols = mv[0].length;
			const variances = new Array(cols);
			for(let j = 0; j < cols; j++) {
				let sumSquaredDiff = 0;
				for(let i = 0; i < rows; i++) {
					const diff = mv[i][j] - means.values[j];
					sumSquaredDiff += diff * diff;
				}
				variances[j] = sumSquaredDiff / (rows - ddof);
			}
			return new GV.Vector(variances);
		} else if(axis === 1) {
			// Variance along rows
			const means = GV.mean(mv, 1);
			const rows = mv.length;
			const cols = mv[0].length;
			const variances = new Array(rows);
			for(let i = 0; i < rows; i++) {
				let sumSquaredDiff = 0;
				for(let j = 0; j < cols; j++) {
					const diff = mv[i][j] - means.values[i];
					sumSquaredDiff += diff * diff;
				}
				variances[i] = sumSquaredDiff / (cols - ddof);
			}
			return new GV.Vector(variances);
		}
	}
}

/**
 * Calculates the standard deviation of elements in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to calculate standard deviation for
 * @param {number|null} axis - The axis along which to calculate standard deviation (0 for columns, 1 for rows, null for global standard deviation)
 * @param {number} [ddof=0] - Delta degrees of freedom. The divisor used in calculations is N - ddof, where N represents the number of elements
 * @returns {number|Vector} The standard deviation value(s)
 */
GV.std = (mv, axis=null, ddof=0) => {
    const variance = GV.var(mv, axis, ddof);
    if(mv.type === 'Vector' || axis === null) {
        return Math.sqrt(variance);
    } else if(mv.type === 'Matrix') {
        if(axis === 0 || axis === 1) {
            return new GV.Vector(variance.values.map(v => Math.sqrt(v)));
        }
    }
    return Math.sqrt(variance);
}

/**
 * Finds the minimum value in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to find the minimum value in
 * @param {number|null} axis - The axis along which to find the minimum (0 for columns, 1 for rows, null for global minimum)
 * @returns {number|Vector} The minimum value(s)
 */
GV.min = (mv, axis = null) => {
	if(mv.type === 'Vector') {
		if(axis !== null) {
			throw new Error('Vector min operation does not support axis parameter');
		}
		let min = mv.values[0];
		for(let i = 1; i < mv.values.length; i++) {
			if(mv.values[i] < min) min = mv.values[i];
		}
		return min;
	} else if(mv.type === 'Matrix') {
		if(axis === null) {
			// Use a single loop for better performance
			let min = mv[0][0];
			const rows = mv.length;
			const cols = mv[0].length;
			for(let i = 0; i < rows; i++) {
				const row = mv[i];
				for(let j = 0; j < cols; j++) {
					if(row[j] < min) min = row[j];
				}
			}
			return min;
		} else if(axis === 0) {
			// Pre-allocate result vector
			const mins = new Array(mv[0].length);
			const rows = mv.length;
			for(let j = 0; j < mv[0].length; j++) {
				mins[j] = mv[0][j];
				for(let i = 1; i < rows; i++) {
					if(mv[i][j] < mins[j]) mins[j] = mv[i][j];
				}
			}
			return new GV.Vector(mins);
		} else if(axis === 1) {
			// Pre-allocate result vector
			const mins = new Array(mv.length);
			for(let i = 0; i < mv.length; i++) {
				mins[i] = mv[i][0];
				const row = mv[i];
				for(let j = 1; j < row.length; j++) {
					if(row[j] < mins[i]) mins[i] = row[j];
				}
			}
			return new GV.Vector(mins);
		}
	}
}

/**
 * Finds the maximum value in a vector or matrix
 * @param {Vector|Matrix} mv - The vector or matrix to find the maximum value in
 * @param {number|null} axis - The axis along which to find the maximum (0 for columns, 1 for rows, null for global maximum)
 * @returns {number|Vector} The maximum value(s)
 */
GV.max = (mv, axis = null) => {
	if(mv.type === 'Vector') {
		if(axis !== null) {
			throw new Error('Vector max operation does not support axis parameter');
		}
		let max = mv.values[0];
		for(let i = 1; i < mv.values.length; i++) {
			if(mv.values[i] > max) max = mv.values[i];
		}
		return max;
	} else if(mv.type === 'Matrix') {
		if(axis === null) {
			// Use a single loop for better performance
			let max = mv[0][0];
			const rows = mv.length;
			const cols = mv[0].length;
			for(let i = 0; i < rows; i++) {
				const row = mv[i];
				for(let j = 0; j < cols; j++) {
					if(row[j] > max) max = row[j];
				}
			}
			return max;
		} else if(axis === 0) {
			// Pre-allocate result vector
			const maxs = new Array(mv[0].length);
			const rows = mv.length;
			for(let j = 0; j < mv[0].length; j++) {
				maxs[j] = mv[0][j];
				for(let i = 1; i < rows; i++) {
					if(mv[i][j] > maxs[j]) maxs[j] = mv[i][j];
				}
			}
			return new GV.Vector(maxs);
		} else if(axis === 1) {
			// Pre-allocate result vector
			const maxs = new Array(mv.length);
			for(let i = 0; i < mv.length; i++) {
				maxs[i] = mv[i][0];
				const row = mv[i];
				for(let j = 1; j < row.length; j++) {
					if(row[j] > maxs[i]) maxs[i] = row[j];
				}
			}
			return new GV.Vector(maxs);
		}
	}
}

// ******************* Linear Algebra *********************

/**
 * Calculates the determinant of a matrix
 * @param {Matrix} m - The matrix to calculate the determinant of
 * @returns {number|null} The determinant of the matrix
 */	
GV.det = (m) => {
    if(m.type !== 'Matrix') {
        console.error('Input must be a Matrix');
        return null;
    }
    
    if(m.length !== m[0].length) {
        console.error('Matrix must be square to calculate determinant');
        return null;
    }
    
    const n = m.length;
    
    // Handle small matrices directly
    if(n === 1) return m[0][0];
    if(n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if(n === 3) {
        return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
               m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
               m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    }

    // Use LU decomposition for larger matrices
    const { L, U } = GV._luDecomposition(m);
    if(!L || !U) return null;
    
    let det = 1;
    for(let i = 0; i < n; i++) {
        det *= U[i][i];
    }
    
    return det;
};

/**
 * Calculates the rank of a matrix
 * @param {Matrix} m - The matrix to calculate the rank of
 * @returns {number} The rank of the matrix
 */	
GV.rank = (m) => {
	// Convert to row echelon form and count non-zero rows
	const ref = GV.rowEchelonForm(m);
	let rank = 0;
	
	for(let i = 0; i < ref.length; i++) {
		let hasNonZero = false;
		for(let j = 0; j < ref[0].length; j++) {
			if(Math.abs(ref[i][j]) > 1e-10) {
				hasNonZero = true;
				break;
			}
		}
		if(hasNonZero) rank++;
	}
	
	return rank;
}

/**
 * Calculates the row echelon form of a matrix
 * @param {Matrix} m - The matrix to calculate the row echelon form of
 * @returns {Matrix} The row echelon form of the matrix
 */	
GV.rowEchelonForm = (m) => {
	// Create a copy of the matrix
	let ref = [];
	for(let i = 0; i < m.length; i++) {
		ref.push([...m[i]]);
	}
	
	const rows = ref.length;
	const cols = ref[0].length;
	
	let lead = 0;
	
	for(let r = 0; r < rows; r++) {
		if(lead >= cols) return ref;
		
		let i = r;
		while(ref[i][lead] === 0) {
			i++;
			if(i === rows) {
				i = r;
				lead++;
				if(lead === cols) return ref;
			}
		}
		
		// Swap rows
		if(i !== r) {
			const temp = ref[i];
			ref[i] = ref[r];
			ref[r] = temp;
		}
		
		// Scale row
		const div = ref[r][lead];
		if(div !== 0) {
			for(let j = 0; j < cols; j++) {
				ref[r][j] /= div;
			}
		}
		
		// Eliminate column
		for(let i = 0; i < rows; i++) {
			if(i !== r) {
				const mult = ref[i][lead];
				for(let j = 0; j < cols; j++) {
					ref[i][j] -= mult * ref[r][j];
				}
			}
		}
		
		lead++;
	}
	
	return ref;
}

/**
 * Calculates the eigenvalues of a matrix using the simple power iteration method
 * @param {Matrix} m - The matrix to calculate the eigenvalues of
 * @param {number} [maxIter=100] - The maximum number of iterations
 * @param {number} [tol=1e-10] - The tolerance for convergence
 * @returns {Vector|null} The eigenvalues of the matrix
 */	
GV.eigenvalues = (m, maxIter=100, tol=1e-10) => {
	if(m.length !== m[0].length) {
		console.error('Matrix must be square to compute eigenvalues');
		return null;
	}
	
	// Start with a random vector
	let v = new GV.Vector(Array(m.length).fill(0).map(() => Math.random()));
	
	// Normalize
	const norm = Math.sqrt(GV.dot(v, v));
	for(let i = 0; i < v.length; i++) {
		v[i] /= norm;
	}
	
	// Power iteration
	for(let iter = 0; iter < maxIter; iter++) {
		// Compute Av
		const Av = GV.mult(m, v);
		
		// Compute eigenvalue
		const lambda = GV.dot(Av, v) / GV.dot(v, v);
		
		// Update eigenvector
		const AvNorm = Math.sqrt(GV.dot(Av, Av));
		for(let i = 0; i < v.length; i++) {
			v[i] = Av[i] / AvNorm;
		}
		
		// Check convergence
		const diff = Math.abs(lambda - (iter > 0 ? prevLambda : lambda));
		if(diff < tol) {
			return lambda;
		}
		
		prevLambda = lambda;
	}
	
	return prevLambda;
}

/**
 * Calculates the trace of a matrix
 * @param {Matrix} m - The matrix to calculate the trace of
 * @returns {number|null} The trace of the matrix
 */	
GV.trace = (m) => {
	if(m.length !== m[0].length) {
		console.error('Matrix must be square to compute trace');
		return null;
	}
	
	let trace = 0;
	for(let i = 0; i < m.length; i++) {
		trace += m[i][i];
	}
	
	return trace;
}

// ******************* Utility Functions *********************

/**
 * Reshapes a vector into a matrix
 * @param {Vector} v - The vector to reshape
 * @param {number} rows - The number of rows in the matrix
 * @param {number} cols - The number of columns in the matrix
 * @returns {Matrix|null} The reshaped matrix
 */	
GV.reshape = (v, rows, cols) => {
	if(v.type !== 'Vector') {
		console.error('Input must be a Vector');
		return null;
	}
	
	if(v.length !== rows * cols) {
		console.error('Vector length must match rows * cols');
		return null;
	}
	
	// Pre-allocate matrix
	const matrix = Array(rows);
	for(let i = 0; i < rows; i++) {
		matrix[i] = new Array(cols);
		for(let j = 0; j < cols; j++) {
			matrix[i][j] = v[i * cols + j];
		}
	}
	
	return new GV.Matrix(matrix);
}

/**
 * Flattens a matrix into a vector
 * @param {Matrix} m - The matrix to flatten
 * @returns {Vector|null} The flattened vector
 */	
GV.flatten = (m) => {
	if(m.type !== 'Matrix') {
		console.error('Input must be a Matrix');
		return null;
	}
	
	// Pre-allocate vector
	const vector = new Array(m.length * m[0].length);
	let idx = 0;
	
	for(let i = 0; i < m.length; i++) {
		const row = m[i];
		for(let j = 0; j < row.length; j++) {
			vector[idx++] = row[j];
		}
	}
	
	return new GV.Vector(vector);
}

/**
 * Concatenates vectors or matrices
 * @param {Vector|Matrix} a - The first input
 * @param {Vector|Matrix} b - The second input
 * @param {number} [axis=0] - The axis along which to concatenate (0 for rows, 1 for columns)
 * @returns {Vector|Matrix|null} The concatenated vector or matrix
 */	
GV.concat = (a, b, axis=0) => {
	if(a.type !== b.type) {
		console.error('Both inputs must be of the same type');
		return null;
	}
	
	if(a.type === 'Vector') {
		// Pre-allocate result vector
		const result = new Array(a.length + b.length);
		for(let i = 0; i < a.length; i++) {
			result[i] = a[i];
		}
		for(let i = 0; i < b.length; i++) {
			result[i + a.length] = b[i];
		}
		return new GV.Vector(result);
	} else if(a.type === 'Matrix') {
		if(axis === 0) {
			// Concatenate vertically (stack rows)
			if(a[0].length !== b[0].length) {
				console.error('Matrices must have the same number of columns to concatenate vertically');
				return null;
			}
			
			// Pre-allocate result matrix
			const result = Array(a.length + b.length);
			let idx = 0;
			
			// Copy first matrix
			for(let i = 0; i < a.length; i++) {
				result[idx++] = [...a[i]];
			}
			
			// Copy second matrix
			for(let i = 0; i < b.length; i++) {
				result[idx++] = [...b[i]];
			}
			
			return new GV.Matrix(result);
		} else if(axis === 1) {
			// Concatenate horizontally (stack columns)
			if(a.length !== b.length) {
				console.error('Matrices must have the same number of rows to concatenate horizontally');
				return null;
			}
			
			// Pre-allocate result matrix
			const result = Array(a.length);
			const totalCols = a[0].length + b[0].length;
			
			for(let i = 0; i < a.length; i++) {
				result[i] = new Array(totalCols);
				let colIdx = 0;
				
				// Copy first matrix row
				for(let j = 0; j < a[0].length; j++) {
					result[i][colIdx++] = a[i][j];
				}
				
				// Copy second matrix row
				for(let j = 0; j < b[0].length; j++) {
					result[i][colIdx++] = b[i][j];
				}
			}
			
			return new GV.Matrix(result);
		}
	}
}

/**
 * Creates a diagonal matrix from a vector
 * @param {Vector} v - The vector to create the diagonal matrix from
 * @returns {Matrix|null} The diagonal matrix
 */	
GV.diag = (v) => {
	if(v.type !== 'Vector') {
		console.error('Input must be a Vector');
		return null;
	}
	
	// Pre-allocate matrix
	const matrix = Array(v.length);
	for(let i = 0; i < v.length; i++) {
		matrix[i] = new Array(v.length).fill(0);
		matrix[i][i] = v[i];
	}
	
	return new GV.Matrix(matrix);
}

/**
 * Extracts the diagonal from a matrix
 * @param {Matrix} m - The matrix to extract the diagonal from
 * @returns {Vector|null} The diagonal of the matrix
 */	
GV.diagonal = (m) => {
	if(m.type !== 'Matrix') {
		console.error('Input must be a Matrix');
		return null;
	}
	
	if(m.length !== m[0].length) {
		console.error('Matrix must be square to extract diagonal');
		return null;
	}
	
	// Pre-allocate vector
	const diagonal = new Array(m.length);
	for(let i = 0; i < m.length; i++) {
		diagonal[i] = m[i][i];
	}
	
	return new GV.Vector(diagonal);
}

/**
 * Creates an identity matrix
 * @param {number} n - The size of the identity matrix
 * @returns {Matrix|null} The identity matrix
 */	
GV.eye = (n) => {
	// Pre-allocate matrix
	const matrix = Array(n);
	for(let i = 0; i < n; i++) {
		matrix[i] = new Array(n).fill(0);
		matrix[i][i] = 1;
	}
	
	return new GV.Matrix(matrix);
}

/**
 * Creates a random matrix with values between 0 and 1
 * @param {...number} shape - The dimensions of the matrix
 * @returns {Matrix|null} The random matrix
 */	
GV.rand = (...shape) => {
	if(shape.length === 0) return new GV.Vector([Math.random()]);
	if(shape.length === 1) {
		// Pre-allocate vector
		const vector = new Array(shape[0]);
		for(let i = 0; i < shape[0]; i++) {
			vector[i] = Math.random();
		}
		return new GV.Vector(vector);
	}
	
	// Pre-allocate matrix
	const matrix = Array(shape[0]);
	for(let i = 0; i < shape[0]; i++) {
		matrix[i] = new Array(shape[1]);
		for(let j = 0; j < shape[1]; j++) {
			matrix[i][j] = Math.random();
		}
	}
	
	return new GV.Matrix(matrix);
}

/**
 * Creates a random matrix with values from a normal distribution
 * @param {...number} shape - The dimensions of the matrix
 * @returns {Matrix|null} The random matrix
 */	
GV.randn = (...shape) => {

	const normal = () => {
		const u1 = Math.random();
		const u2 = Math.random();
		return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	};
	
	if(shape.length === 0) return new GV.Vector([normal()]);
	if(shape.length === 1) {
		// Pre-allocate vector
		const vector = new Array(shape[0]);
		for(let i = 0; i < shape[0]; i++) {
			vector[i] = normal();
		}
		return new GV.Vector(vector);
	}
	
	// Pre-allocate matrix
	const matrix = Array(shape[0]);
	for(let i = 0; i < shape[0]; i++) {
		matrix[i] = new Array(shape[1]);
		for(let j = 0; j < shape[1]; j++) {
			matrix[i][j] = normal();
		}
	}
	
	return new GV.Matrix(matrix);
}

/**
 * Reshapes a matrix into a different shape
 * @param {Matrix} m - The matrix to reshape
 * @param {number} rows - The number of rows in the new shape
 * @param {number} cols - The number of columns in the new shape
 * @returns {Matrix|null} The reshaped matrix
 */	
GV.reshapeMatrix = (m, rows, cols) => {
	if(m.type !== 'Matrix') {
		console.error('Input must be a Matrix');
		return null;
	}
	
	// Calculate total elements
	const totalElements = m.length * m[0].length;
	
	if(totalElements !== rows * cols) {
		console.error('Matrix size must match rows * cols');
		return null;
	}
	
	// Flatten the matrix first
	let flattened = [];
	for(let i = 0; i < m.length; i++) {
		for(let j = 0; j < m[0].length; j++) {
			flattened.push(m[i][j]);
		}
	}
	
	// Create new matrix with desired shape
	let newMatrix = [];
	for(let i = 0; i < rows; i++) {
		let row = [];
		for(let j = 0; j < cols; j++) {
			row.push(flattened[i * cols + j]);
		}
		newMatrix.push(row);
	}
	
	return new GV.Matrix(newMatrix);
}

/**
 * Element-wise equality comparison between arrays
 * @param {Vector|Matrix} a - The first input
 * @param {Vector|Matrix} b - The second input
 * @returns {Matrix|Vector|null} The result of the comparison
 */	
GV.equal = (a, b) => {
    if (!a || !b) {
        console.error('GV.equal: One or both inputs are undefined or null');
        return null;
    }
    if (!a.type || !b.type) {
        console.error('GV.equal: Both inputs must be Vectors or Matrices');
        return null;
    }
    if (a.type === 'Matrix' && b.type === 'Matrix') {
        return new GV.Matrix(a.values.map((row, i) => 
            row.map((val, j) => val === b.values[i][j] ? 1 : 0)
        ));
    } else if (a.type === 'Vector' && b.type === 'Vector') {
        return new GV.Vector(a.values.map((val, i) => val === b.values[i] ? 1 : 0));
    } else {
        console.error('GV.equal: Incompatible types for comparison');
        return null;
    }
};

/**
 * Transposes a matrix
 * @param {Matrix} m - The matrix to transpose
 * @returns {Matrix|null} The transposed matrix
 */	
GV.transpose = (m) => {
    if(m.type !== 'Matrix') {
        console.error('Input must be a Matrix');
        return null;
    }
    
    const rows = m[0].length;
    const cols = m.length;
    
    // Pre-allocate transposed matrix
    const transposed = Array(rows);
    for(let i = 0; i < rows; i++) {
        transposed[i] = new Array(cols);
        for(let j = 0; j < cols; j++) {
            transposed[i][j] = m[j][i];
        }
    }
    
    return new GV.Matrix(transposed);
}

/**
 * Performs LU decomposition on a matrix
 * @param {Matrix} m - The matrix to decompose
 * @returns {Object|null} The LU decomposition of the matrix
 */	
GV._luDecomposition = (m) => {
    const n = m.length;
    const L = Array(n);
    const U = Array(n);
    
    // Initialize matrices
    for(let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
        U[i] = new Array(n).fill(0);
        L[i][i] = 1; // L is unit lower triangular
    }
    
    // Perform LU decomposition
    for(let i = 0; i < n; i++) {
        // Calculate U elements
        for(let j = i; j < n; j++) {
            let sum = 0;
            for(let k = 0; k < i; k++) {
                sum += L[i][k] * U[k][j];
            }
            U[i][j] = m[i][j] - sum;
        }
        
        // Calculate L elements
        for(let j = i + 1; j < n; j++) {
            let sum = 0;
            for(let k = 0; k < i; k++) {
                sum += L[j][k] * U[k][i];
            }
            L[j][i] = (m[j][i] - sum) / U[i][i];
        }
    }
    
    return { L, U };
}

/**
 * Calculates the inverse of a matrix
 * @param {Matrix} m - The matrix to calculate the inverse of
 * @returns {Matrix|null} The inverse of the matrix
 */	
GV.inv = (m) => {
    if(m.type !== 'Matrix') {
        console.error('Input must be a Matrix');
        return null;
    }
    
    if(m.length !== m[0].length) {
        console.error('Matrix must be square to calculate inverse');
        return null;
    }
    
    const n = m.length;
    const det = GV.det(m);
    
    if(Math.abs(det) < 1e-10) {
        console.error('Matrix is singular (determinant is zero)');
        return null;
    }
    
    // For small matrices, use direct formula
    if(n === 2) {
        const invDet = 1 / det;
        return new GV.Matrix([
            [m[1][1] * invDet, -m[0][1] * invDet],
            [-m[1][0] * invDet, m[0][0] * invDet]
        ]);
    }
    
    // For larger matrices, use LU decomposition
    const { L, U } = GV._luDecomposition(m);
    if(!L || !U) return null;
    
    // Solve L * Y = I and U * X = Y
    const I = GV.eye(n);
    const Y = Array(n);
    const X = Array(n);
    
    // Forward substitution (L * Y = I)
    for(let i = 0; i < n; i++) {
        Y[i] = new Array(n);
        for(let j = 0; j < n; j++) {
            let sum = 0;
            for(let k = 0; k < i; k++) {
                sum += L[i][k] * Y[k][j];
            }
            Y[i][j] = I[i][j] - sum;
        }
    }
    
    // Back substitution (U * X = Y)
    for(let i = n - 1; i >= 0; i--) {
        X[i] = new Array(n);
        for(let j = 0; j < n; j++) {
            let sum = 0;
            for(let k = i + 1; k < n; k++) {
                sum += U[i][k] * X[k][j];
            }
            X[i][j] = (Y[i][j] - sum) / U[i][i];
        }
    }
    
    return new GV.Matrix(X);
};

/**
 * Creates a worker for parallel matrix operations
 * @returns {Worker|null} The worker
 */	
GV._createWorker = () => {
    const workerCode = `
        import { parentPort } from 'worker_threads';
        
        parentPort.on('message', function(data) {
            try {
                const { operation, data: operationData } = data;
                
                switch(operation) {
                    case 'matrixMultiply':
                        const result = _parallelMatrixMultiply(operationData.a, operationData.b, operationData.startRow, operationData.endRow);
                        parentPort.postMessage({ type: 'result', data: result });
                        break;
                        
                    case 'determinant':
                        const det = _parallelDeterminant(operationData.matrix, operationData.startRow, operationData.endRow);
                        parentPort.postMessage({ type: 'result', data: det });
                        break;
                        
                    case 'inverse':
                        const inv = _parallelInverse(operationData.matrix, operationData.startRow, operationData.endRow);
                        parentPort.postMessage({ type: 'result', data: inv });
                        break;
                        
                    default:
                        throw new Error(\`Unknown operation: \${operation}\`);
                }
            } catch (error) {
                parentPort.postMessage({ type: 'error', error: error.message });
            }
        });
        
        function _parallelMatrixMultiply(a, b, startRow, endRow) {
            if (!Array.isArray(a) || !Array.isArray(b) || !Array.isArray(a[0]) || !Array.isArray(b[0])) {
                throw new Error('Invalid matrix format');
            }
            if (a[0].length !== b.length) {
                throw new Error('Matrix dimensions do not match for multiplication');
            }
            
            const result = [];
            for(let i = startRow; i < endRow; i++) {
                result[i - startRow] = [];
                for(let j = 0; j < b[0].length; j++) {
                    let sum = 0;
                    for(let k = 0; k < a[0].length; k++) {
                        sum += a[i][k] * b[k][j];
                    }
                    result[i - startRow][j] = sum;
                }
            }
            return result;
        }
        
        function _parallelDeterminant(matrix, startRow, endRow) {
            if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) {
                throw new Error('Invalid matrix format');
            }
            if (matrix.length !== matrix[0].length) {
                throw new Error('Matrix must be square to calculate determinant');
            }
            
            if(endRow - startRow === 1) return matrix[startRow][startRow];
            if(endRow - startRow === 2) {
                return matrix[startRow][startRow] * matrix[startRow + 1][startRow + 1] -
                       matrix[startRow][startRow + 1] * matrix[startRow + 1][startRow];
            }
            
            let det = 0;
            for(let j = startRow; j < endRow; j++) {
                const submatrix = [];
                for(let i = startRow + 1; i < endRow; i++) {
                    const row = [];
                    for(let k = startRow; k < endRow; k++) {
                        if(k !== j) row.push(matrix[i][k]);
                    }
                    submatrix.push(row);
                }
                const cofactor = matrix[startRow][j] * _parallelDeterminant(submatrix, 0, submatrix.length);
                det += (j % 2 === 0 ? 1 : -1) * cofactor;
            }
            return det;
        }
        
        function _parallelInverse(matrix, startRow, endRow) {
            if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) {
                throw new Error('Invalid matrix format');
            }
            if (matrix.length !== matrix[0].length) {
                throw new Error('Matrix must be square to calculate inverse');
            }
            
            const n = endRow - startRow;
            const result = Array(n).fill(0).map(() => Array(n).fill(0));
            
            // Forward elimination
            for(let i = 0; i < n; i++) {
                let maxRow = i;
                for(let j = i + 1; j < n; j++) {
                    if(Math.abs(matrix[startRow + j][startRow + i]) > 
                       Math.abs(matrix[startRow + maxRow][startRow + i])) {
                        maxRow = j;
                    }
                }
                
                if(maxRow !== i) {
                    [matrix[startRow + i], matrix[startRow + maxRow]] = 
                    [matrix[startRow + maxRow], matrix[startRow + i]];
                }
                
                const pivot = matrix[startRow + i][startRow + i];
                if (Math.abs(pivot) < 1e-10) {
                    throw new Error('Matrix is singular or nearly singular');
                }
                
                for(let j = i + 1; j < n; j++) {
                    const factor = matrix[startRow + j][startRow + i] / pivot;
                    for(let k = i; k < n; k++) {
                        matrix[startRow + j][startRow + k] -= factor * 
                        matrix[startRow + i][startRow + k];
                    }
                }
            }
            
            // Back substitution
            for(let i = n - 1; i >= 0; i--) {
                for(let j = i + 1; j < n; j++) {
                    for(let k = 0; k < n; k++) {
                        result[i][k] -= matrix[startRow + i][startRow + j] * result[j][k];
                    }
                }
                for(let k = 0; k < n; k++) {
                    result[i][k] /= matrix[startRow + i][startRow + i];
                }
            }
            
            return result;
        }
    `;
    
    const workerPath = `${__dirname}/workers/worker.js`;
    writeFileSync(workerPath, workerCode);
    return new Worker(workerPath, { type: 'module' });
};

/**
 * Parallel matrix multiplication
 * @param {Matrix} a - The first matrix
 * @param {Matrix} b - The second matrix
 * @returns {Matrix|null} The result of the multiplication
 */	
GV._parallelMatrixMultiply = async (a, b) => {
    const numWorkers = cpus().length;
    const rowsPerWorker = Math.ceil(a.length / numWorkers);
    const workers = [];
    const results = [];
    
    return new Promise((resolve, reject) => {
        let completedWorkers = 0;
        
        for(let i = 0; i < numWorkers; i++) {
            const startRow = i * rowsPerWorker;
            const endRow = Math.min(startRow + rowsPerWorker, a.length);
            
            if(startRow >= a.length) break;
            
            const worker = GV._createWorker();
            workers.push(worker);
            
            worker.on('error', (error) => {
                workers.forEach(w => w.terminate());
                reject(error);
            });
            
            worker.on('message', (e) => {
                if (e.type === 'error') {
                    workers.forEach(w => w.terminate());
                    reject(new Error(e.error));
                } else if (e.type === 'result') {
                    results.push(...e.data);
                    completedWorkers++;
                    
                    if(completedWorkers === workers.length) {
                        workers.forEach(w => w.terminate());
                        resolve(new GV.Matrix(results));
                    }
                }
            });
            
            worker.postMessage({
                operation: 'matrixMultiply',
                data: { a, b, startRow, endRow }
            });
        }
    });
};

/**
 * Calculates the determinant of a matrix
 * @param {Matrix} m - The matrix to calculate the determinant of
 * @returns {number|null} The determinant of the matrix
 */	
GV.det = (m) => {
    if(m.type !== 'Matrix') {
        console.error('Input must be a Matrix');
        return null;
    }
    
    if(m.length !== m[0].length) {
        console.error('Matrix must be square to calculate determinant');
        return null;
    }
    
    const n = m.length;
    
    // Handle small matrices directly
    if(n === 1) return m[0][0];
    if(n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if(n === 3) {
        return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
               m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
               m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    }
    
    const numWorkers = cpus().length;
    const rowsPerWorker = Math.ceil(n / numWorkers);
    const workers = [];
    const results = [];
    
    return new Promise((resolve, reject) => {
        let completedWorkers = 0;
        
        for(let i = 0; i < numWorkers; i++) {
            const startRow = i * rowsPerWorker;
            const endRow = Math.min(startRow + rowsPerWorker, n);
            
            if(startRow >= n) break;
            
            const worker = GV._createWorker();
            workers.push(worker);
            
            worker.on('error', (error) => {
                workers.forEach(w => w.terminate());
                reject(error);
            });
            
            worker.on('message', (e) => {
                if (e.type === 'error') {
                    workers.forEach(w => w.terminate());
                    reject(new Error(e.error));
                } else if (e.type === 'result') {
                    results.push(e.data);
                    completedWorkers++;
                    
                    if(completedWorkers === workers.length) {
                        workers.forEach(w => w.terminate());
                        resolve(results.reduce((a, b) => a + b, 0));
                    }
                }
            });
            
            worker.postMessage({
                operation: 'determinant',
                data: { matrix: m, startRow, endRow }
            });
        }
    });
};

/**
 * Calculates the inverse of a matrix
 * @param {Matrix} m - The matrix to calculate the inverse of
 * @returns {Matrix|null} The inverse of the matrix
 */	
GV.inv = (m) => {
    if(m.type !== 'Matrix') {
        console.error('Input must be a Matrix');
        return null;
    }
    
    if(m.length !== m[0].length) {
        console.error('Matrix must be square to calculate inverse');
        return null;
    }
    
    const n = m.length;
    const det = GV.det(m);
    
    if(Math.abs(det) < 1e-10) {
        console.error('Matrix is singular (determinant is zero)');
        return null;
    }
    
    // For small matrices, use direct formula
    if(n === 2) {
        const invDet = 1 / det;
        return new GV.Matrix([
            [m[1][1] * invDet, -m[0][1] * invDet],
            [-m[1][0] * invDet, m[0][0] * invDet]
        ]);
    }
    
    const numWorkers = cpus().length;
    const rowsPerWorker = Math.ceil(n / numWorkers);
    const workers = [];
    const results = [];
    
    return new Promise((resolve, reject) => {
        let completedWorkers = 0;
        
        for(let i = 0; i < numWorkers; i++) {
            const startRow = i * rowsPerWorker;
            const endRow = Math.min(startRow + rowsPerWorker, n);
            
            if(startRow >= n) break;
            
            const worker = GV._createWorker();
            workers.push(worker);
            
            worker.on('error', (error) => {
                workers.forEach(w => w.terminate());
                reject(error);
            });
            
            worker.on('message', (e) => {
                if (e.type === 'error') {
                    workers.forEach(w => w.terminate());
                    reject(new Error(e.error));
                } else if (e.type === 'result') {
                    results.push(...e.data);
                    completedWorkers++;
                    
                    if(completedWorkers === workers.length) {
                        workers.forEach(w => w.terminate());
                        resolve(new GV.Matrix(results));
                    }
                }
            });
            
            worker.postMessage({
                operation: 'inverse',
                data: { matrix: m, startRow, endRow }
            });
        }
    });
};

/**
 * Adds a vector to a matrix
 * @param {Matrix} m - The matrix to add the vector to
 * @param {Vector} v - The vector to add
 * @param {boolean} [inplace=false] - Whether to modify the matrix in place
 * @returns {Matrix|null} The result of the addition
 */	
GV.addMatrixVector = (m, v, inplace=false) => {
    if (!m || !v || m.type !== 'Matrix' || v.type !== 'Vector') {
        console.error('Invalid inputs to addMatrixVector:', { m, v });
        return null;
    }
    
    if (m.length !== v.length) {
        console.error('Matrix rows must match vector length for addition');
        return null;
    }
    
    if(inplace) {
        for(let i = 0; i < m.length; i++) {
            for(let j = 0; j < m[0].length; j++) {
                m[i][j] += v[i];
            }
        }
        return;
    }

    let newM = [];
    for(let i = 0; i < m.length; i++) {
        newM.push([]);
        for(let j = 0; j < m[0].length; j++) {
            newM[i].push(m[i][j] + v[i]);
        }
    }
    return new GV.Matrix(newM);
}

/**
 * Subtracts a vector from a matrix
 * @param {Matrix} m - The matrix to subtract the vector from
 * @param {Vector} v - The vector to subtract
 * @param {boolean} [inplace=false] - Whether to modify the matrix in place
 * @returns {Matrix|null} The result of the subtraction
 */	
GV.subtractMatrixVector = (m, v, inplace=false) => {
    if (!m || !v || m.type !== 'Matrix' || v.type !== 'Vector') {
        console.error('Invalid inputs to subtractMatrixVector:', { m, v });
        return null;
    }
    
    const rows = m.length;
    const cols = m[0].length;
    
    if (v.length !== cols) {
        console.error('Vector length must match matrix columns for column-wise subtraction');
        return null;
    }
    
    if(inplace) {
        for(let i = 0; i < rows; i++) {
            for(let j = 0; j < cols; j++) {
                m[i][j] -= v[j];  // Subtract from each column
            }
        }
        return m;
    }

    let newM = [];
    for(let i = 0; i < rows; i++) {
        newM.push([]);
        for(let j = 0; j < cols; j++) {
            newM[i].push(m[i][j] - v[j]);  // Subtract from each column
        }
    }
    return new GV.Matrix(newM);
}

/**
 * Multiplies a matrix by a vector
 * @param {Matrix} m - The matrix to multiply
 * @param {Vector} v - The vector to multiply
 * @param {boolean} [inplace=false] - Whether to modify the matrix in place
 * @returns {Matrix|null} The result of the multiplication
 */	
GV.multiplyMatrixVector = (m, v, inplace=false) => {
    if (!m || !v || m.type !== 'Matrix' || v.type !== 'Vector') {
        console.error('Invalid inputs to multiplyMatrixVector:', { m, v });
        return null;
    }
    
    if (m.length !== v.length) {
        console.error('Matrix rows must match vector length for multiplication');
        return null;
    }
    
    if(inplace) {
        for(let i = 0; i < m.length; i++) {
            for(let j = 0; j < m[0].length; j++) {
                m[i][j] *= v[i];
            }
        }
        return;
    }

    let newM = [];
    for(let i = 0; i < m.length; i++) {
        newM.push([]);
        for(let j = 0; j < m[0].length; j++) {
            newM[i].push(m[i][j] * v[i]);
        }
    }
    return new GV.Matrix(newM);
}

/**
 * Divides a matrix by a vector
 * @param {Matrix} m - The matrix to divide
 * @param {Vector} v - The vector to divide
 * @param {boolean} [inplace=false] - Whether to modify the matrix in place
 * @returns {Matrix|null} The result of the division
 */	
GV.divideMatrixVector = (m, v, inplace=false) => {
    if (!m || !v || m.type !== 'Matrix' || v.type !== 'Vector') {
        console.error('Invalid inputs to divideMatrixVector:', { m, v });
        return null;
    }
    
    const rows = m.length;
    const cols = m[0].length;
    
    if (v.length !== cols) {
        console.error('Vector length must match matrix columns for column-wise division');
        return null;
    }
    
    // Check for division by zero
    for(let i = 0; i < v.length; i++) {
        if(v[i] === 0) {
            console.error('Division by zero detected in vector');
            return null;
        }
    }
    
    if(inplace) {
        for(let i = 0; i < rows; i++) {
            for(let j = 0; j < cols; j++) {
                m[i][j] /= v[j];  // Divide each column
            }
        }
        return m;
    }

    let newM = [];
    for(let i = 0; i < rows; i++) {
        newM.push([]);
        for(let j = 0; j < cols; j++) {
            newM[i].push(m[i][j] / v[j]);  // Divide each column
        }
    }
    return new GV.Matrix(newM);
}

export default GV;