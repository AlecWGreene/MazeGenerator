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
 * @typedef {Object} GraphNode
 * 
 * @property {GridPoint} point The physical location of the node
 * @property {Array<GraphNode>} connections The nodes which are visitable from this node
 */

/**
 * @typedef {Object} MazeFragment
 * 
 * @property {"ring"|"braid"|"branch"} type The requested maze generation algorithm to run on the graph
 * @property {Array<Array<GridPoint>>} subgraph The jagged array of grid points which make up the maze fragment
 * @property {Array<GraphNode>} gateGraph The graph of nodes which make up the fragment gates
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
						let nselection = -1;
						if(i === numGates - 1){
							// Pick from the remaining points
							const remainingCount = nring.length - i * nPartitionLength;
							nselection = Math.floor(Math.random() * remainingCount);
						}
						else{
							nselection = Math.floor(Math.random() * nPartitionLength);
						}

						gates.North.push(nring[i * nPartitionLength + nselection]);
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
						let sselection = -1;
						if(i === numGates - 1){
							// Pick from the remaining points
							const remainingCount = sring.length - i * sPartitionLength;
							sselection = Math.floor(Math.random() * remainingCount);
						}
						else{
							sselection = Math.floor(Math.random() * sPartitionLength);
						}

						gates.South.push(sring[i * sPartitionLength + sselection]);
					}
				}
				break;
			case "East":
				if(fragment.connections.includes("East")){
					// Partition the slice into equal length pieces
					const eslice = fragment.subgraph.map(row => row.filter((point, index, rowArray) => index === rowArray.length - 1));
					numGates = Math.ceil(eslice.length * gatePercentage);
					const ePartitionLength = Math.round(eslice.length / numGates);
					const epointArray = [];

					// For each partition, select a random point as a gate
					for(let i = 0; i < numGates; i++){
						let eselection = -1;
						if(i === numGates - 1){
							// Pick from the remaining points
							const remainingCount = eslice.length - i * ePartitionLength;
							eselection = Math.floor(Math.random() * remainingCount);
						}
						else{
							eselection = Math.floor(Math.random() * ePartitionLength);
						}

						epointArray.push(eslice[i * ePartitionLength + eselection]);
					}

					// Combine the arrays of single points
					gates.East.push(...epointArray.reduce((aggr, array) => aggr.concat(array)));
				}
			case "West":
				if(fragment.connections.includes("West")){
					// Partition the slice into equal length pieces
					const wslice = fragment.subgraph.map(row => row.filter((point, index) => index === 0));
					numGates = Math.ceil(wslice.length * gatePercentage);
					const wPartitionLength = Math.round(wslice.length / numGates);
					const wpointArray = [];

					// For each partition, select a random point as a gate
					for(let i = 0; i < numGates; i++){
						let wselection = -1;
						if(i === numGates - 1){
							// Pick from the remaining points
							const remainingCount = wslice.length - i * wPartitionLength;
							wselection = Math.floor(Math.random() * remainingCount);
						}
						else{
							wselection = Math.floor(Math.random() * wPartitionLength);
						}

						wpointArray.push(wslice[i * wPartitionLength + wselection]);
					}

					// Combine the arrays of single points
					gates.West.push(...wpointArray.reduce((aggr, array) => aggr.concat(array)));
				}
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
				break;
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
 * @class
 * 
 * @property {GridPoint} point
 * @property {Array<GraphNode>} connections
 */
