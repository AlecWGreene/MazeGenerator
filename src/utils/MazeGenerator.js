import GridPoint from "./GridPoint";
import HexGrid from "./HexGrid";
import SquareGrid from "./SquareGrid";

/**
 * @class
 * 
 * @property {"ring"|"braid"|"branch"} type
 * @property {number} floatSize
 * @property {Array<"North"|"East"|"South"|"West">} connections
 */
export class LayerFragment {
	constructor(type, floatSize, connections){
		/** @type {"ring"|"braid"|"branch"} type */
		this.type = type;
		/** @type {number} floatSize */
		this.floatSize = floatSize;
		/** @type {Array<"North"|"East"|"South"|"West">} connections */
		this.connections = connections;
	}
}

/**
 * @class 
 * 
 * @property {number} floatSize
 * @property {Array<Array<LayerFragment>>} fragmentArray
 * @property {Array<number>} floatArray
 * @property {"ring"|"branch"|"braid"} defaultType
 */
export class MazeLayer { 
	constructor(floatSize, fragmentArray, floatArray, defaultType){
		this.floatSize = floatSize;
		this.floatArray = Array.from(floatArray);
		
		this.fragmentArray = [];
		for(const section of fragmentArray){
			this.fragmentArray.push(Array.from(section))
		}

		this.defaultType = defaultType;
	}
}

/**
 * @typedef {Object} MazeFragment
 * 
 * @property {"ring"|"braid"|"branch"} type The requested maze generation algorithm to run on the graph
 * @property {Array<Array<GridPoint>>} subgraph The jagged array of grid points which make up the maze fragment
 * @property {Array<"North"|"East"|"South"|"West">} connections The array of strings representing which directions this fragment connects to other fragments in, using the compass directions
 */

/**
 * @class
 * @classdesc A configuration for the maze architecture to use for maze generation
 * 
 * @property {LayerFragment} defaultFragment Fragment with floatsize 1 to be used in any leftover fragments
 * @property {Array.<MazeLayer>} layers Enumerated layers to incorporate into the maze
 * @property {number} seed The seed to feed into the generators
 * 
 * @method generateOutline Given a grid, will output the subgraphs to run maze generation algorithms on
 */
export class MazeConfig{
	constructor(defaultFragment, layers, seed, delay){
		/** @type {LayerFragment} Fragment with floatsize 1 to be used in any leftover fragments */
		this.defaultFragment = defaultFragment;
		/** @type {Array<MazeLayer>} layers Enumerated layers to incorporate into the maze */
		this.layers = layers;
		/** @type {number} seed The seed to feed into the generators */
		this.seed = seed;
	}

