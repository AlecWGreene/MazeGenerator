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
 * @property {Object<string,Array<GridPoint>>} gates The set of connections into or out of the fragment
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
		if(ringGarbage.length > 0) mazeOutline.push([[{ type: this.defaultFragment || "ring", connections: ["North", "East", "South", "West"], subgraph: ringGarbage}]])

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

	const gatePercentage = 0.5;
	for(const direction of directions){
		let numGates = 0;
		switch (direction) {
			case "North":
				if(fragment.connections.includes("North")){
					// Partition the ring into equal length pieces
					const nring = fragment.subgraph[fragment.subgraph.length - 1];
					numGates = Math.ceil(nring.length * gatePercentage);
					const nPartitionLength = Math.round(nring.length / numGates);

					// For each partition, select a random point as a gate
					for(let i = 0; i < numGates; i++){
						let selection = -1;
						if(i === numGates - 1){
							// Pick from the remaining points
							const remainingCount = nring.length - i * nPartitionLength;
							selection = Math.floor(Math.random() * remainingCount);
						}
						else{
							selection = Math.floor(Math.random() * nPartitionLength);
						}

						gates.North.push(nring[i * nPartitionLength + selection]);
					}
				}
				break;
			case "South":
				if(fragment.connections.includes("South")){
					// Partition the ring into equal length pieces
					const sring = fragment.subgraph[0];
					numGates = Math.ceil(sring.length * gatePercentage);
					const sPartitionLength = Math.round(sring.length / numGates);

					// Adjust for the first layer
					if(sring.length <= 1){
						break;
					}

					// For each partition, select a random point as a gate
					for(let i = 0; i < numGates; i++){
						let selection = -1;
						if(i === numGates - 1){
							// Pick from the remaining points
							const remainingCount = sring.length - i * sPartitionLength;
							selection = Math.floor(Math.random() * remainingCount);
						}
						else{
							selection = Math.floor(Math.random() * sPartitionLength);
						}

						gates.South.push(sring[i * sPartitionLength + selection]);
					}
				}
				break;
			case "East":
				const eslice = fragment.subgraph.map(row => row.filter((point, index, rowArray) => index === rowArray.length - 1));
				numGates = Math.ceil(eslice.length * gatePercentage);
			case "West":
				const wslice = fragment.subgraph.map(row => row.filter((point, index) => index === 0));
				numGates = Math.ceil(wslice.length * gatePercentage);
				break;
			default:
				throw new Error(`Fragment connection type ${direction} is invalid`);
		}
	}
	return gates;
}

/**
 * 
 * @param {MazeFragment} fragment 
 * @param {Array<Array<GridPoint>>} layerNeighbours 
 * @param {Array<Array<GridPoint>>} sliceNeighbours 
 * @param {Array<Array<GridPoint>>} fragmentNeighbours 
 */