class GraphNode{
	constructor(point, initialConnections){
		/** @type {GridPoint}  */
		this.point = point;
		/** @type {Array<GraphNode>} */
		this.connections = initialConnections || [];
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
	const gateGraph = [];

	// Select gate nodes for connecting the fragments
	for(const layer of outline){
		for(const slice of layer){
			for(const fragment of slice){
				fragment.gates = generateFragmentGates(fragment, fragment.connections);
			}
		}
	}

	// Iterate over each fragment to generate fragment connections
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
													
				const sliceNeighbours = !(fragment.connections.includes("East") || fragment.connections.includes("West")) ? undefined : 
												layer
													// Collect slices which are neighbours
													.filter((_, subIndex) => Math.abs(subIndex - sliceIndex) === 1 || (sliceIndex === 0 && subIndex === layer.length - 1 && layer.length > 1) || (subIndex === 0 && sliceIndex === layer.length - 1 && layer.length > 1) || layer.length === 2 )
													// Iterate over each fragment and collect vertical slices
													.map((tSlice, subIndex, newArray) => {
														// Handle the case of a 2 slice layer
														if(layer.length === 2){
															// Connect over the backwards seam
															if(subIndex === 1 && sliceIndex === 0){
																return tSlice.map(tFragment => tFragment.gates.East).reduce((aggr, array) => aggr.concat(array));
															}
															else if(sliceIndex === 1 && subIndex === 0){
																return tSlice.map(tFragment => tFragment.gates.West).reduce((aggr, array) => aggr.concat(array));
															}
															// Connect the first slice to the next slice on the normal seam
															else if(sliceIndex === 0 && subIndex === 0){
																return newArray[1].map(tFragment => tFragment.gates.West).reduce((aggr, array) => aggr.concat(array));
															}
															else if(sliceIndex === 1 && subIndex === 1){
																return newArray[0].map(tFragment => tFragment.gates.East).reduce((aggr, array) => aggr.concat(array));
															}
														}
														else{
															// Connect first slice to last slice
															if(subIndex === newArray.length - 1 && sliceIndex === 0){
																return tSlice.map(tFragment => tFragment.gates.East).reduce((aggr, array) => aggr.concat(array));
															}
															// Connect last slice to first slice
															else if(sliceIndex === layer.length - 1 && subIndex === 0){
																return tSlice.map(tFragment => tFragment.gates.West).reduce((aggr, array) => aggr.concat(array));
															}
															// Connect first slice to second slice
															else if(sliceIndex === 0){
																return tSlice.map(tFragment => tFragment.gates["West"]).reduce((aggr, array) => aggr.concat(array));
															}
															// Connect last slice to second to last slice
															else if(sliceIndex === layer.length - 1){
																return tSlice.map(tFragment => tFragment.gates["East"]).reduce((aggr, array) => aggr.concat(array));
															}
															else{
																return tSlice.map(tFragment => tFragment.gates[subIndex === 0 ? "East" : "West"]).reduce((aggr, array) => aggr.concat(array));
															}
														}
													});
				// Adjust for the fact that gluing the first and last slices will have the filter function reach the Eastern slice first
				if((sliceIndex === 0 || sliceIndex === layer.length - 1)) sliceNeighbours.reverse()
				
			
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

				// Add the empty arrays to align the layer indices
				if(layerIndex === outline.length - 1){
					layerNeighbours.push([])
				}

				// Add the empty arrays to align the fragment indices
				if(fragmentNeighbours.length === 1){
					if(fragmentIndex === 0){
						fragmentNeighbours.unshift([])
					}
					else if(fragmentIndex === slice.length - 1){
						fragmentNeighbours.push([]);
					}
				}

				// Filter and connect gate nodes
				const gateArray = connectGateNodes(fragment, layerNeighbours, sliceNeighbours, fragmentNeighbours, layer.length === 2);
				fragment.gateGraph = gateArray;
				gateGraph.push(...Object.values(fragment.gateGraph).reduce((aggr, array) => aggr.concat(array)));

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

	// Consolidate fragment connections and collect them into graph nodes
	/** @type {Array<GraphNode>}  */
	const graph = [];
	const g = [];
	const existsInGraph = (node) => {
		const marginoferror = 0.1;
		const matches = graph.filter(n => Math.abs(n.point.position.x - node.point.position.x) < marginoferror && Math.abs(n.point.position.y - node.point.position.y) < marginoferror);
		if(matches.length > 0){
			return matches[0];
		}
		else{
			return undefined;
		}
	}
	for(let layerIndex = 0; layerIndex < outline.length; layerIndex++){
		const layer = outline[layerIndex];
		for(let sliceIndex = 0; sliceIndex < layer.length; sliceIndex++){
			const slice = layer[sliceIndex];
			// Correct all the gate nodes for each fragment
			for(let fragmentIndex = 0; fragmentIndex < slice.length; fragmentIndex++){
				const fragment = slice[fragmentIndex];

				// For each fragment, traverse the gate nodes
				for(const direction of ["North", "South", "East", "West"]){
					for(const nodeInfo of fragment.gateGraph[direction]){
						// Combine existing nodes and update connections
						const existingNode = existsInGraph(nodeInfo);
						if(existingNode){
							// Add references to all existing connections
							for(const conn of nodeInfo.connections){
								const addToArray = existsInGraph({point: conn});
								if(addToArray){
									addToArray.indices = {
										layer: layerIndex,
										slice: sliceIndex,
										fragment: fragmentIndex
									}
									existingNode.connections.push(addToArray);
								}
							}
						}
						// Create new nodes and add connections to any existing nodes
						else{
							const connectionArray = [];

							// Add any connections which already exist
							for(const conn of nodeInfo.connections){
								const addToArray = existsInGraph({point: conn});
								if(addToArray){
									connectionArray.push(addToArray);
								}
							}

							// Add the new point to the graph
							const newNode = new GraphNode(nodeInfo.point, connectionArray);
							graph.push(newNode);
							for(const newConnection of connectionArray){
								newConnection.connections.push(newNode);
							}
						}
					}
				}
			}
		}
	}

	for(const layer of outline){
		for(const slice of layer){
			for(const fragment of slice){
				// For each east corner, add the connections if they don't exist 
				const corners = [
					fragment.gateGraph.East[0],
					fragment.gateGraph.East[fragment.gateGraph.East.length - 1],
					fragment.gateGraph.West[0],
					fragment.gateGraph.West[fragment.gateGraph.West.length - 1]
				].filter(t => t !== undefined);
				//g.push(...corners.map(p => {return {point: p.point, connections: p.connections.map(tempP => { return { point: tempP }})}}));
				for(const nodeInfo of corners){ 
					const graphNode = existsInGraph(nodeInfo);
					for(const connInfo of nodeInfo.connections){
						const connNode = existsInGraph({ point: connInfo });
						if(connNode){
							if(!graphNode.connections.includes(connNode)){
								graphNode.connections.push(connNode);
							}
							if(!connNode.connections.includes(graphNode)){
								connNode.connections.push(graphNode);
							}
						}
					}
				}
			}
		}
	}
	
	const temp = validateGraph(graph);
	console.log(temp);
	g.push(...(temp || []))
	return {
		start: grid.points[0][0],
		outline: outline,
		graph: graph, //graph,
		problems: g,
		finishPoints: []
	}
}

function validateGraph(graph){
	console.log(graph.length)
	let errorsFound = false;
	let badNodes = [];

	// NO UNRECIPROCATED CONNECTIONS
	for(const node of graph){
		for(const conn of node.connections){
			try{
				if(!conn.connections.includes(node)){
					if(!errorsFound)errorsFound = true;
					badNodes.push([node, conn]);
					console.error("dsicrepancy	")
					console.log(node.point.position);
					console.log(conn.point.position);
					console.log(conn.connections.map(p => p.point.position))
				}
			}
			catch(err){
				if(!errorsFound) errorsFound = true
				badNodes.push([node, conn]);
			}
		}
	}
	if(badNodes.length > 0){
		console.error(`${badNodes.length} Connections without reciprocation were found`);
		console.log(badNodes.map( value => {
			console.log(`Origin: ${value[0].point.position.x+","+value[0].point.position.y}    Connections:(${value[1].point.position.x+","+value[1].point.position.y})`)
			console.log(`Indices: ${JSON.stringify(value[0].indices)} and ${JSON.stringify(value[1	].indices)}`)
		}));
		return badNodes.map(v => { return { point: v[0].point, connections: [v[1]] }});
	}
	else{
		console.log("No unreciprocated connections found!")
	}

	// NO REPEATED POINTS
	badNodes = [];
	for(const node of graph){
		const index = graph.findIndex(n => n === node);
		if(graph.filter((gNode, gIndex) => gIndex > index).filter(gNode => gNode === node).length > 0){
			if(!errorsFound) errorsFound = true
			const marginoferror = 0.000001;
			badNodes.push([node, graph.filter((gNode, gIndex) => gIndex > index).filter(gNode => Math.abs(gNode.point.position.x - node.point.position.x) < marginoferror && Math.abs(gNode.point.position.y - node.point.position.y) < marginoferror)])
		}
	}
	if(badNodes.length > 0){
		console.error(`${badNodes.length} Repeated nodes were found`);
		console.log(badNodes);
	}
	else{
		console.log("No repeated nodes found!")
	}

	if(!errorsFound){
		console.log("No errors found!")
		console.log(graph)
	}
}