	/**
	 * @method generateOutline
	 * @memberof MazeConfig
	 * 
	 * @description Generates a collection of subgraphs to be fed into the appropriate maze generation algorithms
	 * 
	 * @param {(HexGrid|SquareGrid)} grid 
	 * 
	 * @returns {Array<Array<Array<MazeFragment>>>}
	 */
	generateOutline(grid){
		// Sum up the floats
		const floatTotal = this.layers.reduce((total, layer) => total + layer.floatSize, 0);
		
		// Setup directory for maze fragments and a temporary outline array
		const mazeOutline = [];
		const outline = [];

		// Split up grid into concentric rings
		const numRings = grid.points.length;
		let largestIndex = 0;
		for(const layer of this.layers){
			const layerWidth = Math.ceil(numRings * layer.floatSize / floatTotal);

			// Generate the subgraph using concentric arrays of grid.points by filtering through the indices
			const subGraph = grid.points.filter( (lay, index) => index >= largestIndex && index < largestIndex + layerWidth);

			// Push subgraph to mazeOutline
			largestIndex += subGraph.length;
			outline.push(subGraph);
		}

		// ------------ Parse layers into fragments ------------
		for(let index = 0; index < outline.length; index++){
			// Collect layer information
			const layerGraph = outline[index]; 
			const mazeLayer = this.layers[index];
			const layerOutline = [];
			
			// ------------ Split up layer into slices ------------
			const sliceFloatTotal = mazeLayer.fragmentArray.reduce((total, array, index) => total + mazeLayer.floatArray[index], 0);
			let largestSliceIndices = [];
			for(const _ in layerGraph){
				largestSliceIndices.push(0)
			}	
			for(let sliceIndex = 0; sliceIndex < mazeLayer.fragmentArray.length; sliceIndex++){
				// Collect slice information
				const sliceArray = mazeLayer.fragmentArray[sliceIndex];
				const sliceOutline = [];

				// Get slice Graph by taking each layer and collecting a percentage of the points
				const sliceWidth = mazeLayer.floatArray[sliceIndex] / sliceFloatTotal;
				const sliceGraph = layerGraph.map((SLayer, LIndex) => {
					const ringLength = SLayer.length;
					const numberPoints = ringLength * sliceWidth;

					// Collect the percentage of layer points and record how many were taken
					const arr =  SLayer.filter((p,i) => i >= largestSliceIndices[LIndex] && i < largestSliceIndices[LIndex] + numberPoints)
					largestSliceIndices[LIndex] += arr.length;
					return arr;
				})

				// ------------ Parse slice into fragment identifiers ------------
				const fragmentFloatTotal = sliceArray.reduce((total, frag) => total + frag.floatSize, 0);
				let largestFragIndex = 0;
				for(let fragmentIndex = 0; fragmentIndex < sliceArray.length; fragmentIndex++){
					// Collect fragment info
					const connectionArray = mazeLayer.fragmentArray[sliceIndex][fragmentIndex].connections; 
					const fragHeight = Math.max(Math.ceil(sliceGraph.length * sliceArray[fragmentIndex].floatSize / fragmentFloatTotal), 1);
					const fragGraph = sliceGraph.filter((tLayer, index) => index >= largestFragIndex && index < largestFragIndex + fragHeight);

					// Push fragment info to slice outline
					largestFragIndex += fragGraph.length;
					sliceOutline.push({
						type: sliceArray[fragmentIndex].type,
						connections: connectionArray,
						subgraph: fragGraph
					});

					// Collect any remaining nodes into a default fragment
					if(sliceIndex === sliceArray.length - 1){
						const garbage = [];
						for(let garbageIndex = largestFragIndex; garbageIndex < sliceGraph.length; garbageIndex++){
							garbage.push(sliceGraph[garbageIndex]);
						}

						if(garbage.reduce((total, arr) => total + arr.length,0) > 0){
							sliceOutline.push(
									{ 
										type: mazeLayer.defaultType, 
										connections: ["North", "East", "South", "West"],
										subgraph: garbage
									}
								);
						}
					}
				}

				// Push slice outline to layer outline
				layerOutline.push(sliceOutline);

				// Collect any remaining nodes into a default slice
				if(sliceIndex === mazeLayer.fragmentArray.length - 1){
					const garbage = [];
					for(let garbageIndex = 0; garbageIndex < layerGraph.length; garbageIndex++){
						const arr = layerGraph[garbageIndex].filter((SLayer, i) => i > largestSliceIndices[garbageIndex]);
						garbage.push(arr);
					}

					if(garbage.reduce((total, arr) => total + arr.length,0) > 0){
						 layerOutline.push([
								{ 
									type: mazeLayer.defaultType, 
									connections: ["North", "East", "South", "West"],
									subgraph: garbage
								}
							]);
					}
				}
			}

			// Add the layer outline to the maze outline
			mazeOutline.push(layerOutline);
		}

		// Collect the remaining graph rings into a final layer
		const largestLayerIndex = outline.reduce((total, outlineLayer) => total + outlineLayer.length, 0);
		const ringGarbage = [];
		for(let ringIndex = largestLayerIndex; ringIndex < grid.points.length; ringIndex++){
			ringGarbage.push(grid.points[ringIndex]);
		}
		if(ringGarbage.length > 0) mazeOutline.push([[{ type: this.defaultFragment || "ring", subgraph: ringGarbage}]])

		return mazeOutline;
	}
}

/**
 * @function generateRingMaze
 * @description Giving a subgrid and starting/ending points, generate a maze using Prim's algorithm
 * 
 */
