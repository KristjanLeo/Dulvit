// Set chart constants for a modern look
JSGrof.CHART_CONSTANTS.BG_COLOR = null;
JSGrof.CHART_CONSTANTS.STROKE_COLOR = '#2c3e50';
JSGrof.CHART_CONSTANTS.DATA_COLORS = [
    '#3498db',  // Blue
    '#e74c3c',  // Red
    '#2ecc71',  // Green
    '#f1c40f',  // Yellow
    '#9b59b6',  // Purple
    '#1abc9c',  // Turquoise
    '#e67e22'   // Orange
];
JSGrof.CHART_CONSTANTS.FONT_SIZE = 12;
JSGrof.CHART_CONSTANTS.LINE_WIDTH = 2;
JSGrof.CHART_CONSTANTS.TOOLTIP_PADDING = 8;
JSGrof.CHART_CONSTANTS.TOOLTIP_BORDER_RADIUS = 4;
JSGrof.CHART_CONSTANTS.TOOLTIP_SHADOW = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))';
JSGrof.CHART_CONSTANTS.ANIMATION_DURATION = 200;
JSGrof.CHART_CONSTANTS.HOVER_EFFECT = true;
JSGrof.CHART_CONSTANTS.POINT_RADIUS = 4;
JSGrof.CHART_CONSTANTS.POINT_HOVER_RADIUS = 6;

// Connect to the server
const socket = io();

// Initialize metrics tracking
let metricsHistory = {
    loss: [],
    validationLoss: [],
    accuracy: [],
    precision: [],
    epochs: []
};

// Initialize charts
let lossChart, accuracyChart, precisionChart;

// Initialize dashboard elements
const updateDashboardMetrics = (state, metrics) => {
    // Update metrics history
    metricsHistory.loss.push(metrics.loss);
    metricsHistory.validationLoss.push(metrics.validationLoss || null);
    metricsHistory.accuracy.push(metrics.metrics.accuracy[metrics.metrics.accuracy.length - 1]);
    metricsHistory.precision.push(metrics.metrics.precision[metrics.metrics.precision.length - 1]);
    metricsHistory.epochs.push(state.epoch);

    // Update current metrics display
    document.getElementById('current-loss').textContent = metrics.loss.toFixed(6);
    document.getElementById('current-validation-loss').textContent = metrics.validationLoss ? metrics.validationLoss.toFixed(6) : '-';
    document.getElementById('current-accuracy').textContent = (metrics.metrics.accuracy[metrics.metrics.accuracy.length - 1] * 100).toFixed(2) + '%';
    document.getElementById('current-precision').textContent = (metrics.metrics.precision[metrics.metrics.precision.length - 1] * 100).toFixed(2) + '%';
    document.getElementById('current-lr').textContent = metrics.learningRate.toFixed(6);
    document.getElementById('current-epoch').textContent = state.epoch;
    document.getElementById('training-time').textContent = Math.round(metrics.trainingTime) + 's';
    
    // Update best loss if available
    if (metrics.bestLoss) {
        document.getElementById('best-loss').textContent = metrics.bestLoss.toFixed(6);
    }

    // Update or create loss chart
    if (!lossChart) {
        lossChart = new JSGrof.LineChart('loss-chart', {
            'Training Loss': metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.loss[i]]),
            'Validation Loss': metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.validationLoss[i]]).filter(point => point[1] !== null)
        }, {
            labelX: 'Epoch',
            labelY: 'Loss',
            title: 'Losses',
            points: false,
            lines: true,
            grid: true,
            animated: true,
            legend: true,
            legendType: 'topRight',
            interactive: true,
            interactivityPrecisionX: 2,
            interactivityPrecisionY: 2,
            hoverEffect: true,
            tooltipPadding: 8,
            tooltipBorderRadius: 4,
            tooltipShadow: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))',
            animationDuration: 200,
            pointRadius: 4,
            pointHoverRadius: 6,
            liveUpdate: true,
            updateInterval: 100
        });
    } else {
        lossChart.updateData({
            'Training Loss': metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.loss[i]]),
            'Validation Loss': metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.validationLoss[i]]).filter(point => point[1] !== null)
        });
    }

    // Update or create accuracy chart
    if (!accuracyChart) {
        accuracyChart = new JSGrof.LineChart('accuracy-chart', {
            accuracy: metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.accuracy[i]])
        }, {
            labelX: 'Epoch',
            labelY: 'Accuracy',
            title: 'Training Accuracy',
            points: false,
            lines: true,
            grid: true,
            animated: true,
            legend: true,
            legendType: 'topRight',
            interactive: true,
            hoverEffect: true,
            tooltipPadding: 8,
            interactivityPrecisionX: 2,
            interactivityPrecisionY: 2,
            tooltipBorderRadius: 4,
            tooltipShadow: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))',
            animationDuration: 200,
            pointRadius: 4,
            pointHoverRadius: 6,
            liveUpdate: true,
            updateInterval: 100
        });
    } else {
        accuracyChart.updateData({
            accuracy: metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.accuracy[i]])
        });
    }

    // Update or create precision chart
    if (!precisionChart) {
        precisionChart = new JSGrof.LineChart('precision-chart', {
            precision: metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.precision[i]])
        }, {
            labelX: 'Epoch',
            labelY: 'Precision',
            title: 'Training Precision',
            points: false,
            lines: true,
            grid: true,
            animated: true,
            legend: true,
            legendType: 'topRight',
            interactive: true,
            interactivityPrecisionX: 2,
            interactivityPrecisionY: 2,
            hoverEffect: true,
            tooltipPadding: 8,
            tooltipBorderRadius: 4,
            tooltipShadow: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))',
            animationDuration: 200,
            pointRadius: 4,
            pointHoverRadius: 6,
            liveUpdate: true,
            updateInterval: 100
        });
    } else {
        precisionChart.updateData({
            precision: metricsHistory.epochs.map((epoch, i) => [epoch, metricsHistory.precision[i]])
        });
    }
};

// Listen for training updates from server
socket.on('trainingUpdate', (data) => {
    updateDashboardMetrics(data.state, data.metrics);
});

// Start training when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Send startTraining event to server
    socket.emit('startTraining');
});