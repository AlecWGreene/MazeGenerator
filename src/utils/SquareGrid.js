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
	}
}