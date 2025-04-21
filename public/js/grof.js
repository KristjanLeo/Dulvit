const JSGrof = {};

JSGrof.CHART_CONSTANTS = {
	BG_COLOR: '#222222',
	STROKE_COLOR: '#FFFFFF',
	DATA_COLORS: [
		'#4ECDC4', // Teal
		'#FF6B6B', // Coral
		'#45B7D1', // Sky Blue
		'#96CEB4', // Sage Green
		'#FFEEAD', // Cream
		'#D4A5A5', // Dusty Rose
		'#9B59B6'  // Purple
	],
	CHART_PADDING_LEFT: 0.1,
	CHART_PADDING_RIGHT: 0.1,
	CHART_PADDING_TOP: 0.1,
	CHART_PADDING_BOTTOM: 0.1,
	FONT_SIZE: 12,
	DYNAMIC_FONTSIZE_CENTER: 400,
	RESOLUTION_UPSCALE: 2,
	TITLE_SIZE: 2.5,
	LINE_WIDTH: 1.5,
	FLOAT_FORMAT: '.',
	TOOLTIP_PADDING: 10,
	TOOLTIP_BORDER_RADIUS: 8,
	TOOLTIP_SHADOW: '0 4px 8px rgba(0,0,0,0.2)',
	ANIMATION_DURATION: 300,
	HOVER_EFFECT: true,
	GRID_OPACITY: 0.15,
	POINT_RADIUS: 4,
	POINT_HOVER_RADIUS: 6
}

