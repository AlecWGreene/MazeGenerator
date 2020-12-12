import GridPoint from "./GridPoint";

export default class SquareGrid{
	constructor(height, width, cellsize){
		this.numRows = Math.floor(height / cellsize);
		this.numCols = Math.floor(width / cellsize);
		this.cellsize = cellsize;

		this.points = [];
		for(let row = 0; row < this.numRows; row++){
			this.points.push([]);
			for(let col = 0; col < this.numCols; col++){
				this.points[row][col] = new GridPoint(col * cellsize, row * cellsize);
			}
		}

		// Generate neighbour connections
		for(let row = 0; row < this.numRows; row++){
			this.points.push([]);
			for(let col = 0; col < this.numCols; col++){
				this.points[row][col] = new GridPoint(col * cellsize, row * cellsize);

				const indices = [
					[row, col + 1],
					[row + 1, col],
					[row, col - 1],
					[row - 1, col]
				];
		
				for(const index of indices){
					if( 0 <= index[0] && index[0] < this.numRows && 0 <= index[1] && index[1] < this.numCols){
						const n = this.points[index[0]][index[1]];
						this.points[row][col].addNeighbour(n);
					}
				}
			}
		}

		
	}
}