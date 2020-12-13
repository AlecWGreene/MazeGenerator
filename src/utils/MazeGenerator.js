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
 * @class
 * @classdesc A configuration for the maze architecture to use for maze generation
 * 
 * @property {LayerFragment} defaultFragment Fragment with floatsize 1 to be used in any leftover fragments
 * @property {Array.<MazeLayer>} layers Enumerated layers to incorporate into the maze
 * 
 * @method generateOutline Given a grid, will output the subgraphs to run maze generation algorithms on
 */
export class MazeConfig{
	constructor(defaultFragment, layers, delay){
		/** @type {LayerFragment} Fragment with floatsize 1 to be used in any leftover fragments */
		this.defaultFragment = defaultFragment;
		/** @type {Array<MazeLayer>} layers Enumerated layers to incorporate into the maze */
		this.layers = layers;
	}

	/**
	 * @method generateOutline
	 * @memberof MazeConfig
	 * 
	 * @description Generates a collection of subgraphs to be fed into the appropriate maze generation algorithms
	 * 
	 * @param {(HexGrid|SquareGrid)} grid 
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
			const layerWidth = Math.floor(numRings * layer.floatSize / floatTotal);

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
					const fragHeight = Math.max(Math.round(sliceGraph.length * sliceArray[fragmentIndex].floatSize / fragmentFloatTotal), 1);
					const fragGraph = sliceGraph.filter((tLayer, index) => index >= largestFragIndex && index < largestFragIndex + fragHeight);

					// Push fragment info to slice outline
					largestFragIndex += fragGraph.length;
					sliceOutline.push({
						type: sliceArray[fragmentIndex].type,
						subgraph: fragGraph
					});

					// // Collect any remaining nodes into a default fragment
					// if(sliceIndex === sliceArray.length - 1){
					// 	const garbage = [];
					// 	for(let garbageIndex = largestFragIndex; garbageIndex < sliceGraph.length; garbageIndex++){
					// 		garbage.push(sliceGraph[garbageIndex]);
					// 	}

					// 	if(garbage.reduce((total, arr) => total + arr.length,0) > 0){
					// 		sliceOutline.push([
					// 				{ 
					// 					type: mazeLayer.defaultType, 
					// 					subgraph: garbage
					// 				}
					// 			]);
					// 	}
					// }
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
									subgraph: garbage
								}
							]);
					}
				}
			}

			// Add the layer outline to the maze outline
			mazeOutline.push(layerOutline);
		}

		return mazeOutline;
	}
}

/**
 * @function generateRingMaze
 * @description Giving a subgrid and starting/ending points, will 
 * 
 */
function generateRingMaze(grid, startArray, endArray, config){

}

/**
 *  @function generateMaze 
 *  @description Takes a graph of grid points and generates a maze by designating traversal paths
 *  @param {HexGrid|SquareGrid} grid The graph to carve the maze into
 *  @param {GridPoint} start The starting point
 *  @param {Array<GridPoint>} endCandidates Set of points to select the finish point from
 *  @param {MazeConfig} config A config object used to generate an outline that the generator turns into a 
 */
export default function generateMaze(grid, start, endCandidates, config){

	return {
		start: grid.points[0][0],
		outline: config.generateOutline(grid),
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