JSGrof.ChartPrototype = {
	_initOptions(options) {
		if(this.error) return;

		if(!options.constructor || options.constructor.name !== 'Object') {
			this._errorMessage('_initOptions', 'options must be of type Object.');
		}

		// Padding
		this.chartPaddingLeft = options.chartPaddingLeft ?? JSGrof.CHART_CONSTANTS.CHART_PADDING_LEFT;
		if(!this._checkFloat(this.chartPaddingLeft, 0, 1)) {
			this._errorMessage('_initOptions', 'chartPaddingLeft must be a number between 0 and 1.');
			return;
		}
		this.chartPaddingRight = options.chartPaddingRight ?? JSGrof.CHART_CONSTANTS.CHART_PADDING_RIGHT;
		if(!this._checkFloat(this.chartPaddingRight, 0, 1)) {
			this._errorMessage('_initOptions', 'chartPaddingRight must be a number between 0 and 1.');
			return;
		}
		this.chartPaddingTop = options.chartPaddingTop ?? JSGrof.CHART_CONSTANTS.CHART_PADDING_TOP;
		if(!this._checkFloat(this.chartPaddingTop, 0, 1)) {
			this._errorMessage('_initOptions', 'chartPaddingTop must be a number between 0 and 1.');
			return;
		}
		this.chartPaddingBottom = options.chartPaddingBottom ?? JSGrof.CHART_CONSTANTS.CHART_PADDING_BOTTOM;
		if(!this._checkFloat(this.chartPaddingBottom, 0, 1)) {
			this._errorMessage('_initOptions', 'chartPaddingBottom must be a number between 0 and 1.');
			return;
		}
		if(this.type === 'barchart') {
			this.chartPaddingBottom += 0.05;
		}

		// Live update option
		this.liveUpdate = options.liveUpdate === undefined ? false : options.liveUpdate;
		if(this.liveUpdate !== undefined && !this._checkBoolean(this.liveUpdate)) {
			this._errorMessage('_initOptions', 'liveUpdate must be a boolean.');
			return;
		}
		this.updateInterval = options.updateInterval ?? 100; // Default update interval in ms
		if(!this._checkFloat(this.updateInterval, 10, 10000)) {
			this._errorMessage('_initOptions', 'updateInterval must be a number between 10 and 10000.');
			return;
		}
		this.lastUpdateTime = 0;
		this.pendingUpdate = false;

		// Colors
		this.bgColor = options.bgColor === undefined ? JSGrof.CHART_CONSTANTS.BG_COLOR : options.bgColor;
		if(this.bgColor !== null && !this._checkSixDigitHex(this.bgColor)) {
			this._errorMessage('_initOptions', 'bgColor must be either null or a six digit hex value string, for example ("#AA9999")');
			return;
		}
		this.strokeColor = options.strokeColor === undefined ? JSGrof.CHART_CONSTANTS.STROKE_COLOR : options.strokeColor;
		if(!this._checkSixDigitHex(this.strokeColor)) {
			this._errorMessage('_initOptions', 'strokeColor must be a six digit hex value string, for example ("#AA9999")');
			return;
		}
		this.axisColor = options.axisColor === undefined ? this.strokeColor : options.axisColor;
		if(!this._checkSixDigitHex(this.axisColor)) {
			this._errorMessage('_initOptions', 'axisColor must be a six digit hex value string, for example ("#AA9999")');
			return;
		}
		this.dataColors = options.dataColors === undefined ? JSGrof.CHART_CONSTANTS.DATA_COLORS : options.dataColors;
		if(!this.dataColors) {
			this._errorMessage('_initOptions', 'Missing dataColors.');
			return;
		} else if(!this.dataColors.constructor || this.dataColors.constructor.name !== 'Array') {
			this._errorMessage('_initOptions', 'dataColors must be an array of hex value strings.');
			return;
		} else if(this.dataColors.length === 0) {
			this._errorMessage('_initOptions', 'dataColors cannot be empty.');
			return;
		} else {
			for(let i = 0; i < this.dataColors.length; i++) {
				if(!this._checkSixDigitHex(this.dataColors[i])) {
					this._errorMessage('_initOptions', 'Incorrect string in dataColors. Values must be a six digit hex value string, for example ("#AA9999")');
					return;
				}
			}
		}

		// Scaling
		this.fontSize = options.fontSize ?? JSGrof.CHART_CONSTANTS.FONT_SIZE;
		if(!this._checkFloat(this.fontSize, 0, 100)) {
			this._errorMessage('_initOptions', 'fontSize must be a number between 0 and 100.');
			return;
		}
		this.fontSizeConstant = this.fontSize;

		this.resolutionUpscale = options.resolutionUpscale ?? JSGrof.CHART_CONSTANTS.RESOLUTION_UPSCALE;
		if(!this._checkFloat(this.resolutionUpscale, 0, 4)) {
			this._errorMessage('_initOptions', 'resolutionUpscale must be a number between 0 and 4.');
			return;
		}
		this.lineWidth = options.lineWidth ?? JSGrof.CHART_CONSTANTS.LINE_WIDTH;
		if(!this._checkFloat(this.lineWidth, 0.01, 100)) {
			this._errorMessage('_initOptions', 'lineWidth must be a number between 0.01 and 100.');
			return;
		}
		this.resizeListener = options.resizeListener;
		if(this.resizeListener !== undefined && !this._checkBoolean(this.resizeListener)) {
			this._errorMessage('_initOptions', 'resizeListener must be a boolean.');
			return;
		}

		// Title
		this.title = options.title;
		if(this.title !== undefined && !this._checkString(this.title)) {
			this._errorMessage('_initOptions', 'title must be a string.');
			return;
		}
		if(this.title && this.title.length > 0 && options.chartPaddingTop === undefined) {
			this.chartPaddingTop += 0.1;
		}
		this.titleSize = options.titleSize ?? JSGrof.CHART_CONSTANTS.TITLE_SIZE;
		if(!this._checkFloat(this.titleSize, 0, 10)) {
			this._errorMessage('_initOptions', 'titleSize must be a number between 0 and 10.');
			return;
		}

		// Axis labels
		this.labelX = options.labelX;
		if(this.labelX !== undefined && !this._checkString(this.labelX)) {
			this._errorMessage('_initOptions', 'labelX must be a string.');
			return;
		}
		if(this.labelX && options.chartPaddingBottom === undefined) {
			this.chartPaddingBottom += 0.05;
		}
		this.labelY = options.labelY;
		if(this.labelY !== undefined && !this._checkString(this.labelY)) {
			this._errorMessage('_initOptions', 'labelY must be a string.');
			return;
		}
		if(this.labelY && options.chartPaddingLeft === undefined) {
			this.chartPaddingLeft += 0.05;
		}
		this.axisLabels = options.axisLabels;
		if(this.axisLabels === undefined) {
			
		} else if(!this.axisLabels.constructor || this.axisLabels.constructor.name !== 'Array') {
			this._errorMessage('_initOptions', 'axisLabels must be an array of strings.');
			return;
		} else if(this.axisLabels.length === 0) {
			this._errorMessage('_initOptions', 'axisLabels cannot be empty.');
			return;
		} else {
			for(let i = 0; i < this.axisLabels.length; i++) {
				if(!this._checkString(this.axisLabels[i])) {
					this._errorMessage('_initOptions', 'axisLabels values must be strings.');
					return;
				}
			}
		}
		this.tickSuffixX = options.tickSuffixX;
		if(this.tickSuffixX !== undefined && !this._checkString(this.tickSuffixX)) {
			this._errorMessage('_initOptions', 'tickSuffixX must be a string.');
			return;
		}
		this.tickSuffixY = options.tickSuffixY;
		if(this.tickSuffixY !== undefined && !this._checkString(this.tickSuffixY)) {
			this._errorMessage('_initOptions', 'tickSuffixY must be a string.');
			return;
		}
		this.tickSuffix = options.tickSuffix;
		if(this.tickSuffix !== undefined && !this._checkString(this.tickSuffix)) {
			this._errorMessage('_initOptions', 'tickSuffix must be a string.');
			return;
		}


		// Grid
		this.grid = options.grid;
		if(this.grid !== undefined && !this._checkBoolean(this.grid)) {
			this._errorMessage('_initOptions', 'grid must be a boolean.');
			return;
		}
		this.gridX = options.gridX;
		if(this.gridX !== undefined && !this._checkBoolean(this.gridX)) {
			this._errorMessage('_initOptions', 'gridX must be a boolean.');
			return;
		}
		this.gridY = options.gridY;
		if(this.gridY !== undefined && !this._checkBoolean(this.gridY)) {
			this._errorMessage('_initOptions', 'gridY must be a boolean.');
			return;
		}
		this.gridOpacity = options.gridOpacity ?? JSGrof.CHART_CONSTANTS.GRID_OPACITY;
		if(!this._checkFloat(this.gridOpacity, 0, 1)) {
			this._errorMessage('_initOptions', 'gridOpacity must be a number between 0 and 1.');
			return;
		}

		// Legend
		this.legend = options.legend;
		if(this.legend !== undefined && !this._checkBoolean(this.legend)) {
			this._errorMessage('_initOptions', 'legend must be a boolean.');
			return;
		}
		this.legendType = options.legendType;
		if(this.legendType !== undefined && !this._checkString(this.legendType)) {
			this._errorMessage('_initOptions', 'legendType must be a string.');
			return;
		}
		if(this.legend) {
			if(this.type === 'linechart') {
				if(this.legendType && this.legendType === 'topRight') {
					this.chartPaddingTop += 0.1;
					this.chartPaddingRight += 0.1;
				} else if(this.legendType) {
					this._errorMessage('_initOptions', 'Incorrect legendType');
				} else { // Default to bottom legend
					this.chartPaddingBottom += 0.05;
				}
			}
			if(this.type === 'piechart') {
				if(this.legendType && this.legendType === 'bottom') {
					this.chartPaddingBottom += 0.05;
				} else if(this.legendType) {
					this._errorMessage('_initOptions', 'Incorrect legendType');
				} else { // Default to topRight legend
					this.chartPaddingTop += 0.1;
					this.chartPaddingRight += 0.1;
				}
			}
		}

		// LineChart lines and points
		this.lines = options.lines !== undefined ? options.lines : true;
		if(this.lines !== undefined) {
			if(!this._checkBoolean(this.lines) && (!this.lines.constructor || this.lines.constructor.name !== 'Array')) {
				this._errorMessage('_initOptions', 'lines must be either a boolean or an array of booleans.');
				return;
			}
			if(typeof(this.lines) === 'object') {
				if(this.lines.length === 0) {
					this._errorMessage('_initOptions', 'lines cannot be an empty array.');
					return;
				}
				for(let i = 0; i < this.lines.length; i++) {
					if(!this._checkBoolean(this.lines[i])) {
						this._errorMessage('_initOptions', 'All elements in lines must be booleans.');
						return;
					}
				}
			}
		}
		this.points = options.points  !== undefined ? options.points : true;
		if(this.points !== undefined) {
			if(!this._checkBoolean(this.points) && (!this.points.constructor || this.points.constructor.name !== 'Array')) {
				this._errorMessage('_initOptions', 'points must be either a boolean or an array of booleans.');
				return;
			}
			if(typeof(this.points) === 'object') {
				if(this.points.length === 0) {
					this._errorMessage('_initOptions', 'points cannot be an empty array.');
					return;
				}
				for(let i = 0; i < this.points.length; i++) {
					if(!this._checkBoolean(this.points[i])) {
						this._errorMessage('_initOptions', 'All elements in points must be booleans.');
						return;
					}
				}
			}
		}
		this.pointRadius = options.pointRadius ?? JSGrof.CHART_CONSTANTS.POINT_RADIUS;
		if(!this._checkFloat(this.pointRadius, 0, 20)) {
			this._errorMessage('_initOptions', 'pointRadius must be a number between 0 and 20.');
			return;
		}
		this.pointHoverRadius = options.pointHoverRadius ?? JSGrof.CHART_CONSTANTS.POINT_HOVER_RADIUS;
		if(!this._checkFloat(this.pointHoverRadius, 0, 20)) {
			this._errorMessage('_initOptions', 'pointHoverRadius must be a number between 0 and 20.');
			return;
		}

		// Data labels
		this.dataLabels = options.dataLabels;
		if(this.dataLabels !== undefined && !this._checkBoolean(this.dataLabels)) {
			this._errorMessage('_initOptions', 'dataLabels must be a boolean.');
			return;
		}
		this.innerLabels = options.innerLabels;
		if(this.innerLabels !== undefined && !this._checkBoolean(this.innerLabels)) {
			this._errorMessage('_initOptions', 'innerLabels must be a boolean.');
			return;
		}
		this.percentage = options.percentage;
		if(this.percentage !== undefined && !this._checkBoolean(this.percentage)) {
			this._errorMessage('_initOptions', 'percentage must be a boolean.');
			return;
		}
		this.percentagePrecision = options.percentagePrecision;
		if(this.percentage && !this._checkInteger(this.percentagePrecision, 0, 100)) {
			this._errorMessage('_initOptions', 'Missing or incorrect percentagePrecision for percentages (must be an integer between 0 and 100).');
		}

		// Dynamic font size
		this.dynamicFontSize = options.dynamicFontSize === undefined ? true : options.dynamicFontSize;
		if(this.dynamicFontSize !== undefined && !this._checkBoolean(this.dynamicFontSize)) {
			this._errorMessage('_initOptions', 'dynamicFontSize must be a boolean.');
			return;
		}
		this.dynamicFontSizeCenter = options.dynamicFontSizeCenter ?? JSGrof.CHART_CONSTANTS.DYNAMIC_FONTSIZE_CENTER;
		if(!this._checkFloat(this.dynamicFontSizeCenter, 1, 10000)) {
			this._errorMessage('_initOptions', 'dynamicFontSizeCenter must be a number between 1 and 10000.');
			return;
		}

		// Ticks min, max, spacing
		this.min = options.min;
		if(this.min !== undefined && !this._checkFloat(this.min, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'min must be a number between -Infinity and Infinity.');
			return;
		}
		this.max = options.max;
		if(this.max !== undefined && !this._checkFloat(this.max, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'max must be a number between -Infinity and Infinity.');
			return;
		}
		this.minX = options.minX;
		if(this.minX !== undefined && !this._checkFloat(this.minX, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'minX must be a number between -Infinity and Infinity.');
			return;
		}
		if(this.minX === undefined && this.type === 'histochart') {
			this._errorMessage('_initOptions', 'missing minX.');
			return;
		}
		this.maxX = options.maxX;
		if(this.maxX !== undefined && !this._checkFloat(this.maxX, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'maxX must be a number between -Infinity and Infinity.');
			return;
		}
		if(this.maxX === undefined && this.type === 'histochart') {
			this._errorMessage('_initOptions', 'missing maxX.');
			return;
		}

		this.minY = options.minY;
		if(this.minY !== undefined && !this._checkFloat(this.minY, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'minY must be a number between -Infinity and Infinity.');
			return;
		}
		this.maxY = options.maxY;
		if(this.maxY !== undefined && !this._checkFloat(this.maxY, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'maxY must be a number between -Infinity and Infinity.');
			return;
		}
		this.tickSpacingX = options.tickSpacingX;
		if(this.tickSpacingX !== undefined && !this._checkFloat(this.tickSpacingX, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'tickSpacingX must be a number between -Infinity and Infinity.');
			return;
		}
		this.tickSpacingY = options.tickSpacingY;
		if(this.tickSpacingY !== undefined && !this._checkFloat(this.tickSpacingY, -Infinity, Infinity)) {
			this._errorMessage('_initOptions', 'tickSpacingY must be a number between -Infinity and Infinity.');
			return;
		}

		this.areaUnder = options.areaUnder;
		if(this.areaUnder !== undefined && !this._checkBoolean(this.areaUnder)) {
			this._errorMessage('_initOptions', 'areaUnder must be a boolean.');
			return;
		}

		// Interactivity
		this.interactive = options.interactive;
		if(this.interactive !== undefined && !this._checkBoolean(this.interactive)) {
			this._errorMessage('_initOptions', 'interactive must be a boolean.');
			return;
		}
		this.interactivityPrecisionX = options.interactivityPrecisionX ?? JSGrof.CHART_CONSTANTS.DYNAMIC_FONTSIZE_CENTER;
		if(this.interactive && this.type === 'linechart' && !this._checkFloat(this.interactivityPrecisionX, 0, 100)) {
			this._errorMessage('_initOptions', 'interactivityPrecisionX must be a number between 0 and 100.');
			return;
		}
		this.interactivityPrecisionY = options.interactivityPrecisionY ?? JSGrof.CHART_CONSTANTS.DYNAMIC_FONTSIZE_CENTER;
		if(this.interactive && this.type === 'linechart' && !this._checkFloat(this.interactivityPrecisionY, 0, 100)) {
			this._errorMessage('_initOptions', 'interactivityPrecisionY must be a number between 0 and 100.');
			return;
		}
		this.interactivityPercentagePrecision = options.interactivityPercentagePrecision ?? JSGrof.CHART_CONSTANTS.DYNAMIC_FONTSIZE_CENTER;
		if(this.interactive && this.type === 'piechart' && !this._checkFloat(this.interactivityPercentagePrecision, 0, 100)) {
			this._errorMessage('_initOptions', 'interactivityPercentagePrecision must be a number between 0 and 100.');
			return;
		}
		this.hoverEffect = options.hoverEffect ?? JSGrof.CHART_CONSTANTS.HOVER_EFFECT;
		if(this.hoverEffect !== undefined && !this._checkBoolean(this.hoverEffect)) {
			this._errorMessage('_initOptions', 'hoverEffect must be a boolean.');
			return;
		}
		this.tooltipPadding = options.tooltipPadding ?? JSGrof.CHART_CONSTANTS.TOOLTIP_PADDING;
		if(!this._checkFloat(this.tooltipPadding, 0, 50)) {
			this._errorMessage('_initOptions', 'tooltipPadding must be a number between 0 and 50.');
			return;
		}
		this.tooltipBorderRadius = options.tooltipBorderRadius ?? JSGrof.CHART_CONSTANTS.TOOLTIP_BORDER_RADIUS;
		if(!this._checkFloat(this.tooltipBorderRadius, 0, 20)) {
			this._errorMessage('_initOptions', 'tooltipBorderRadius must be a number between 0 and 20.');
			return;
		}
		this.tooltipShadow = options.tooltipShadow ?? JSGrof.CHART_CONSTANTS.TOOLTIP_SHADOW;
		if(this.tooltipShadow !== undefined && !this._checkString(this.tooltipShadow)) {
			this._errorMessage('_initOptions', 'tooltipShadow must be a string.');
			return;
		}

		// Animations
		this.animated = options.animated;
		if(this.animated !== undefined && !this._checkBoolean(this.animated)) {
			this._errorMessage('_initOptions', 'animated must be a boolean.');
			return;
		}
		this.animationDuration = options.animationDuration ?? JSGrof.CHART_CONSTANTS.ANIMATION_DURATION;
		if(!this._checkFloat(this.animationDuration, 0, 2000)) {
			this._errorMessage('_initOptions', 'animationDuration must be a number between 0 and 2000.');
			return;
		}

		// Float formatting
		this.floatFormat = options.floatFormat ?? JSGrof.CHART_CONSTANTS.FLOAT_FORMAT;
		if(this.floatFormat !== undefined && !this._checkString(this.floatFormat)) {
			this._errorMessage('_initOptions', 'floatFormat must be a string.');
			return;
		}
	},

	_checkSixDigitHex(hex) {
		if(hex === undefined) return false;
		if(typeof(hex) !== 'string') return false;
		if(hex.length !== 7) return false;
		if(hex[0] !== '#') return false;
		for(let i = 1; i < hex.length; i++) {
			if(!['A','B','C','D','E','F',
				'a', 'b', 'c', 'd', 'e', 'f',
				'1','2','3','4','5','6','7','8','9','0'
			].includes(hex[i])) return false;
		}
		return true;
	},

	_checkInteger(num, min, max) {
		return !(
			num === undefined 
			||  typeof(num) !== 'number'
			|| !Number.isInteger(num)
			||	num < min
			||  num > max
		);
	},

	_checkFloat(num, min, max) {
		return !(
			num === undefined 
			||  typeof(num) !== 'number'
			||	num < min
			||  num > max
		);
	},

	_checkString(str) {
		return !(
			str === undefined
			|| typeof(str) !== 'string'
		);
	},

	_checkBoolean(bool) {
		return !(
			bool === undefined
			|| typeof(bool) !== 'boolean'
		);
	},

	_dataToTicks(min, max) {
		
		let d = this._integerAddition(max, -min);
		let fix = d < 1 ? -1 : 0;

		let r = Math.round(d/Math.pow(10, parseInt(Math.log10(d)) + fix));

		let ll = this._integerAddition(parseInt(Math.log10(d)), fix)
		let l = 10**ll;
		if(ll < 0) {
			l = parseFloat(l.toFixed(Math.abs(ll)));
		}

		let spacing;
		if(r > 9) {
			spacing = this._integerMultiplication(2, l);
		} else if(r > 8) {
			spacing = this._integerMultiplication(1.5, l);
		} else if (r > 4) {
			spacing = this._integerMultiplication(1.0, l)
		} else if (r > 2) {
			spacing = this._integerMultiplication(0.5, l)
		} else if (r > 1) {
			spacing = this._integerMultiplication(0.25, l)
		} else {
			spacing = this._integerMultiplication(0.125, l)
		}

		let start = this._integerAddition(min, -this._integerModulo(min, spacing));
		if(start > min) start = this._integerAddition(start, -spacing);

		let end = this._integerAddition(max, -this._integerModulo(max, spacing));
		if(end < max) end = this._integerAddition(end, spacing) + 1e-16;

		return {start, spacing, end};
	},


	_integerAddition(a, b) {
		
		let splitA = a.toString().split('.');
		let splitB = b.toString().split('.');

		if(splitA.length < 2 && splitB.length < 2) return a + b;
		if(splitA.length < 2) return parseFloat((a+b).toFixed(splitB[1].length));
		if(splitB.length < 2) return parseFloat((a+b).toFixed(splitA[1].length));

		let maxPrecision = splitA[1].length > splitB[1].length ? splitA[1].length : splitB[1].length;
		return parseFloat((a+b).toFixed(maxPrecision));
	},

	_integerMultiplication(a, b) {
		
		let splitA = a.toString().split('.');
		let splitB = b.toString().split('.');
		
		if(splitA.length < 2 && splitB.length < 2) return a*b;
		if(splitA.length < 2) return parseFloat((a*b).toFixed(splitB[1].length));
		if(splitB.length < 2) return parseFloat((a*b).toFixed(splitA[1].length));

		return parseFloat((a*b).toFixed(splitA[1].length+splitB[1].length));
	},

	_integerModulo(a, b) {
		return this._integerAddition(a, -this._integerMultiplication(parseInt(a/b), b));
	},

	_formatFloat(num) {
		
		if(this.floatFormat === undefined) return num;
		
		num = num.toString();
		let idxOfPoint = num.indexOf('.');

		if(this.floatFormat === ',.') {
			
			for(let i = idxOfPoint - 3; i > 0; i -= 3) {
				num = num.slice(0, i) + ',' + num.slice(i);
			}

			if(idxOfPoint === -1) {
				for(let i = num.length - 3; i > 0; i -= 3) {
					num = num.slice(0, i) + ',' + num.slice(i);
				}
			}

		} else if(this.floatFormat === '.,') {
			
			num = num.replace('.', ',')
			for(let i = idxOfPoint - 3; i > 0; i -= 3) {
				num = num.slice(0, i) + '.' + num.slice(i);
			}

			if(idxOfPoint === -1) {
				for(let i = num.length - 3; i > 0; i -= 3) {
					num = num.slice(0, i) + '.' + num.slice(i);
				}
			}

		} else if(this.floatFormat === ',') {
			num = num.replace('.', ',');
		}

		return num;
	},

	_getBWContrasting(color) {
		if(this.error) return '#FFFFFF';
		if(!color || typeof color !== 'string' || color.length < 7) return '#FFFFFF';
		try {
			const r = parseInt(color.slice(1, 3), 16);
			const g = parseInt(color.slice(3, 5), 16);
			const b = parseInt(color.slice(5, 7), 16);
			const brightness = (r * 299 + g * 587 + b * 114) / 1000;
			return brightness > 128 ? '#000000' : '#FFFFFF';
		} catch (e) {
			console.warn("Error in _getBWContrasting:", e);
			return '#FFFFFF';
		}
	},

	_getBase10Value(hex) {
		if(this.error) return;
		const value = parseInt(hex, 16);
		return isNaN(value) ? 0 : value;
	},

	_withOpacity(color, opacity) {
		if(this.error) return;
		const r = this._getBase10Value(color.slice(1, 3));
		const g = this._getBase10Value(color.slice(3, 5));
		const b = this._getBase10Value(color.slice(5, 7));
		return `rgba(${r},${g},${b},${opacity})`;
	},

	_initCanvas(canvasId) {
		if(this.error) return;

		if(!this._checkString(canvasId)) {
			this._errorMessage('_initCanvas', 'canvasId must be a string.');
			return;
		}

		// Get the container element
		this.container = document.getElementById(canvasId);
		if(!this.container) {
			this._errorMessage('_initCanvas', 'Missing element with id: "' + canvasId + '"');
			return;
		}

		// Create SVG element
		this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		this.svg.style.width = "100%";
		this.svg.style.height = "100%";
		this.container.appendChild(this.svg);

		// Create main group for the chart
		this.chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		this.svg.appendChild(this.chartGroup);

		// Set up resize handling
		this.resize();
		if(this.resizeListener) {
			window.addEventListener('resize', (e) => {
				this.draw();
			});
		}

		// Set up interactivity
		if(this.interactive) {
			// Track if mouse is over the chart
			this.isMouseOver = false;
			this.lastMousePosition = { x: 0, y: 0 };
			this.isTouchActive = false;
			this.lastTouchPosition = { x: 0, y: 0 };
			this.tooltipUpdateTimeout = null;
			this.tooltipAnimationFrame = null;
			
			// Debounce function for smoother updates
			const debounce = (func, wait) => {
				let timeout;
				return function executedFunction(...args) {
					const later = () => {
						clearTimeout(timeout);
						func(...args);
					};
					clearTimeout(timeout);
					timeout = setTimeout(later, wait);
				};
			};
			
			// Mouse enter event
			this.svg.addEventListener('mouseenter', (e) => {
				this.isMouseOver = true;
				this.svg.style.cursor = 'crosshair';
			});
			
			// Mouse leave event
			this.svg.addEventListener('mouseleave', (e) => {
				this.isMouseOver = false;
				this.svg.style.cursor = 'default';
				this.draw(); // Redraw to remove tooltips
			});
			
			// Mouse move event with debouncing
			const handleMouseMove = debounce((e) => {
				if(this.error) return;

				const rect = this.svg.getBoundingClientRect();
				const x = (e.clientX - rect.left) / rect.width;
				const y = (e.clientY - rect.top) / rect.height;

				if(x < 0 || x > 1 || y < 0 || y > 1) {
					this.draw();
					return;
				}
				
				this.lastMousePosition = { x, y };
				
				// Use requestAnimationFrame for smoother tooltip updates
				if (this.tooltipAnimationFrame) {
					cancelAnimationFrame(this.tooltipAnimationFrame);
				}
				
				this.tooltipAnimationFrame = requestAnimationFrame(() => {
					this._mousemove(x, y);
				});
			}, 16); // ~60fps
			
			this.svg.addEventListener('mousemove', handleMouseMove);
			
			// Touch events for mobile with improved gesture support
			this.svg.addEventListener('touchstart', (e) => {
				if(this.error) return;
				e.preventDefault();
				
				this.isTouchActive = true;
				const rect = this.svg.getBoundingClientRect();
				const touch = e.touches[0];
				const x = (touch.clientX - rect.left) / rect.width;
				const y = (touch.clientY - rect.top) / rect.height;
				
				if(x < 0 || x > 1 || y < 0 || y > 1) return;
				
				this.lastTouchPosition = { x, y };
				this._mousemove(x, y);
			});
			
			const handleTouchMove = debounce((e) => {
				if(this.error || !this.isTouchActive) return;
				e.preventDefault();
				
				const rect = this.svg.getBoundingClientRect();
				const touch = e.touches[0];
				const x = (touch.clientX - rect.left) / rect.width;
				const y = (touch.clientY - rect.top) / rect.height;
				
				if(x < 0 || x > 1 || y < 0 || y > 1) {
					this.draw();
					return;
				}
				
				this.lastTouchPosition = { x, y };
				
				// Use requestAnimationFrame for smoother tooltip updates
				if (this.tooltipAnimationFrame) {
					cancelAnimationFrame(this.tooltipAnimationFrame);
				}
				
				this.tooltipAnimationFrame = requestAnimationFrame(() => {
					this._mousemove(x, y);
				});
			}, 16); // ~60fps
			
			this.svg.addEventListener('touchmove', handleTouchMove);
			
			this.svg.addEventListener('touchend', (e) => {
				this.isTouchActive = false;
				this.draw(); // Redraw to remove tooltips
			});
			
			// Clean up on destroy
			this.cleanup = () => {
				if (this.tooltipUpdateTimeout) {
					clearTimeout(this.tooltipUpdateTimeout);
				}
				if (this.tooltipAnimationFrame) {
					cancelAnimationFrame(this.tooltipAnimationFrame);
				}
				this.svg.removeEventListener('mousemove', handleMouseMove);
				this.svg.removeEventListener('touchmove', handleTouchMove);
			};
		}
	},

	_errorMessage(f, msg) {
		this.error = true;
		console.error(this.type, '>', f, '>', msg);
	},

	_warningMessage(f, msg) {
		this.warning = true;
		console.warn(this.type, '>', f, '>', msg);
	},

	_svgCoords(x, y) {
		const width = this.svg.clientWidth;
		const height = this.svg.clientHeight;
		return [width * x, height * (1 - y)];
	},

	_inverseChartCoords(x, y) {
		const width = this.svg.clientWidth;
		const height = this.svg.clientHeight;
		return [
			(x/width - this.chartPaddingLeft)/(1 - this.chartPaddingRight - this.chartPaddingLeft),
			(1 - y/height - this.chartPaddingBottom)/(1 - this.chartPaddingTop - this.chartPaddingBottom)
		];
	},

	_chartCoords(x, y) {
		if(this.error) return [0, 0];
		
		// Handle NaN or undefined values
		if (isNaN(x) || isNaN(y) || x === undefined || y === undefined) {
			console.warn("Invalid coordinates:", {x, y});
			return [0, 0];
		}
		
		const width = Math.max(1, this.svg.clientWidth);  // Prevent division by zero
		const height = Math.max(1, this.svg.clientHeight);
		const xCoord = width * (x * (1 - this.chartPaddingRight - this.chartPaddingLeft) + this.chartPaddingLeft);
		const yCoord = height * (1 - y * (1 - this.chartPaddingTop - this.chartPaddingBottom) - this.chartPaddingBottom);
		return [
			Math.max(0, Math.min(width, xCoord)),   // Clamp between 0 and width
			Math.max(0, Math.min(height, yCoord))   // Clamp between 0 and height
		];
	},

	resize() {
		if(this.error) return;

		// Update SVG viewBox to match container size
		const width = this.container.clientWidth;
		const height = this.container.clientHeight;
		this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

		if(this.dynamicFontSize) {
			this.fontSize = this.fontSizeConstant * Math.min(width, height) / this.dynamicFontSizeCenter;
		}
	},

	draw() {
		if(this.error) return;
		this.resize();

		// Clear previous content
		while(this.chartGroup.firstChild) {
			this.chartGroup.removeChild(this.chartGroup.firstChild);
		}

		// Draw background if specified
		if(this.bgColor) {
			const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			bg.setAttribute('width', '100%');
			bg.setAttribute('height', '100%');
			bg.setAttribute('fill', this.bgColor);
			this.chartGroup.appendChild(bg);
		}

		// Draw the chart content
		this._drawSelf();

		// Draw title if specified
		if(this.title) {
			const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
			const [x, y] = this._chartCoords(0.5, 1.1); // Position title above the chart
			title.setAttribute('x', x);
			title.setAttribute('y', y);
			title.setAttribute('text-anchor', 'middle');
			title.setAttribute('font-size', this.titleSize * this.fontSize);
			title.setAttribute('fill', this.strokeColor);
			title.textContent = this.title;
			this.chartGroup.appendChild(title);
		}

		// Draw axis labels
		if(this.labelX) {
			const labelX = document.createElementNS("http://www.w3.org/2000/svg", "text");
			const [x, y] = this._chartCoords(0.5, -0.15); // Position X-axis label below the chart
			labelX.setAttribute('x', x);
			labelX.setAttribute('y', y);
			labelX.setAttribute('text-anchor', 'middle');
			labelX.setAttribute('font-size', this.fontSize);
			labelX.setAttribute('fill', this.axisColor);
			labelX.textContent = this.labelX;
			this.chartGroup.appendChild(labelX);
		}

		if(this.labelY) {
			const labelY = document.createElementNS("http://www.w3.org/2000/svg", "text");
			const [x, y] = this._chartCoords(-0.15, 0.5); // Position Y-axis label to the left of the chart
			labelY.setAttribute('x', x);
			labelY.setAttribute('y', y);
			labelY.setAttribute('text-anchor', 'middle');
			labelY.setAttribute('font-size', this.fontSize);
			labelY.setAttribute('fill', this.axisColor);
			labelY.setAttribute('transform', `rotate(-90 ${x} ${y})`);
			labelY.textContent = this.labelY;
			this.chartGroup.appendChild(labelY);
		}

		// Draw legend if specified
		if(this.legend) {
			if(this.type === 'linechart') {
				switch(this.legendType) {
					case 'topRight':
						if(!['linechart', 'piechart'].includes(this.type)) break;
						this._drawTopRightLegend();
						break;
					default:
						if(!['linechart', 'piechart'].includes(this.type)) break;
						this._drawBottomLegend();
						break;
				}
			} else if(this.type === 'piechart') {
				switch(this.legendType) {
					case 'bottom':
						if(!['linechart', 'piechart'].includes(this.type)) break;
						this._drawBottomLegend();
						break;
					default:
						if(!['linechart', 'piechart'].includes(this.type)) break;
						this._drawTopRightLegend();
						break;
				}
			}
		}
	},

	_drawTopRightLegend() {
		const legendGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		Object.entries(this.data).forEach(([name, _], i) => {
			const [x, y] = this._chartCoords(0.9, 1 - 0.14 - this.fontSize * 2 * i / this.svg.clientHeight);
			
			// Color box
			const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			box.setAttribute('x', x);
			box.setAttribute('y', y - this.fontSize/2);
			box.setAttribute('width', this.fontSize);
			box.setAttribute('height', this.fontSize);
			box.setAttribute('fill', this.dataColors[i % this.dataColors.length]);
			legendGroup.appendChild(box);

			// Label
			const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
			text.setAttribute('x', x - this.fontSize);
			text.setAttribute('y', y);
			text.setAttribute('text-anchor', 'end');
			text.setAttribute('font-size', this.fontSize);
			text.setAttribute('fill', this.axisColor);
			text.textContent = name;
			legendGroup.appendChild(text);
		});
		this.chartGroup.appendChild(legendGroup);
	},

	_drawBottomLegend() {
		const legendGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		const nKeys = Object.keys(this.data).length;
		const longestNameLength = Math.max(...Object.keys(this.data).map(name => name.length));
		const legendNameSpacing = (longestNameLength * this.fontSize * 0.6 + this.fontSize * 1.5) / this.svg.clientWidth;
		const margin = 1/nKeys - legendNameSpacing;

		if(margin < 0) {
			this._warningMessage('_drawBottomLegend', 'Name/s too long for a bottom legend');
			margin = 0;
		}

		Object.entries(this.data).forEach(([name, _], i) => {
			const [x, y] = this._chartCoords(0.5 * margin + i * (legendNameSpacing + margin), 0.05);
			
			// Color box
			const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			box.setAttribute('x', x - this.fontSize/2);
			box.setAttribute('y', y - this.fontSize/2);
			box.setAttribute('width', this.fontSize);
			box.setAttribute('height', this.fontSize);
			box.setAttribute('fill', this.dataColors[i % this.dataColors.length]);
			legendGroup.appendChild(box);

			// Label
			const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
			text.setAttribute('x', x + this.fontSize * 1.5);
			text.setAttribute('y', y);
			text.setAttribute('text-anchor', 'start');
			text.setAttribute('font-size', this.fontSize);
			text.setAttribute('fill', this.axisColor);
			text.textContent = name;
			legendGroup.appendChild(text);
		});
		this.chartGroup.appendChild(legendGroup);
	},

	_withOpacity(color, opacity) {
		const v = color.split('').splice(1);
		const r = this._getBase10Value(v[0]+v[1]);
		const g = this._getBase10Value(v[2]+v[3]);
		const b = this._getBase10Value(v[4]+v[5]);
		return `rgba(${r},${g},${b},${opacity})`;
	},

	// New method for live updating data
	updateData(newData) {
		if(this.error) return;
		
		// Validate the new data
		if(!this._validateData(newData)) {
			return;
		}
		
		// Update the data
		this.data = newData;
		
		// Recalculate min/max values
		let yMin = Infinity;
		let yMax = -Infinity;
		let xMin = Infinity;
		let xMax = -Infinity;
		Object.values(this.data).forEach((f) => {
			for(let i = 0; i < f.length; i++) {
				if(f[i][1] < yMin) yMin = f[i][1];
				if(f[i][1] > yMax) yMax = f[i][1];
				if(f[i][0] < xMin) xMin = f[i][0];
				if(f[i][0] > xMax) xMax = f[i][0];
			}
		});
		if(this.minX !== undefined) xMin = this.minX;
		if(this.minY !== undefined) yMin = this.minY;
		if(this.maxX !== undefined) xMax = this.maxX;
		if(this.maxY !== undefined) yMax = this.maxY;
		
		// Handle case where min and max are equal
		if (xMin === xMax) {
			xMin -= 0.5;
			xMax += 0.5;
		}
		if (yMin === yMax) {
			yMin -= 0.5;
			yMax += 0.5;
		}
		
		// Store min/max values for later use in updates
		this.xMin = xMin;
		this.xMax = xMax;
		this.yMin = yMin;
		this.yMax = yMax;
		
		// If live update is enabled, use requestAnimationFrame for smooth updates
		if(this.liveUpdate) {
			const now = Date.now();
			
			// Cancel any pending animation frame
			if(this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
			}
			
			// Schedule the update on the next animation frame
			this.animationFrameId = requestAnimationFrame(() => {
				// Only update if we're not in the middle of another update
				if(!this.isUpdating) {
					this.isUpdating = true;
					
					// Create a promise to ensure the update completes
					return new Promise(resolve => {
						// Update the data paths
						this._updateDataPaths();
						
						// Force a repaint
						this.draw();
						
						// Mark update as complete
						this.isUpdating = false;
						this.lastUpdateTime = now;
						
						// Resolve the promise
						resolve();
					});
				}
			});
		} else {
			// If live update is disabled, just redraw
			this.draw();
		}
	},
	
	// New method to efficiently update only the data paths
	_updateDataPaths() {
		// Find the data group
		const dataGroup = this.chartGroup.querySelector('g:last-child');
		if(!dataGroup) return;
		
		// Clear existing paths
		while(dataGroup.firstChild) {
			dataGroup.removeChild(dataGroup.firstChild);
		}
		
		// Debug min/max values
		console.log("Min/Max values:", {
			xMin: this.xMin,
			xMax: this.xMax,
			yMin: this.yMin,
			yMax: this.yMax
		});
		
		// Update only the data paths
		Object.entries(this.data).forEach(([key, points], idx) => {
			if(points.length < 2) return;
			
			// Debug first point
			console.log("First point:", points[0]);
			
			// Create the path
			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			
			// Calculate normalized coordinates for first point
			const xNorm = (points[0][0] - this.xMin)/(this.xMax - this.xMin);
			const yNorm = (points[0][1] - this.yMin)/(this.yMax - this.yMin);
			
			// Debug normalized coordinates
			console.log("Normalized coordinates:", {xNorm, yNorm});
			
			// Generate path data
			let d = `M ${this._chartCoords(xNorm, yNorm).join(',')}`;
			
			for(let i = 1; i < points.length; i++) {
				// Calculate normalized coordinates
				const xNorm = (points[i][0] - this.xMin)/(this.xMax - this.xMin);
				const yNorm = (points[i][1] - this.yMin)/(this.yMax - this.yMin);
				
				d += ` L ${this._chartCoords(xNorm, yNorm).join(',')}`;
			}
			
			// Set path attributes
			path.setAttribute('d', d);
			path.setAttribute('stroke', this.dataColors[idx % this.dataColors.length]);
			path.setAttribute('stroke-width', this.lineWidth);
			path.setAttribute('fill', 'none');
			
			// Add the path
			dataGroup.appendChild(path);
		});
	},
	
	// Helper method to validate data (to be overridden by chart types)
	_validateData(data) {
		// Base implementation - to be overridden by specific chart types
		return true;
	}
}

