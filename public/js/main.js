// Set chart constants for a modern look
JSGrof.CHART_CONSTANTS.BG_COLOR = null;
JSGrof.CHART_CONSTANTS.STROKE_COLOR = '#a0a0a0';
JSGrof.CHART_CONSTANTS.DATA_COLORS = [
    '#4dabf7',  // Light Blue
    '#ff6b6b',  // Light Red
    '#51cf66',  // Light Green
    '#ffd43b',  // Light Yellow
    '#cc5de8',  // Light Purple
    '#20c997',  // Light Turquoise
    '#ff922b'   // Light Orange
];
JSGrof.CHART_CONSTANTS.FONT_SIZE = 12;
JSGrof.CHART_CONSTANTS.LINE_WIDTH = 2;
JSGrof.CHART_CONSTANTS.TOOLTIP_PADDING = 8;
JSGrof.CHART_CONSTANTS.TOOLTIP_BORDER_RADIUS = 4;
JSGrof.CHART_CONSTANTS.TOOLTIP_SHADOW = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))';
JSGrof.CHART_CONSTANTS.ANIMATION_DURATION = 200;
JSGrof.CHART_CONSTANTS.HOVER_EFFECT = true;
JSGrof.CHART_CONSTANTS.POINT_RADIUS = 4;
JSGrof.CHART_CONSTANTS.POINT_HOVER_RADIUS = 6;
JSGrof.CHART_CONSTANTS.CHART_PADDING_RIGHT = 0;
JSGrof.CHART_CONSTANTS.CHART_PADDING_LEFT = 0.1;
JSGrof.CHART_CONSTANTS.CHART_PADDING_TOP = 0;
JSGrof.CHART_CONSTANTS.CHART_PADDING_BOTTOM = 0.05;

// Theme handling
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Set initial theme icon based on current theme
const currentTheme = html.getAttribute('data-theme');
themeToggle.innerHTML = currentTheme === 'light' ? '<span>Dark</span>' : '<span>Light</span>';

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'light' ? '<span>Dark</span>' : '<span>Light</span>';
    
    // Update chart colors based on theme
    updateChartColors(newTheme);
});

// Update chart colors based on theme
function updateChartColors(theme) {
    if (theme === 'dark') {
        JSGrof.CHART_CONSTANTS.STROKE_COLOR = '#a0a0a0';
        JSGrof.CHART_CONSTANTS.DATA_COLORS = [
            '#4dabf7',  // Light Blue
            '#ff6b6b',  // Light Red
            '#51cf66',  // Light Green
            '#ffd43b',  // Light Yellow
            '#cc5de8',  // Light Purple
            '#20c997',  // Light Turquoise
            '#ff922b'   // Light Orange
        ];
    } else {
        JSGrof.CHART_CONSTANTS.STROKE_COLOR = '#666666';
        JSGrof.CHART_CONSTANTS.DATA_COLORS = [
            '#1971c2',  // Darker Blue
            '#c92a2a',  // Darker Red
            '#2b8a3e',  // Darker Green
            '#e67700',  // Darker Yellow
            '#9c36b5',  // Darker Purple
            '#0c8599',  // Darker Turquoise
            '#d6336c'   // Darker Pink
        ];
    }
    
    // Redraw charts if they exist
    if (lossChart) lossChart.draw();
    if (accuracyChart) accuracyChart.draw();
    if (precisionChart) precisionChart.draw();
}

// Sidebar handling
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');

toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// Training controls
const startButton = document.getElementById('start-training');
const pauseButton = document.getElementById('pause-training');
const stopButton = document.getElementById('stop-training');
const exportButton = document.getElementById('export-results');

let isTraining = false;
let isPaused = false;

startButton.addEventListener('click', () => {
    if (!isTraining) {
        isTraining = true;
        startButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        
        // Get configuration values
        const config = {
            learningRate: parseFloat(document.getElementById('learning-rate').value),
            batchSize: parseInt(document.getElementById('batch-size').value),
            epochs: parseInt(document.getElementById('epochs').value),
            optimizer: document.getElementById('optimizer').value
        };
        
        // Start training
        socket.emit('startTraining', config);
    }
});