function connectGateNodes(fragment, layerNeighbours, sliceNeighbours, fragmentNeighbours){
	const gates = {
		"North": [],
		"East": [],
		"South": [],
		"West": []
	};

	// Iterate through the fragment's connections and connect gates
	for(const direction of fragment.connections){
		// Get the potential neighbours
		let candidates = [];
		switch(direction){
			case "North":
				candidates = (layerNeighbours[1] || []).concat((fragmentNeighbours[1] || []));
				if(fragment.subgraph[0].length <= 1) candidates = layerNeighbours[0];
				break;
			case "South":
				candidates = (layerNeighbours[0] || []).concat((fragmentNeighbours[0] || []));
				break;
			case "East":
				candidates = (sliceNeighbours[1] || []);
			case "West":
				candidates = (sliceNeighbours[0] || []);
				break;
		}  

		// Iterate through each gate in the direction
		const gateArray = fragment.gates[direction];
		for(const gatePoint of gateArray){
			// Check if the gatePoint has a close neighbour
			const connections = candidates.filter(point => {
				return gatePoint.neighbours.includes(point);
			});

			// If the gatePoint has connections, push it to the object to return
			if(connections.length > 0){
				gates[direction].push({
					point: gatePoint,
					connections: connections
				});
			}
		}
	}

	return gates;
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

	// Select gate nodes for connecting the fragments
	for(const layer of outline){
		for(const slice of layer){
			for(const fragment of slice){
				fragment.gates = generateFragmentGates(fragment, fragment.connections);
			}
		}
	}

	// Iterate over each fragment
	for(let layerIndex = 0; layerIndex < outline.length; layerIndex++){
		const layer = outline[layerIndex];
		for(let sliceIndex = 0; sliceIndex < layer.length; sliceIndex++){
			const slice = layer[sliceIndex];
			for(let fragmentIndex = 0; fragmentIndex < slice.length; fragmentIndex++){
				// Select the connections to append to the fragment
				const fragment = slice[fragmentIndex];

				// Collect the subgraphs of neighbouring fragments
				const layerNeighbours = !(fragment.connections.includes("North") || fragment.connections.includes("South")) ? undefined : 
											outline
												// Collect neighbor layers
												.filter((_, subIndex) => Math.abs(subIndex - layerIndex) === 1)
												// Iterate over each slice and get the top or bottom fragments
												.map((tLayer, subIndex, array) => {
													// Collect the gates from each fragment
													if(array.length === 1){
														const isLayerLast = Math.floor(layerIndex / (outline.length - 1));
														return tLayer.map(tSlice => tSlice[isLayerLast * (tSlice.length - 1)]).map(tFragment => tFragment.gates[subIndex === isLayerLast ?  "South" : "North"]).reduce((aggr, array) => aggr.concat(array))
													}
													else{
														return tLayer.map(tSlice => tSlice[(1 - subIndex) * (tSlice.length - 1)]).map(tFragment => tFragment.gates[subIndex === 0 ? "North" : "South"]).reduce((aggr, array) => aggr.concat(array))
													}
												})
													
				const sliceNeighbours = !(fragment.connections.includes("East") || fragment.connections.includes("West")) ? undefined : layer.filter((_, subIndex) => Math.abs(subIndex - sliceIndex) === 1)
				 							 // Collect the rightmost col of every fragment of the left slice and the leftmost col of every fragment of the right slice
				   							 .map((fragArray, subIndex) => {
												// subIndex has to be 0 or 1, use that to switch between left and right slices
												return fragArray.map(frag => {
													if(frag.connections.includes(subIndex === 0 ? "East" : "West")){
														return subIndex === 0 ? frag.gates.East : frag.gates.West;
													}
													else{
														return [];
													}
											 })
											 // Combine the array of gates in each slice
											 .reduce((aggr, array) => aggr.concat(array));
											});
				const fragmentNeighbours = !(fragment.connections.includes("North") || fragment.connections.includes("South")) ? undefined : 
												slice
													// Collect neighbor layers
													.filter((_, subIndex) => Math.abs(subIndex - fragmentIndex) === 1)
													// Iterate over each slice and get the top or bottom fragments
													.map((tFragment, subIndex, array) => {
														if(array.length === 1){
															const isFragLast = Math.floor(fragmentIndex / (slice.length - 1));
															return tFragment.gates[ subIndex === isFragLast ? "South" : "North"]
														}
														return tFragment.gates[ subIndex === 0 ? "North" : "South"];
													})
				
				if(layerIndex === 0){
					layerNeighbours.unshift([])
				}
				else if(layerIndex === outline.length - 1){
					layerNeighbours.push([])
				}

				const gateArray = connectGateNodes(fragment, layerNeighbours, sliceNeighbours, fragmentNeighbours);
				graph.push(...Object.values(gateArray).reduce((aggr, array) => aggr.concat(array)));

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
		graph: graph,
		finishPoints: []
	}
}