JSGrof.LineChart = function (canvasId, data, options) {
	this.type = 'linechart';

	this._initOptions(options === undefined ? {} : options);
	this._initCanvas(canvasId);
	
	// Data validation
	if(!this._validateData(data)) {
		return;
	}
	
	this.data = data;

	let yMin = Infinity;
	let yMax = -Infinity;
	let xMin = Infinity;
	let xMax = -Infinity;
	Object.values(this.data).forEach((f) => {
		for(let i = 0; i < f.length; i++) {
			if(f[i][1] < yMin) yMin = f[i][1];
			if(f[i][1] > yMax) yMax = f[i][1];
			if(f[i][0] < xMin) xMin = f[i][0];
			if(f[i][0] > xMax) xMax = f[i][0];
		}
	});
	if(this.minX !== undefined) xMin = this.minX;
	if(this.minY !== undefined) yMin = this.minY;
	if(this.maxX !== undefined) xMax = this.maxX;
	if(this.maxY !== undefined) yMax = this.maxY;

	// Store min/max values for later use in updates
	this.xMin = xMin;
	this.xMax = xMax;
	this.yMin = yMin;
	this.yMax = yMax;

	this._drawSelf = () => {
		// Create groups for different chart elements
		const axesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		const dataGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		this.chartGroup.appendChild(axesGroup);
		this.chartGroup.appendChild(gridGroup);
		this.chartGroup.appendChild(dataGroup);

		/* y axis */
		const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
		const [yStartX, yStartY] = this._chartCoords(0, 0);
		const [yEndX, yEndY] = this._chartCoords(0, 1);
		yAxis.setAttribute('x1', yStartX);
		yAxis.setAttribute('y1', yStartY);
		yAxis.setAttribute('x2', yEndX);
		yAxis.setAttribute('y2', yEndY);
		yAxis.setAttribute('stroke', this.axisColor);
		yAxis.setAttribute('stroke-width', this.lineWidth);
		axesGroup.appendChild(yAxis);

		/* x axis */
		const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
		const [xStartX, xStartY] = this._chartCoords(0, 0);
		const [xEndX, xEndY] = this._chartCoords(1, 0);
		xAxis.setAttribute('x1', xStartX);
		xAxis.setAttribute('y1', xStartY);
		xAxis.setAttribute('x2', xEndX);
		xAxis.setAttribute('y2', xEndY);
		xAxis.setAttribute('stroke', this.axisColor);
		xAxis.setAttribute('stroke-width', this.lineWidth);
		axesGroup.appendChild(xAxis);

		/* y and x ticks */
		let {
			start: startY,
			spacing: spacingY,
			end: endY
		} = this._dataToTicks(this.yMin, this.yMax);
		let {
			start: startX,
			spacing: spacingX,
			end: endX
		} = this._dataToTicks(this.xMin, this.xMax);

		if(this.minX !== undefined) startX = this.minX;
		if(this.minY !== undefined) startY = this.minY;
		if(this.maxX !== undefined) endX = this.maxX;
		if(this.maxY !== undefined) endY = this.maxY;
		if(this.tickSpacingX !== undefined) spacingX = this.tickSpacingX;
		if(this.tickSpacingY !== undefined) spacingY = this.tickSpacingY;

		// y ticks
		let nTicksY = (endY - startY) / spacingY;
		let tickSpacingY = 1/nTicksY;
		let endIdxY = startY + Math.ceil(nTicksY)*spacingY > endY ? nTicksY : nTicksY+1;

		for(let i = 0; i < endIdxY; i++) {
			// Line
			const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
			const [tickStartX, tickStartY] = this._chartCoords(-0.02, tickSpacingY*i);
			const [tickEndX, tickEndY] = this._chartCoords(0, tickSpacingY*i);
			tickLine.setAttribute('x1', tickStartX);
			tickLine.setAttribute('y1', tickStartY);
			tickLine.setAttribute('x2', tickEndX);
			tickLine.setAttribute('y2', tickEndY);
			tickLine.setAttribute('stroke', this.axisColor);
			tickLine.setAttribute('stroke-width', this.lineWidth);
			axesGroup.appendChild(tickLine);

			if(this.grid || this.gridY) {
				const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				const [gridStartX, gridStartY] = this._chartCoords(0, tickSpacingY*i);
				const [gridEndX, gridEndY] = this._chartCoords(1.0, tickSpacingY*i);
				gridLine.setAttribute('x1', gridStartX);
				gridLine.setAttribute('y1', gridStartY);
				gridLine.setAttribute('x2', gridEndX);
				gridLine.setAttribute('y2', gridEndY);
				gridLine.setAttribute('stroke', this._withOpacity(this.strokeColor, 0.3));
				gridLine.setAttribute('stroke-width', this.lineWidth);
				gridGroup.appendChild(gridLine);
			}

			// Text
			const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text");
			const [textX, textY] = this._chartCoords(-0.05, tickSpacingY*i); // Move Y-axis tick labels closer to the axis
			tickText.setAttribute('x', textX);
			tickText.setAttribute('y', textY);
			tickText.setAttribute('text-anchor', 'end');
			tickText.setAttribute('dominant-baseline', 'middle');
			tickText.setAttribute('font-size', this.fontSize);
			tickText.setAttribute('fill', this.strokeColor);
			tickText.textContent = this._formatFloat(this._integerAddition(startY, this._integerMultiplication(i,spacingY))) + (this.tickSuffixY ?? '');
			axesGroup.appendChild(tickText);
		}

		// x ticks
		let nTicksX = (endX - startX) / spacingX;
		let tickSpacingX = 1/nTicksX;
		let endIdxX = startX + Math.ceil(nTicksX)*spacingX > endX ? nTicksX : nTicksX+1;
		if(this.axisLabels) {
			if(this.axisLabels.length !== Math.ceil(endIdxX)) {
				this._errorMessage('_drawSelf', 'Missing or too many labels in axisLabels');
				return;
			}
		}

		for(let i = 0; i < endIdxX; i++) {
			// Line
			const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
			const [tickStartX, tickStartY] = this._chartCoords(tickSpacingX*i, -0.02);
			const [tickEndX, tickEndY] = this._chartCoords(tickSpacingX*i, 0);
			tickLine.setAttribute('x1', tickStartX);
			tickLine.setAttribute('y1', tickStartY);
			tickLine.setAttribute('x2', tickEndX);
			tickLine.setAttribute('y2', tickEndY);
			tickLine.setAttribute('stroke', this.axisColor);
			tickLine.setAttribute('stroke-width', this.lineWidth);
			axesGroup.appendChild(tickLine);

			if(this.grid || this.gridX) {
				const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				const [gridStartX, gridStartY] = this._chartCoords(tickSpacingX*i, 0);
				const [gridEndX, gridEndY] = this._chartCoords(tickSpacingX*i, 1.0);
				gridLine.setAttribute('x1', gridStartX);
				gridLine.setAttribute('y1', gridStartY);
				gridLine.setAttribute('x2', gridEndX);
				gridLine.setAttribute('y2', gridEndY);
				gridLine.setAttribute('stroke', this._withOpacity(this.strokeColor, 0.3));
				gridLine.setAttribute('stroke-width', this.lineWidth);
				gridGroup.appendChild(gridLine);
			}

			// Text
			const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text");
			const [textX, textY] = this._chartCoords(tickSpacingX*i, -0.08); // Keep X-axis tick labels below the chart
			tickText.setAttribute('x', textX);
			tickText.setAttribute('y', textY);
			tickText.setAttribute('text-anchor', 'middle');
			tickText.setAttribute('dominant-baseline', 'top');
			tickText.setAttribute('font-size', this.fontSize);
			tickText.setAttribute('fill', this.strokeColor);
			if(this.axisLabels) {
				tickText.setAttribute('transform', `rotate(-45 ${textX} ${textY})`);
				tickText.textContent = this.axisLabels[i];
			} else {
				tickText.textContent = this._formatFloat(this._integerAddition(startX, this._integerMultiplication(i,spacingX))) + (this.tickSuffixX ?? '');
			}
			axesGroup.appendChild(tickText);
		}

		// Functions 
		Object.entries(this.data).forEach(([functionName, points], i) => {

            if(points.length < 2) return;

			const color = this.dataColors[i % this.dataColors.length];
			
			if(
				((typeof(this.lines) === 'boolean' && this.lines) ||
				(typeof(this.lines) === 'object' && this.lines[i]))
				&& points.length > 0
			) {
				// Draw line
				const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
				let pathData = `M ${this._chartCoords(
					(points[0][0] - this.xMin) / (this.xMax - this.xMin),
					(points[0][1] - this.yMin) / (this.yMax - this.yMin)
				).join(' ')}`;
				
				for(let j = 1; j < points.length; j++) {
					pathData += ` L ${this._chartCoords(
						(points[j][0] - this.xMin) / (this.xMax - this.xMin),
						(points[j][1] - this.yMin) / (this.yMax - this.yMin)
					).join(' ')}`;
				}

				if(this.areaUnder) {
					pathData += ` L ${this._chartCoords((points[points.length-1][0] - this.xMin) / (this.xMax - this.xMin), 0).join(' ')}`;
					pathData += ` L ${this._chartCoords((points[0][0] - this.xMin) / (this.xMax - this.xMin), 0).join(' ')}`;
					pathData += ' Z';
					path.setAttribute('fill', this._withOpacity(color, 0.1));
				}

				path.setAttribute('d', pathData);
				path.setAttribute('stroke', color);
				path.setAttribute('stroke-width', this.lineWidth);
				path.setAttribute('fill', 'none');
				dataGroup.appendChild(path);
			}

			if(
				(typeof(this.points) === 'boolean' && this.points) ||
				(typeof(this.points) === 'object' && this.points[i])
			) {
				points.forEach(([x, y]) => {
					const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
					const [cx, cy] = this._chartCoords(
						(x - this.xMin) / (this.xMax - this.xMin),
						(y - this.yMin) / (this.yMax - this.yMin)
					);
					const radius = 3 * (this.fontSize/JSGrof.CHART_CONSTANTS.FONT_SIZE);
					circle.setAttribute('cx', cx);
					circle.setAttribute('cy', cy);
					circle.setAttribute('r', radius);
					circle.setAttribute('fill', color);
					dataGroup.appendChild(circle);
				});
			}
		});
	}

	if(!this.animated) {this.draw(); this.draw();}

	this._animateSelf = () => {
		if(this.animationPCT == 1) {
			this.data = this.finalData;
			return;
		}

		let newData = {};
		switch(this.animationType) {
			case 'left-to-right':
				Object.entries(this.finalData).forEach(([key, val]) => {
					newData[key] = [];
					for(let i = 0; i < val.length * this.animationPCT; i++) {
						newData[key].push(val[i]);
					}
				});
				break;

			default: // y-scale
				Object.entries(this.finalData).forEach(([key, val]) => {
					newData[key] = [];
					for(let i = 0; i < val.length; i++) {
						newData[key].push([val[i][0], val[i][1]*this.animationPCT]);
					}
				});
				break;
		}
		this.data = newData;
		this.draw();
	}

	this._mousemove = (x, y) => {
		if(this.error) return;
		
		try {
			this.draw();
			
			// Closest point in x for each function
			let {
				start: startY,
				spacing: spacingY,
				end: endY
			} = this._dataToTicks(this.yMin, this.yMax);
			let {
				start: startX,
				spacing: spacingX,
				end: endX
			} = this._dataToTicks(this.xMin, this.xMax);

			if(this.minX !== undefined) startX = this.minX;
			if(this.minY !== undefined) startY = this.minY;
			if(this.maxX !== undefined) endX = this.maxX;
			if(this.maxY !== undefined) endY = this.maxY;
			if(this.tickSpacingX !== undefined) spacingX = this.tickSpacingX;
			if(this.tickSpacingY !== undefined) spacingY = this.tickSpacingY;

			let closestTexts = [], names = Object.keys(this.data);

			Object.values(this.data).forEach((points, j) => {
				if(!points || !Array.isArray(points) || points.length === 0) return;
				
				let closestD = Infinity;
				let closest;
				
				for(let i = 0; i < points.length; i++) {
					if(!points[i] || !Array.isArray(points[i]) || points[i].length < 2) continue;
					
					if(Math.abs(points[i][0] - x*(endX-startX) - startX) < closestD) {
						closestD = Math.abs(points[i][0] - x*(endX-startX) - startX);
						closest = points[i];
					}
				}
				
				if(!closest) return;

				let txt;
				if(this.axisLabels && parseInt(closest[0]) === closest[0]) {
					let xValue = spacingX === 1 ? (this.axisLabels[parseInt(closest[0])]) : '?';
					txt = `(${xValue}; ${this._formatFloat((closest[1]).toFixed(this.interactivityPrecisionY)) + (this.tickSuffixY ?? '')})`;
				} else {
					txt = `(${this._formatFloat((closest[0]).toFixed(this.interactivityPrecisionX)) + (this.tickSuffixX ?? '')}; ${this._formatFloat((closest[1]).toFixed(this.interactivityPrecisionY)) + (this.tickSuffixY ?? '')})`;
				}
				closestTexts.push(txt);

				let pos = this._chartCoords(
					(closest[0] - startX) / (endX - startX),
					(closest[1] - startY) / (endY - startY)
				);

				// Draw highlight box
				const highlight = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				highlight.setAttribute('x', pos[0] - 0.5 * this.fontSize);
				highlight.setAttribute('y', pos[1] - 0.5 * this.fontSize);
				highlight.setAttribute('width', this.fontSize);
				highlight.setAttribute('height', this.fontSize);
				highlight.setAttribute('fill', this.dataColors[j % this.dataColors.length]);
				this.chartGroup.appendChild(highlight);
			});

			if(closestTexts.length === 0) return;

			let pos = this._chartCoords(x, y);
			
			closestTexts = closestTexts.map((x, i) => names[i] + ': ' + x);
			let txtWidth = Math.max(...closestTexts.map(text => text.length * this.fontSize * 0.6));
			txtWidth += this.fontSize;

			let txtHeight = closestTexts.length * this.fontSize * 2.5;
			pos[1] -= txtHeight + this.fontSize * 0.5;

			// Draw tooltip background
			const tooltipBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			tooltipBg.setAttribute('x', pos[0] - txtWidth/2 - this.fontSize);
			tooltipBg.setAttribute('y', pos[1]);
			tooltipBg.setAttribute('width', txtWidth + this.fontSize * 2);
			tooltipBg.setAttribute('height', txtHeight);
			tooltipBg.setAttribute('fill', this.bgColor ?? this._getBWContrasting(this.strokeColor));
			tooltipBg.setAttribute('stroke', this.strokeColor);
			tooltipBg.setAttribute('stroke-width', this.lineWidth);
			tooltipBg.setAttribute('rx', this.fontSize/2);
			this.chartGroup.appendChild(tooltipBg);

			// Draw tooltip text
			closestTexts.forEach((text, i) => {
				const tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
				tooltipText.setAttribute('x', pos[0] + this.fontSize - txtWidth * 0.5);
				tooltipText.setAttribute('y', pos[1] + ((i+0.5) / closestTexts.length) * txtHeight);
				tooltipText.setAttribute('font-size', this.fontSize);
				tooltipText.setAttribute('fill', this.strokeColor);
				tooltipText.textContent = text;
				this.chartGroup.appendChild(tooltipText);

				// Draw color indicator
				const colorBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				colorBox.setAttribute('x', pos[0] - this.fontSize/4 - txtWidth * 0.5);
				colorBox.setAttribute('y', pos[1] + ((i+0.5) / closestTexts.length) * txtHeight - this.fontSize/4);
				colorBox.setAttribute('width', this.fontSize/2);
				colorBox.setAttribute('height', this.fontSize/2);
				colorBox.setAttribute('fill', this.dataColors[i % this.dataColors.length]);
				this.chartGroup.appendChild(colorBox);
			});
		} catch (e) {
			console.warn("Error in _mousemove:", e);
		}
	}

	// Override the _validateData method for LineChart
	this._validateData = (data) => {
		if(!data.constructor || data.constructor.name !== 'Object') {
			this._errorMessage('linechart', 'data must be of type object.');
			return false;
		}
		if(Object.keys(data).length === 0) {
			this._errorMessage('linechart', 'No function in data.');
			return false;
		}
		for(let i = 0; i < Object.keys(data).length; i++) {
			let values = Object.values(data)[i];
			if(!values.constructor || values.constructor.name !== 'Array') {
				this._errorMessage('linechart', 'Incorrect function in data. Values must be of type Array.');
				return false;
			}
			for(let j = 0; j < values.length; j++) {
				let point = values[j];
				if(!point.constructor || point.constructor.name !== 'Array') {
					this._errorMessage('linechart', 'Incorrect datapoint in function. datapoint must be of type Array.');
					return false;
				}
				if(point.length !== 2) {
					this._errorMessage('linechart', 'Incorrect datapoint in function. Length must be 2 (x and y value).');
					return false;
				}
				if(
					!this._checkFloat(point[0], -Infinity, Infinity)
					|| !this._checkFloat(point[1], -Infinity, Infinity)
				) {
					this._errorMessage('linechart', 'Incorrect datapoint in function. All values should be numbers.');
					return false;
				}
			}
		}
		return true;
	};
	
	// Override updateData to recalculate min/max values
	this.updateData = (newData) => {
		if(this.error) return;
		
		// Validate the new data
		if(!this._validateData(newData)) {
			return;
		}
		
		// Update the data
		this.data = newData;
		
		// Recalculate min/max values
		this.yMin = Infinity;
		this.yMax = -Infinity;
		this.xMin = Infinity;
		this.xMax = -Infinity;
		Object.values(this.data).forEach((f) => {
			for(let i = 0; i < f.length; i++) {
				if(f[i][1] < this.yMin) this.yMin = f[i][1];
				if(f[i][1] > this.yMax) this.yMax = f[i][1];
				if(f[i][0] < this.xMin) this.xMin = f[i][0];
				if(f[i][0] > this.xMax) this.xMax = f[i][0];
			}
		});
		if(this.minX !== undefined) this.xMin = this.minX;
		if(this.minY !== undefined) this.yMin = this.minY;
		if(this.maxX !== undefined) this.xMax = this.maxX;
		if(this.maxY !== undefined) this.yMax = this.maxY;
		
		// If live update is enabled, schedule an update
		if(this.liveUpdate) {
			const now = Date.now();
			if(now - this.lastUpdateTime >= this.updateInterval) {
				// Update immediately if enough time has passed
				this.draw();
				this.lastUpdateTime = now;
			} else if(!this.pendingUpdate) {
				// Schedule an update for later
				this.pendingUpdate = true;
				setTimeout(() => {
					this.draw();
					this.lastUpdateTime = Date.now();
					this.pendingUpdate = false;
				}, this.updateInterval - (now - this.lastUpdateTime));
			}
		} else {
			// If live update is disabled, just redraw
			this.draw();
		}
	};
}
Object.assign(JSGrof.LineChart.prototype, JSGrof.ChartPrototype);

