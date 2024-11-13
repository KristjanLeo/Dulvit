const GV = {};


// ******************* Vector *********************
GV.VectorPrototype = {
	[Symbol.iterator]: function* () {
		for(let i = 0; i < this.values.length; i++) {
			yield this.values[i];
		}
	}
}
GV.Vector = function(values) {
	
	if(values.constructor.name !== 'Array') return null;

	this.type = 'Vector';
	this.values = values;

	for(let i = 0; i < values.length; i++) {
		this[i] = values[i];
	}

	this.toString = () => {
		return '[' + this.values.toString() + ']';
	}

	this.map = (f, inplace=false) => {
		if(!inplace) return this.values.map(i => f(i));
		this.values = this.values.map(i => f(i));
	}
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




// ******************* Matrix *********************
GV.MatrixPrototype = {
	[Symbol.iterator]: function* () {
		for(let i = 0; i < this.rows.length; i++) {
			yield this.rows[i];
		}
	}
}
GV.Matrix = function(rows) {

	if(rows.constructor.name !== 'Array') return null;

	this.type = 'Matrix';
	this.rows = rows;

	for(let i = 0; i < rows.length; i++) {
		this[i] = rows[i];
	}

	this.toString = () => {
		let str = '[';
		for(i in rows) str += '[' + rows[i].toString() + '],';
		str = str.slice(0, str.length-1) + ']';
		return str;
	}
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
			if (this.rows.length === 0) return `(0)`;
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

/* (n x k) * (k x m) = (n x m) */
GV._matMult = (a, b) => {

	if(a[0].length !== b.length) {
		console.error('shapes do not match for matrix multiplication');
		throw Error;
		return a;
	}

	let c = [];
	for(let i = 0; i < a.length; i++) {
		c.push([]);
		for(let j = 0; j < b[0].length; j++) {
			c[i][j] = 0;
			for(let k = 0; k < b.length; k++) {
				c[i][j] += a[i][k]*b[k][j];
			}
		}
	}
	return new GV.Matrix(c);
}

GV._vecMult = (a, b) => {
	return GV.dot(a, b);
} 

/* (n x m) x (m) = (n) */
GV._matVecMult = (a, b) => {

	let c = [];

	for(let i = 0; i < a.length; i++) {
		c.push(0);
		for(let j = 0; j < b.length; j++) {
			c[i] += a[i][j] * b[j];
		}
	}

	return new GV.Vector(c);
}

GV._vecMatMult = (a, b) => {
	return a;
}


GV.mult = (...args) => {
	
	if(args.length === 0) return null;
	if(args.length === 1) return args[1];

	let m = args[0];
	for(let i = 1; i < args.length; i++) {
		
		if(args[i].type === 'Matrix' && m.type === 'Matrix') {
			m = GV._matMult(m, args[i]);
		}

		if(args[i].type === 'Vector' && m.type === 'Vector') {
			m = GV._vecMult(m, args[i]);
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


GV.dot = (a, b) => {
	
	if(a.type !== 'Vector' || b.type !== 'Vector') {
		console.error('Items must be of type Vector.');
		return null;
	}

	let sum = 0;
	for(let i = 0; i < a.length; i++) {
		sum += a[i]*b[i];
	}

	return sum;
}

GV.subtractVector = (a, b, inplace=false) => {

	if(inplace) {
		for(let i = 0; i < a.length; i++) {
			a[i] -= b[i];
			a.values[i] -= b[i];
		}
		return;
	}

	let newV = [];
	for(let i = 0; i < a.length; i++) newV.push(a[i]-b[i]);
	return new Vector(newV);
}

GV.multiplyVector = (a, b, inplace=false) => {

	if(inplace) {
		for(let i = 0; i < a.length; i++) {
			a[i] *= b[i];
			a.values[i] *= b[i];
		}
		return;
	}

	let newV = [];
	for(let i = 0; i < a.length; i++) newV.push(a[i]*b[i]);
	return new Vector(newV);
}

GV.subtractMatrix = (m1, m2, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m1.length; i++) {
			for(let j = 0; j < m1[0].length; j++) {
				m1[i][j] -= m2[i][j];
				m1.rows[i][j] -= m2[i][j];
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
	return new Matrix(newM);
}

GV.addMatrix = (m1, m2, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m1.length; i++) {
			for(let j = 0; j < m1[0].length; j++) {
				m1[i][j] += m2[i][j];
				m1.rows[i][j] += m2[i][j];
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
	return new Matrix(newM);
}

GV.multiplyMatrix = (m1, m2, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m1.length; i++) {
			for(let j = 0; j < m1[0].length; j++) {
				m1[i][j] *= m2[i][j];
				m1.rows[i][j] *= m2[i][j];
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
	return new Matrix(newM);
}

GV.multiplyMatrixVector = (m, v, inplace=false) => {
	
	if(inplace) {
		for(let i = 0; i < m.length; i++) {
			for(let j = 0; j < m[0].length; j++) {
				m[i][j] *= v[i];
				m.rows[i][j] *= v[i];
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
	return new Matrix(newM);
}

GV.mapMat = (m, f, inplace=false) => {
	if(inplace) {
		for(let i = 0; i < m.length; i++) {
			m[i] = m[i].map((i) => f(i));
			m.rows[i] = m[i];
		}
		return;
	}

	let newM = [];
	for(let i = 0; i < m.length; i++) {
		newM.push(m[i].map((i) => f(i)));
	}
	return new Matrix(newM);
}

GV.mapVec = (v, f, inplace=false) => {
	if(inplace) {
		v.values = v.values.map((i) => f(i));
		for(let i = 0; i < v.length; i++) {
			v[i] = f(v[i]);
		}
		return;
	}
	return new Vector(v.values.map((i) => f(i)));
}

GV.expMat = (m, inplace=false) => {
	if(inplace) { GV.mapMat(m, Math.exp, true); return; }
	return GV.mapMat(m, Math.exp, false);
}

GV.expVec = (v, inplace=false) => {
	if(inplace) { GV.mapVec(v, Math.exp, true); return; }
	return GV.mapVec(v, Math.exp, false);
}

GV.exp = (mv, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.expMat(mv, true); return; }
		return GV.expMat(mv, false);
	} else if(mv.type === 'Vector') {
		if(inplace) { GV.expVec(mv, true); return; }
		return GV.expVec(mv, false);
	}
}

GV.sum = (mv, axis=null) => {

	// TODO: map reduce

	if(mv.type === 'Matrix') {

		if(axis === null) {
			let sum = 0;
			for(let i = 0; i < mv.length; i++) {
				for(let j = 0; j < mv[0].length; j++) {
					sum += mv[i][j];
				}
			}
			return sum;
		}

		if(axis === 0) {
			let sums = [];
			for(let i = 0; i < mv.length; i++) {
				sums.push(0);
				for(let j = 0; j < mv[0].length; j++) {
					sums[i] += mv[i][j];
				}
			}
			return new GV.Vector(sums);
		}

		if(axis === 1) {
			let sums = [];
			for(let i = 0; i < mv[0].length; i++) {
				sums.push(0);
				for(let j = 0; j < mv.length; j++) {
					sums[i] += mv[j][i];
				}
			}
			return new GV.Vector(sums);
		}

	} else if(mv.type === 'Vector') {
		return mv.values.reduce((a,b) => a+b, 0);
	}
}

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

GV.scale = (mv, scale, inplace=false) => {
	if(mv.type === 'Matrix') {
		if(inplace) { GV.mapMat(mv, (x) => x*scale, true); return; }
		return GV.mapMat(mv, (x) => x*scale, false);
	}
	if(mv.type === 'Vector') {
		if(inplace) { GV.mapVec(mv, (x) => x*scale, true); return; }
		return GV.mapVec(mv, (x) => x*scale, false);
	}
}

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

GV.inverse = (m) => {

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

GV.argmax = (mv) => {
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
	}
}

GV.randomPermutation = (v) => {
	
	let idx = 0;
	
	for(let i = 0; i < v.length; i++) {

		let newIdx = parseInt(Math.random()*v.length);

		let t = v[idx];
		v[idx] = v[newIdx];
		v[newIdx] = t;

		idx = newIdx;
	}
}

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

		return new Matrix(newM);

	} else if(mv.type === 'Vector') {

		let newV = [];
		for(let i = 0; i < indices.length; i++) {
			newV.push(mv[i]);
		}
		return newV;
	}
}

GV.toN = (n) => new Vector(Array.from(Array(n).keys()));

GV.zeros = (...shape) => {

	if(shape.length === 0) return new Vector([]);
	if(shape.length === 1) return new Vector(Array(shape[0]).fill(0));
	
	let m = [];
	for(let i = 0; i < shape[0]; i++) {
		m.push(Array(shape[1]).fill(0));
	}

	return new Matrix(m);
}

GV.ones = (...shape) => {

	if(shape.length === 0) return new Vector([]);
	if(shape.length === 1) return new Vector(Array(shape[0]).fill(1));

	let m = [];
	for(let i = 0; i < shape[0]; i++) {
		m.push(Array(shape[1]).fill(1));
	}

	return new Matrix(m);
}