pauseButton.addEventListener('click', () => {
    if (isTraining && !isPaused) {
        isPaused = true;
        pauseButton.innerHTML = 'Resume';
        socket.emit('pauseTraining');
    } else if (isTraining && isPaused) {
        isPaused = false;
        pauseButton.innerHTML = 'Pause';
        socket.emit('resumeTraining');
    }
});

stopButton.addEventListener('click', () => {
    if (isTraining) {
        isTraining = false;
        isPaused = false;
        startButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
        pauseButton.innerHTML = 'Pause';
        socket.emit('stopTraining');
    }
});

// Export results
exportButton.addEventListener('click', () => {
    const data = {
        metrics: {
            loss: metricsHistory.loss,
            accuracy: metricsHistory.accuracy,
            precision: metricsHistory.precision
        },
        config: {
            learningRate: document.getElementById('learning-rate').value,
            batchSize: document.getElementById('batch-size').value,
            epochs: document.getElementById('epochs').value,
            optimizer: document.getElementById('optimizer').value
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Connect to the server
const socket = io();

// Initialize charts
let lossChart = null;
let accuracyChart = null;
let precisionChart = null;

// Initialize metrics tracking
const metricsHistory = {
    loss: [],
    validationLoss: [],
    accuracy: [],
    precision: [],
    mse: [],
    r2: [],
    epochs: []
};

// Initialize dashboard elements
const updateDashboardMetrics = (state, metrics) => {

    // Update metrics history
    metricsHistory.loss.push(metrics.loss);
    metricsHistory.validationLoss.push(metrics.valLoss || null);
    metricsHistory.accuracy = metrics.accuracy || null;
    metricsHistory.precision = metrics.precision || null;
    metricsHistory.mse = metrics.mse || null;
    metricsHistory.r2 = metrics.r2 || null;
    metricsHistory.epochs.push(state.epoch);

    // Update current metrics display
    document.getElementById('current-loss').textContent = metrics.loss.toFixed(6);
    document.getElementById('current-validation-loss').textContent = metrics.valLoss.toFixed(6);
    document.getElementById('current-accuracy').textContent = (metrics.accuracy[metrics.accuracy.length - 1] * 100).toFixed(2) + '%';
    document.getElementById('current-precision').textContent = (metrics.precision[metrics.precision.length - 1] * 100).toFixed(2) + '%';
    
    // Add regression metrics display if elements exist
    const mseElement = document.getElementById('current-mse');
    const r2Element = document.getElementById('current-r2');
    
    if (mseElement) {
        mseElement.textContent = metrics.mse[metrics.mse.length - 1].toFixed(6);
    }
    
    if (r2Element) {
        r2Element.textContent = metrics.r2[metrics.r2.length - 1].toFixed(6);
    }
    
    document.getElementById('current-lr').textContent = metrics.learningRate.toFixed(6);
    document.getElementById('current-epoch').textContent = state.epoch;
    document.getElementById('training-time').textContent = Math.round(metrics.trainingTime) + 's';
    
    // Update best loss
    const bestLoss = Math.min(...metricsHistory.loss);
    document.getElementById('best-loss').textContent = bestLoss.toFixed(6);

    // Initialize or update loss chart
    if (!lossChart) {
        lossChart = new JSGrof.LineChart('loss-chart', {
            'Training Loss': metricsHistory.loss.map((loss, i) => [i, loss]),
            'Validation Loss': metricsHistory.validationLoss.map((loss, i) => [i, loss]),
        }, {
            labelX: 'Epoch',
            labelY: 'Loss',
            title: 'Training and Validation Loss',
            legend: true,
            grid: true,
            legendType: 'topRight',
            points: false
        });
        lossChart.draw();
    } else {
        lossChart.updateData({
            'Training Loss': metricsHistory.loss.map((loss, i) => [i, loss]),
            'Validation Loss': metricsHistory.validationLoss.map((loss, i) => [i, loss]),
        });
    }

    // Initialize or update accuracy chart
    if (!accuracyChart) {
        accuracyChart = new JSGrof.LineChart('accuracy-chart', {
            'Accuracy': metricsHistory.accuracy.map((accuracy, i) => [i, accuracy])
        }, {
            labelX: 'Epoch',
            labelY: 'Accuracy',
            title: 'Accuracy',
            legend: true,
            grid: true,
            legendType: 'topRight',
            points: false
        });
        accuracyChart.draw();
    } else {
        accuracyChart.updateData({
            'Accuracy': metricsHistory.accuracy.map((accuracy, i) => [i, accuracy])
        });
    }

    // Initialize or update precision chart
    if (!precisionChart) {
        precisionChart = new JSGrof.LineChart('precision-chart', {
            'Precision': metricsHistory.precision.map((precision, i) => [i, precision])
        }, {
            labelX: 'Epoch',
            labelY: 'Precision',
            title: 'Precision',
            legend: true,
            grid: true,
            legendType: 'topRight',
            points: false
        });
        precisionChart.draw();
    } else {
        precisionChart.updateData({
            'Precision': metricsHistory.precision.map((precision, i) => [i, precision])
        });
    }
};

// Listen for training updates from server
socket.on('trainingUpdate', (data) => {
    updateDashboardMetrics(data.state, data.metrics);
});

// Model architecture visualization
function updateModelArchitecture(modelInfo) {
    const architectureDiv = document.getElementById('model-architecture');
    
    // Create the main container
    const container = document.createElement('div');
    container.className = 'architecture-container';
    
    // Add input layer
    const inputLayer = document.createElement('div');
    inputLayer.className = 'layer input-layer';
    inputLayer.innerHTML = `
        <div class="layer-content">
            <div class="layer-header">
                <span class="layer-type">Input</span>
                <span class="layer-dim">${modelInfo.inputDim} features</span>
            </div>
        </div>
    `;
    container.appendChild(inputLayer);
    
    // Add hidden layers
    modelInfo.layers.forEach((layer, index) => {
        const layerElement = document.createElement('div');
        layerElement.className = 'layer hidden-layer';
        
        // Create layer content
        const layerContent = document.createElement('div');
        layerContent.className = 'layer-content';
        
        // Layer header with type and units
        const layerHeader = document.createElement('div');
        layerHeader.className = 'layer-header';
        layerHeader.innerHTML = `
            <span class="layer-type">${layer.name}</span>
            <span class="layer-units">${layer.units} units</span>
        `;
        
        // Layer details
        const layerDetails = document.createElement('div');
        layerDetails.className = 'layer-details';
        
        // Add activation if present
        if (layer.activation) {
            const activationInfo = document.createElement('div');
            activationInfo.className = 'activation-info';
            activationInfo.innerHTML = `
                <span class="activation-type">${layer.activation}</span>
                ${Object.entries(layer.params).map(([key, value]) => 
                    `<span class="param">${key}: ${value}</span>`
                ).join('')}
            `;
            layerDetails.appendChild(activationInfo);
        }
        
        // Add layer parameters
        const paramsList = document.createElement('div');
        paramsList.className = 'params-list';
        Object.entries(layer.params).forEach(([key, value]) => {
            if (key !== 'activation') {
                const param = document.createElement('div');
                param.className = 'param';
                param.innerHTML = `<span class="param-name">${key}:</span> <span class="param-value">${value}</span>`;
                paramsList.appendChild(param);
            }
        });
        
        layerDetails.appendChild(paramsList);
        layerContent.appendChild(layerHeader);
        layerContent.appendChild(layerDetails);
        layerElement.appendChild(layerContent);
        
        // Add connections
        if (index > 0) {
            const connection = document.createElement('div');
            connection.className = 'layer-connection';
            container.appendChild(connection);
        }
        
        container.appendChild(layerElement);
    });
    
    // Add output layer with loss function
    const outputLayer = document.createElement('div');
    outputLayer.className = 'layer output-layer';
    outputLayer.innerHTML = `
        <div class="layer-content">
            <div class="layer-header">
                <span class="layer-type">Output</span>
                <span class="layer-loss">${modelInfo.lossFunction.type}</span>
            </div>
            <div class="layer-details">
                ${Object.entries(modelInfo.lossFunction.params).map(([key, value]) => 
                    `<div class="param"><span class="param-name">${key}:</span> <span class="param-value">${value}</span></div>`
                ).join('')}
            </div>
        </div>
    `;
    
    // Add final connection
    const finalConnection = document.createElement('div');
    finalConnection.className = 'layer-connection';
    container.appendChild(finalConnection);
    container.appendChild(outputLayer);
    
    // Clear and update the architecture div
    architectureDiv.innerHTML = '';
    architectureDiv.appendChild(container);
}

socket.on('modelArchitecture', (modelInfo) => {
    updateModelArchitecture(modelInfo);
}); 