JSGrof.PieChart = function(canvasId, data, options) {
	this.type = 'piechart';

	this._initOptions(options === undefined ? {} : options);
	this._initCanvas(canvasId);
	
	// Data validation
	if(!this._validateData(data)) {
		return;
	}
	
	this.data = data;

	this._drawSelf = () => {
		let currentAngle = 0;
		let total = Object.values(this.data).reduce((a, b) => a+b, 0);
		let r = Math.min(
			(1 - this.chartPaddingLeft - this.chartPaddingRight) * this.svg.clientWidth * 0.5,
			(1 - this.chartPaddingTop - this.chartPaddingBottom) * this.svg.clientHeight * 0.5
		);
		let [cx, cy] = this._chartCoords(0.5, 0.5);

		for(let i = 0; i < Object.keys(this.data).length; i++) {
			let pct = Object.values(this.data)[i] / total;
			let startAngle = currentAngle + Math.PI*1.5;
			let endAngle = currentAngle + (this.animationPCT === undefined ? 1 : this.animationPCT)*pct*Math.PI*2 + Math.PI*1.5;
			
			// Create pie slice path
			const slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
			const startX = cx + r * Math.cos(startAngle);
			const startY = cy + r * Math.sin(startAngle);
			const endX = cx + r * Math.cos(endAngle);
			const endY = cy + r * Math.sin(endAngle);
			
			const largeArcFlag = pct > 0.5 ? 1 : 0;
			const pathData = [
				"M", cx, cy,
				"L", startX, startY,
				"A", r, r, 0, largeArcFlag, 1, endX, endY,
				"Z"
			].join(" ");
			
			slice.setAttribute("d", pathData);
			slice.setAttribute("fill", this.dataColors[i % this.dataColors.length]);
			this.chartGroup.appendChild(slice);
			
			if(this.dataLabels) {
				let theText = this._formatFloat(Object.values(this.data)[i]) + 
					(this.percentage ? ' (' + this._formatFloat((100*Object.values(this.data)[i] / total).toFixed(this.percentagePrecision)) + '%)' : '');
				
				let cosHalfAngle = Math.cos(currentAngle + Math.PI*1.5 + 0.5*pct*Math.PI*2);
				let sinHalfAngle = Math.sin(currentAngle + Math.PI*1.5 + 0.5*pct*Math.PI*2);

				if(this.innerLabels) {
					// Inner label text
					const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
					label.setAttribute("x", cx + r*0.75*cosHalfAngle);
					label.setAttribute("y", cy + r*0.75*sinHalfAngle);
					label.setAttribute("text-anchor", "middle");
					label.setAttribute("dominant-baseline", "middle");
					label.setAttribute("font-size", this.fontSize);
					label.setAttribute("fill", this._getBWContrasting(this.dataColors[i % this.dataColors.length]));
					label.textContent = theText;
					this.chartGroup.appendChild(label);
				} else {
					// Outer label line
					const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
					line.setAttribute("x1", cx + r*cosHalfAngle);
					line.setAttribute("y1", cy + r*sinHalfAngle);
					line.setAttribute("x2", cx + r*1.1*cosHalfAngle);
					line.setAttribute("y2", cy + r*1.1*sinHalfAngle);
					line.setAttribute("stroke", this.axisColor);
					line.setAttribute("stroke-width", this.lineWidth);
					this.chartGroup.appendChild(line);

					// Outer label text
					const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
					const x = cx + r*1.15*cosHalfAngle;
					const y = cy + r*1.15*sinHalfAngle;
					label.setAttribute("x", x);
					label.setAttribute("y", y);
					label.setAttribute("text-anchor", "middle");
					label.setAttribute("dominant-baseline", "middle");
					label.setAttribute("font-size", this.fontSize);
					label.setAttribute("fill", this.axisColor);
					label.setAttribute("transform", `rotate(${(currentAngle + 0.5*pct*Math.PI*2) * 180/Math.PI}, ${x}, ${y})`);
					label.textContent = theText;
					this.chartGroup.appendChild(label);
				}
			}
			
			currentAngle += pct * Math.PI * 2;
		}
	}
	if(!this.animated) {this.draw(); this.draw();}

	this._animateSelf = () => {
		if(this.animationPCT == 1) {
			this.data = this.finalData;
			return;
		}

		switch(this.animationType) {
			default: // circular-scale
				break;
		}

		this.draw();
	}

	this._mousemove = (x, y) => {
		this.draw();

		// Check to see if in circle
		let r = Math.min(
			(1 - this.chartPaddingLeft - this.chartPaddingRight) * this.svg.clientWidth * 0.5,
			(1 - this.chartPaddingTop - this.chartPaddingBottom) * this.svg.clientHeight * 0.5
		);
		let [chartX, chartY] = this._chartCoords(x, y);
		let [cx, cy] = this._chartCoords(0.5, 0.5);
		if(Math.sqrt(Math.pow(chartX - cx, 2) + Math.pow(chartY - cy, 2)) > r || this.percentage !== undefined) return;

		// Find the angle of the point
		let angle = -Math.atan((chartY - cy)/(chartX - cx));
		if(chartX - cx < 0) angle += Math.PI;
		angle = (450 - angle*180/Math.PI) % 360;

		// Find the right part
		let currentAngle = 0;
		let total = Object.values(this.data).reduce((a, b) => a+b, 0);
		for(let i = 0; i < Object.keys(this.data).length; i++) {
			let pct = Object.values(this.data)[i] / total;
			if(!(currentAngle < angle && currentAngle + pct * 360 > angle)) {
				currentAngle += pct * 360;
				continue;
			}

			// Create highlighted slice
			const slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
			const startAngle = currentAngle*Math.PI/180 + Math.PI*1.5;
			const endAngle = currentAngle*Math.PI/180 + (this.animationPCT === undefined ? 1 : this.animationPCT)*pct*Math.PI*2 + Math.PI*1.5;
			
			const startX = cx + r*1.05 * Math.cos(startAngle);
			const startY = cy + r*1.05 * Math.sin(startAngle);
			const endX = cx + r*1.05 * Math.cos(endAngle);
			const endY = cy + r*1.05 * Math.sin(endAngle);
			
			const largeArcFlag = pct > 0.5 ? 1 : 0;
			const pathData = [
				"M", cx, cy,
				"L", startX, startY,
				"A", r*1.05, r*1.05, 0, largeArcFlag, 1, endX, endY,
				"Z"
			].join(" ");
			
			slice.setAttribute("d", pathData);
			slice.setAttribute("fill", this.dataColors[i % this.dataColors.length]);
			this.chartGroup.appendChild(slice);

			// Show percentage
			let theText = this._formatFloat((100*Object.values(this.data)[i] / total).toFixed(this.interactivityPercentagePrecision)) + '%';
			let cosHalfAngle = Math.cos(currentAngle*Math.PI/180 + Math.PI*1.5 + 0.5*pct*Math.PI*2);
			let sinHalfAngle = Math.sin(currentAngle*Math.PI/180 + Math.PI*1.5 + 0.5*pct*Math.PI*2);
			
			const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
			label.setAttribute("x", cx + 0.8*r*cosHalfAngle);
			label.setAttribute("y", cy + 0.8*r*sinHalfAngle);
			label.setAttribute("text-anchor", "middle");
			label.setAttribute("dominant-baseline", "middle");
			label.setAttribute("font-size", this.fontSize);
			label.setAttribute("fill", this._getBWContrasting(this.dataColors[i % this.dataColors.length]));
			label.textContent = theText;
			this.chartGroup.appendChild(label);
		}
	}

	// Override the _validateData method for PieChart
	this._validateData = (data) => {
		if(!data.constructor || data.constructor.name !== 'Object') {
			this._errorMessage('piechart', 'data must be of type Object.');
			return false;
		}
		if(Object.keys(data).length === 0) {
			this._errorMessage('piechart', 'data object cannot be empty.');
			return false;
		}
		for(let i = 0; i < Object.keys(data).length; i++) {
			if(!this._checkString(Object.keys(data)[i])) {
				this._errorMessage('piechart', 'Incorrect key in data (must be of type string).');
				return false;
			}
			if(!this._checkFloat(Object.values(data)[i], 0, Infinity)) {
				this._errorMessage('piechart', 'Incorrect value in data (must be a non-negative number).');
				return false;
			}
		}
		return true;
	};
}
Object.assign(JSGrof.PieChart.prototype, JSGrof.ChartPrototype);