function generateRingMaze(grid, startArray, endArray, config){
	
}

/**
 * @function generateWeights
 * 
 * @description Adds weights onto a weight property of all the grid points in the graph using a seeded pseudorandom number generator
 * 
 * @property {string} seed String used to seed the pseurandom number generator 
 * @property {Array<Array<GridPoint>>} graph A jagged array of grid points to assign weights to
 * 
 * @returns {void} 
 */
function generateWeights(seed, graph){
	/**
	 * @function
	 * 
	 * @description A basic hash function which takes string and returns a fuction that returns deterministic seeds credit: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
	 * 
	 * @param {string} str The starting seed for the generator 
	 */
	const xmur3 = (str) => {
		for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
			h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
			h = h << 13 | h >>> 19;
		return function() {
			h = Math.imul(h ^ h >>> 16, 2246822507);
			h = Math.imul(h ^ h >>> 13, 3266489909);
			return (h ^= h >>> 16) >>> 0;
		}
	}

	/** Different pseudorandom algorithms to use for weights */
	const prng = {
		/** credit: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript */
		 sfc32: (a, b, c, d) => {
					return function() {
						a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
						var t = (a + b) | 0;
						a = b ^ b >>> 9;
						b = c + (c << 3) | 0;
						c = (c << 21 | c >>> 11);
						d = d + 1 | 0;
						t = t + d | 0;
						c = c + t | 0;
		  				return (t >>> 0) / 4294967296;
					}
				}
	}

	// Generate the weight using a pseudorandom algorithm
	const seedGenerator = xmur3(seed);
	const seedArray = [seedGenerator(), seedGenerator(), seedGenerator(), seedGenerator()];
	const rand = prng.sfc32(...seedArray);
	for(const row of graph){
		for(const point of row){
			point.weight = rand();
		}
	}
}

/**
 * @function generateFragmentGates
 * @param {MazeFragment} fragment 
 */
function generateFragmentGates(fragment, directions){
	const gates = {
		"North": [],
		"East": [],
		"South": [],
		"West": []
	};

	for(const direction of directions){
		switch (direction) {
			case "North":
				const nring = fragment.subgraph[fragment.subgraph.length - 1];
				break;
			case "South":
				const sring = fragment.subgraph[0];
				break;
			case "East":
				const eslice = fragment.subgraph.map(row => row.filter((point, index, rowArray) => index === rowArray.length - 1));
			case "West":
				const wslice = fragment.subgraph.map(row => row.filter((point, index) => index === 0));
				break;
			default:
				throw new Error(`Fragment connection type ${direction} is invalid`);
		}
	}
}

/**
 *  @function generateMaze 
 *  @description Takes a graph of grid points and generates a maze by designating traversal paths
 * 
 *  @param {HexGrid|SquareGrid} grid The graph to carve the maze into
 *  @param {GridPoint} start The starting point
 *  @param {Array<GridPoint>} endCandidates Set of points to select the finish point from
 *  @param {MazeConfig} config A config object used to generate an outline that the generator turns into a 
 */
export default function generateMaze(grid, start, endCandidates, config){
	// Compute the grid outline using the config object
	const outline = config.generateOutline(grid);
	const graph = [];

	// Iterate over each fragment
	for(const layer of outline){
		for(const slice of layer){
			for(const fragment of slice){
				// Select the connections to append to the fragment
				generateFragmentGates(fragment, fragment.connections);

				// Run the requested maze generation algorithm
				switch(fragment.type){
					case "branch":
					case "braid":
					case "ring":
						break;
					default:
						throw new Error(`Fragment type ${fragment.type} is not recognized`)
				}
			}
		}
	}

	return {
		start: grid.points[0][0],
		outline: outline,
		graph: [
			{
				point: grid.points[1][0],
				connections: [grid.points[0][0]]
			},
			{
				point: grid.points[1][1],
				connections: [grid.points[1][0], grid.points[2][1]]
			},
			{
				point: grid.points[2][1],
				connections: [grid.points[1][1]]
			}
		],
		finishPoints: []
	}
}