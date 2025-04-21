
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
                        throw new Error(`Unknown operation: ${operation}`);
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
    