JSGrof.BarChart = function(canvasId, data, options) {
	this.type = 'barchart';

	this._initOptions(options === undefined ? {} : options);
	this._initCanvas(canvasId);
	
	// Data validation
	if(!this._validateData(data)) {
		return;
	}
	
	this.data = data;

	// Initialize min/max values
	this.yMin = Infinity;
	this.yMax = -Infinity;
	Object.values(this.data).forEach((val) => {
		if(val < this.yMin) this.yMin = val;
		if(val > this.yMax) this.yMax = val;
	});
	if(this.min !== undefined) this.yMin = this.min;
	if(this.max !== undefined) this.yMax = this.max;

	this._drawSelf = () => {

		/* y axis */
		this.ctx.lineWidth = this.resolutionUpscale*this.lineWidth;
		this.ctx.strokeStyle = this.axisColor;
		this.ctx.moveTo(...this._chartCoords(0, 0));
		this.ctx.lineTo(...this._chartCoords(0, 1));
		this.ctx.stroke();

		/* x axis */
		this.ctx.strokeStyle = this.axisColor;
		this.ctx.moveTo(...this._chartCoords(0, 0));
		this.ctx.lineTo(...this._chartCoords(1, 0));
		this.ctx.stroke();

		/* y ticks */
		let {
			start: startY,
			spacing: spacingY,
			end: endY
		} = this._dataToTicks(this.yMin, this.yMax);
		if(this.min !== undefined) startY = this.min;
		if(this.max !== undefined) endY = this.max;

		let nTicksY = (endY - startY) / spacingY;
		let tickSpacingY = 1/nTicksY;

		// y ticks
		let endIdxY = startY + Math.ceil(nTicksY)*spacingY > endY ? nTicksY : nTicksY+1;
		for(let i = 0; i < endIdxY; i++) {
			
			// Line
			this.ctx.strokeStyle = this.axisColor;
			this.ctx.beginPath();
			this.ctx.moveTo(...this._chartCoords(-0.02, tickSpacingY*i));
			this.ctx.lineTo(...this._chartCoords(0, tickSpacingY*i));
			this.ctx.closePath();
			this.ctx.stroke();

			if(this.grid || this.gridY) {
				this.ctx.strokeStyle = this._withOpacity(this.strokeColor, 0.3);
				this.ctx.beginPath();
				this.ctx.moveTo(...this._chartCoords(0, tickSpacingY*i));
				this.ctx.lineTo(...this._chartCoords(1.0, tickSpacingY*i));
				this.ctx.closePath();
				this.ctx.stroke();
				this.ctx.strokeStyle = this.axisColor;
			}

			// Text
			this.ctx.fillStyle = this.strokeColor;
			this.ctx.font = this.fontSize*this.resolutionUpscale + 'px system-ui';
			this.ctx.textAlign = 'right';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillText(
				this._formatFloat(this._integerAddition(startY, this._integerMultiplication(i,spacingY))) + (this.tickSuffix ?? this.tickSuffixY ?? ''),
				...this._chartCoords(-0.03, tickSpacingY*i)
			);
		}

		// x ticks & bars
		let barPlusSpaceSize = 1/Object.keys(this.data).length;
		let barSize = 0.5*barPlusSpaceSize;
		let barSpaceSize = barPlusSpaceSize-barSize;
		for(let i = 0; i < Object.keys(this.data).length; i++) {
			
			// Tick line
			this.ctx.strokeStyle = this.axisColor;
			this.ctx.beginPath();
			this.ctx.moveTo(...this._chartCoords(barSpaceSize*0.5+barSize*0.5+barPlusSpaceSize*i, -0.02));
			this.ctx.lineTo(...this._chartCoords(barSpaceSize*0.5+barSize*0.5+barPlusSpaceSize*i, 0));
			this.ctx.closePath();
			this.ctx.stroke();

			// Tick text
			this.ctx.fillStyle = this.axisColor;
			this.ctx.font = this.fontSize*this.resolutionUpscale + 'px system-ui';
			this.ctx.textAlign = 'right';
			this.ctx.textBaseline = 'top';
			let [x, y] = this._chartCoords(barSpaceSize*0.5+barSize*0.5+barPlusSpaceSize*i, -0.03);
			this.ctx.translate(x, y);
			this.ctx.rotate(-Math.PI*0.25);
			this.ctx.fillText(Object.keys(this.data)[i], 0, 0);
			this.ctx.translate(-x, -y);
			this.ctx.resetTransform();
		
			// Bar
			let [barXMin, barYMin] = this._chartCoords(barSpaceSize*0.5+barPlusSpaceSize*i, 0);
			let [barXMax, barYMax] = this._chartCoords(
				barSpaceSize*0.5+barSize+barPlusSpaceSize*i,
				(Object.values(this.data)[i] - startY) / (endY - startY)
			);
			this.ctx.fillStyle = this.dataColors[i % this.dataColors.length];
			this.ctx.fillRect(
				barXMin, barYMin,
				barXMax-barXMin, barYMax-barYMin
			);

			if(this.dataLabels) {

				this.ctx.textAlign = 'center';
				this.ctx.textBaseline = 'top';

				if(this.innerLabels) {
					this.ctx.fillStyle = this._getBWContrasting(this.dataColors[i % this.dataColors.length]);
					this.ctx.fillText(
						this._formatFloat(Object.values(this.finalData ?? this.data)[i]) + (this.tickSuffix ?? (this.tickSuffixY ?? '')),
						...this._chartCoords(
							barSpaceSize*0.5+barSize*0.5+barPlusSpaceSize*i, 
							(Object.values(this.data)[i] - startY) / (endY - startY) - 0.05
						)
					);
				} else {
					this.ctx.fillStyle = this.strokeColor;
					this.ctx.fillText(
						this._formatFloat(Object.values(this.finalData ?? this.data)[i]) + (this.tickSuffix ?? (this.tickSuffixY ?? '')), 
						...this._chartCoords(
							barSpaceSize*0.5+barSize*0.5+barPlusSpaceSize*i, 
							(Object.values(this.data)[i] - startY) / (endY - startY) + 0.05
						)
					);
				}
			}
		}
	}
	if(!this.animated) {this.draw(); this.draw();}


	this._animateSelf = () => {
		
		if(this.animationPCT == 1) {
			this.data = this.finalData;
			return;
		}

		let newData = {};
		switch(this.animationType) {

			case 'left-to-right':

				for(let i = 0; i < Object.keys(this.finalData).length*this.animationPCT; i++) {
					newData[Object.keys(this.finalData)[i]] = Object.values(this.finalData)[i];
				}
				break;

			default: // y-scale

				for(let i = 0; i < Object.keys(this.finalData).length; i++) {
					newData[Object.keys(this.finalData)[i]] = Object.values(this.finalData)[i]*this.animationPCT;
				}
				break;
		}
		this.data = newData;
		this.draw();
	}


	this._mousemove = (x, y) => {
		
		this.draw();

		if(this.dataLabels) return;

		let barPlusSpaceSize = 1/Object.keys(this.data).length;
		let barSize = 0.5*barPlusSpaceSize;
		let barSpaceSize = barPlusSpaceSize-barSize;
		let {
			start: startY,
			spacing: spacingY,
			end: endY
		} = this._dataToTicks(this.yMin, this.yMax);
		if(this.min !== undefined) startY = this.min;
		if(this.max !== undefined) endY = this.max;

		for(let i = 0; i < Object.keys(this.data).length; i++) {
			
			if(x >= barSpaceSize*0.5+barPlusSpaceSize*i && x <= barSpaceSize*0.5+barSize+barPlusSpaceSize*i && y < (Object.values(this.data)[i] - startY) / (endY - startY)) {

				this.ctx.font = this.fontSize*this.resolutionUpscale + 'px system-ui';
				this.ctx.fillStyle = this._getBWContrasting(this.dataColors[i % this.dataColors.length]);
				this.ctx.fillText(
					this._formatFloat(Object.values(this.finalData ?? this.data)[i]) + (this.tickSuffix ?? (this.tickSuffixY ?? '')),
					...this._chartCoords(
						barSpaceSize*0.5+barSize*0.5+barPlusSpaceSize*i, 
						(Object.values(this.data)[i] - startY) / (endY - startY) - 0.05
					)
				);

				break;
			}
		}

	}

	// Override the _validateData method for BarChart
	this._validateData = (data) => {
		if(!data.constructor || data.constructor.name !== 'Object') {
			this._errorMessage('barchart', 'data must be of type Object.');
			return false;
		}
		if(Object.keys(data).length === 0) {
			this._errorMessage('barchart', 'data object cannot be empty.');
			return false;
		}
		for(let i = 0; i < Object.keys(data).length; i++) {
			if(!this._checkString(Object.keys(data)[i])) {
				this._errorMessage('barchart', 'Incorrect key in data (must be of type string).');
				return false;
			}
			if(!this._checkFloat(Object.values(data)[i], -Infinity, Infinity)) {
				this._errorMessage('barchart', 'Incorrect value in data (must be a number).');
				return false;
			}
		}
		return true;
	};

	// Override updateData to recalculate min/max values
	this.updateData = (newData) => {
		if(this.error) return;
		
		// Validate the new data
		if(!this._validateData(newData)) {
			return;
		}
		
		// Update the data
		this.data = newData;
		
		// Recalculate min/max values
		this.yMin = Infinity;
		this.yMax = -Infinity;
		Object.values(this.data).forEach((val) => {
			if(val < this.yMin) this.yMin = val;
			if(val > this.yMax) this.yMax = val;
		});
		if(this.min !== undefined) this.yMin = this.min;
		if(this.max !== undefined) this.yMax = this.max;
		
		// If live update is enabled, schedule an update
		if(this.liveUpdate) {
			const now = Date.now();
			if(now - this.lastUpdateTime >= this.updateInterval) {
				// Update immediately if enough time has passed
				this.draw();
				this.lastUpdateTime = now;
			} else if(!this.pendingUpdate) {
				// Schedule an update for later
				this.pendingUpdate = true;
				setTimeout(() => {
					this.draw();
					this.lastUpdateTime = Date.now();
					this.pendingUpdate = false;
				}, this.updateInterval - (now - this.lastUpdateTime));
			}
		} else {
			// If live update is disabled, just redraw
			this.draw();
		}
	};
}
Object.assign(JSGrof.BarChart.prototype, JSGrof.ChartPrototype);

JSGrof.HistoChart = function(canvasId, data, options) {
	this.type = 'histochart';

	this._initOptions(options === undefined ? {} : options);
	this._initCanvas(canvasId);
	
	// Data validation
	if(!this._validateData(data)) {
		return;
	}
	
	this.data = data;

	// Initialize min/max values
	this.yMin = Infinity;
	this.yMax = -Infinity;
	data.forEach((val) => {
		if(val < this.yMin) this.yMin = val;
		if(val > this.yMax) this.yMax = val;
	});
	if(this.minY !== undefined) this.yMin = this.minY;
	if(this.maxY !== undefined) this.yMax = this.maxY;

	this._drawSelf = () => {
		let minX = this.minX;
		let maxX = this.maxX;

	    let minY = Infinity;
		let maxY = -Infinity;
		data.forEach((val) => {
			if(val < minY) minY = val;
			if(val > maxY) maxY = val;
		})
		if(this.minY !== undefined) minY = this.minY;
		if(this.maxY !== undefined) maxY = this.maxY;

		/* y axis */
		this.ctx.lineWidth = this.resolutionUpscale*this.lineWidth;
		this.ctx.strokeStyle = this.axisColor;
		this.ctx.moveTo(...this._chartCoords(0, 0));
		this.ctx.lineTo(...this._chartCoords(0, 1));
		this.ctx.stroke();

		/* x axis */
		this.ctx.strokeStyle = this.axisColor;
		this.ctx.moveTo(...this._chartCoords(0, 0));
		this.ctx.lineTo(...this._chartCoords(1, 0));
		this.ctx.stroke();

		/* y ticks */
		let {
			start: startY,
			spacing: spacingY,
			end: endY
		} = this._dataToTicks(minY, maxY);
		if(this.minY !== undefined) startY = this.minY;
		if(this.maxY !== undefined) endY = this.maxY;
		if(this.tickSpacingY !== undefined) spacingY = this.tickSpacingY;

		let nTicksY = (endY - startY) / spacingY;
		let tickSpacingY = 1/nTicksY;

		// y ticks
		let endIdxY = startY + Math.ceil(nTicksY)*spacingY > endY ? nTicksY : nTicksY+1;
		for(let i = 0; i < endIdxY; i++) {
			
			// Line
			this.ctx.strokeStyle = this.axisColor;
			this.ctx.beginPath();
			this.ctx.moveTo(...this._chartCoords(-0.02, tickSpacingY*i));
			this.ctx.lineTo(...this._chartCoords(0, tickSpacingY*i));
			this.ctx.closePath();
			this.ctx.stroke();

			if(this.grid || this.gridY) {
				this.ctx.strokeStyle = this._withOpacity(this.strokeColor, 0.3);
				this.ctx.beginPath();
				this.ctx.moveTo(...this._chartCoords(0, tickSpacingY*i));
				this.ctx.lineTo(...this._chartCoords(1.0, tickSpacingY*i));
				this.ctx.closePath();
				this.ctx.stroke();
				this.ctx.strokeStyle = this.axisColor;
			}

			// Text
			this.ctx.fillStyle = this.strokeColor;
			this.ctx.font = this.fontSize*this.resolutionUpscale + 'px system-ui';
			this.ctx.textAlign = 'right';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillText(
				this._formatFloat(this._integerAddition(startY, this._integerMultiplication(i,spacingY))) + (this.tickSuffix ?? this.tickSuffixY ?? ''),
				...this._chartCoords(-0.03, tickSpacingY*i)
			);
		}

		// x ticks
		let {
			start: startX,
			spacing: spacingX,
			end: endX
		} = this._dataToTicks(minX, maxX);
		if(this.minX !== undefined) startX = this.minX;
		if(this.maxX !== undefined) endX = this.maxX;
		if(this.tickSpacingX !== undefined) spacingX = this.tickSpacingX;

		let nTicksX = (endX - startX) / spacingX;
		let tickSpacingX = 1/nTicksX;
		let endIdxX = startX + Math.ceil(nTicksX)*spacingX > endX ? nTicksX : nTicksX+1;
		
		for(let i = 0; i < endIdxX; i++) {
			
			// Line
			this.ctx.beginPath();
			this.ctx.moveTo(...this._chartCoords(tickSpacingX*i, -0.02));
			this.ctx.lineTo(...this._chartCoords(tickSpacingX*i, 0));
			this.ctx.closePath();
			this.ctx.stroke();


			if(this.grid || this.gridX) {
				this.ctx.strokeStyle = this._withOpacity(this.strokeColor, 0.3);
				this.ctx.beginPath();
				this.ctx.moveTo(...this._chartCoords(tickSpacingX*i, 0));
				this.ctx.lineTo(...this._chartCoords(tickSpacingX*i, 1.0));
				this.ctx.closePath();
				this.ctx.stroke();
				this.ctx.strokeStyle = this.strokeColor;
			}

			// Text
			this.ctx.fillStyle = this.strokeColor;
			this.ctx.font = this.fontSize*this.resolutionUpscale + 'px system-ui';
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'top';
			this.ctx.fillText(
				this._formatFloat(this._integerAddition(startX, this._integerMultiplication(i,spacingX))) + (this.tickSuffixX ?? ''),
				...this._chartCoords(tickSpacingX*i, -0.03)
			);
		}

		// Bars
		let barSize = 1/data.length;
		for(let i = 0; i < data.length; i++) {

			// draw bucket
			let [barXMin, barYMin] = this._chartCoords(barSize*i, 0);
			let [barXMax, barYMax] = this._chartCoords(
				barSize*(i+1),
				(data[i] - startY) / (endY - startY)
			);
			this.ctx.fillStyle = this.dataColors[0];
			this.ctx.fillRect(
				barXMin, barYMin,
				barXMax-barXMin, barYMax-barYMin
			);
			this.ctx.strokeStyle = this._getBWContrasting(this.dataColors[0]);
			this.ctx.strokeRect(
				barXMin, barYMin,
				barXMax-barXMin, barYMax-barYMin
			);
		}
	}
	if(!this.animated) {this.draw(); this.draw();}

	this._animateSelf = () => {

	}

	this._mousemove = (x, y) => {
		if(this.error) return;

		// Clear previous tooltips
		const tooltips = this.chartGroup.querySelectorAll('.tooltip');
		tooltips.forEach(tooltip => tooltip.remove());

		// Get chart dimensions
		const { startY, spacingY, endY, startX, spacingX, endX } = this._dataToTicks();
		
		// Find closest data point
		let closestPoint = null;
		let minDistance = Infinity;
		
		this.data.forEach((series, seriesIndex) => {
			series.forEach((point, pointIndex) => {
				const pointX = startX + (pointIndex * spacingX);
				const pointY = endY - ((point - this.minY) / (this.maxY - this.minY) * (endY - startY));
				
				const distance = Math.sqrt(
					Math.pow((x - pointX / this.width), 2) + 
					Math.pow((y - pointY / this.height), 2)
				);
				
				if(distance < minDistance) {
					minDistance = distance;
					closestPoint = { seriesIndex, pointIndex, x: pointX, y: pointY, value: point };
				}
			});
		});
		
		if(!closestPoint) return;
		
		// Create tooltip container
		const tooltipGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		tooltipGroup.classList.add('tooltip');
		
		// Calculate tooltip position
		const tooltipX = closestPoint.x + 10;
		const tooltipY = closestPoint.y - 30;
		
		// Create tooltip background
		const tooltipBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		const tooltipText = this.data[closestPoint.seriesIndex][closestPoint.pointIndex].toFixed(2);
		const textWidth = tooltipText.length * this.options.fontSize * 0.6;
		const textHeight = this.options.fontSize * 1.2;
		
		tooltipBg.setAttribute('x', tooltipX);
		tooltipBg.setAttribute('y', tooltipY);
		tooltipBg.setAttribute('width', textWidth + this.options.tooltipPadding * 2);
		tooltipBg.setAttribute('height', textHeight + this.options.tooltipPadding * 2);
		tooltipBg.setAttribute('rx', this.options.tooltipBorderRadius);
		tooltipBg.setAttribute('ry', this.options.tooltipBorderRadius);
		tooltipBg.setAttribute('fill', this.options.backgroundColor);
		tooltipBg.setAttribute('stroke', this.options.strokeColor);
		tooltipBg.setAttribute('stroke-width', '1');
		tooltipBg.setAttribute('filter', this.options.tooltipShadow);
		
		// Add animation
		tooltipBg.style.opacity = '0';
		tooltipBg.style.transform = 'scale(0.8)';
		tooltipBg.style.transition = `all ${this.options.animationDuration}ms ease-out`;
		
		// Force reflow
		tooltipBg.offsetHeight;
		
		tooltipBg.style.opacity = '1';
		tooltipBg.style.transform = 'scale(1)';
		
		tooltipGroup.appendChild(tooltipBg);
		
		// Create tooltip text
		const tooltipTextElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
		tooltipTextElement.setAttribute('x', tooltipX + this.options.tooltipPadding);
		tooltipTextElement.setAttribute('y', tooltipY + textHeight + this.options.tooltipPadding);
		tooltipTextElement.setAttribute('font-size', this.options.fontSize);
		tooltipTextElement.setAttribute('fill', this.options.strokeColor);
		tooltipTextElement.textContent = tooltipText;
		
		// Add animation
		tooltipTextElement.style.opacity = '0';
		tooltipTextElement.style.transform = 'translateY(10px)';
		tooltipTextElement.style.transition = `all ${this.options.animationDuration}ms ease-out`;
		
		// Force reflow
		tooltipTextElement.offsetHeight;
		
		tooltipTextElement.style.opacity = '1';
		tooltipTextElement.style.transform = 'translateY(0)';
		
		tooltipGroup.appendChild(tooltipTextElement);
		
		// Add hover effect to data point
		if(this.options.hoverEffect) {
			const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
			point.setAttribute('cx', closestPoint.x);
			point.setAttribute('cy', closestPoint.y);
			point.setAttribute('r', this.options.pointHoverRadius);
			point.setAttribute('fill', this.options.dataColors[closestPoint.seriesIndex]);
			point.setAttribute('stroke', this.options.strokeColor);
			point.setAttribute('stroke-width', '1');
			point.style.opacity = '0.8';
			
			// Add animation
			point.style.opacity = '0';
			point.style.transform = 'scale(0)';
			point.style.transition = `all ${this.options.animationDuration}ms ease-out`;
			
			// Force reflow
			point.offsetHeight;
			
			point.style.opacity = '0.8';
			point.style.transform = 'scale(1)';
			
			tooltipGroup.appendChild(point);
		}
		
		this.chartGroup.appendChild(tooltipGroup);
	}

	// Override the _validateData method for HistoChart
	this._validateData = (data) => {
		if(!data.constructor || data.constructor.name !== 'Object') {
			this._errorMessage('histochart', 'data must be of type Object.');
			return false;
		}
		if(Object.keys(data).length === 0) {
			this._errorMessage('histochart', 'data object cannot be empty.');
			return false;
		}
		for(let i = 0; i < Object.keys(data).length; i++) {
			if(!this._checkString(Object.keys(data)[i])) {
				this._errorMessage('histochart', 'Incorrect key in data (must be of type string).');
				return false;
			}
			if(!this._checkFloat(Object.values(data)[i], 0, Infinity)) {
				this._errorMessage('histochart', 'Incorrect value in data (must be a non-negative number).');
				return false;
			}
		}
		return true;
	};

	// Override updateData to recalculate min/max values
	this.updateData = (newData) => {
		if(this.error) return;
		
		// Validate the new data
		if(!this._validateData(newData)) {
			return;
		}
		
		// Update the data
		this.data = newData;
		
		// Recalculate min/max values
		this.yMin = Infinity;
		this.yMax = -Infinity;
		this.data.forEach((val) => {
			if(val < this.yMin) this.yMin = val;
			if(val > this.yMax) this.yMax = val;
		});
		if(this.minY !== undefined) this.yMin = this.minY;
		if(this.maxY !== undefined) this.yMax = this.maxY;
		
		// If live update is enabled, schedule an update
		if(this.liveUpdate) {
			const now = Date.now();
			if(now - this.lastUpdateTime >= this.updateInterval) {
				// Update immediately if enough time has passed
				this.draw();
				this.lastUpdateTime = now;
			} else if(!this.pendingUpdate) {
				// Schedule an update for later
				this.pendingUpdate = true;
				setTimeout(() => {
					this.draw();
					this.lastUpdateTime = Date.now();
					this.pendingUpdate = false;
				}, this.updateInterval - (now - this.lastUpdateTime));
			}
		} else {
			// If live update is disabled, just redraw
			this.draw();
		}
	};
}
Object.assign(JSGrof.HistoChart.prototype, JSGrof.ChartPrototype);