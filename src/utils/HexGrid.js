import GridPoint from "./GridPoint";

const sqrt3 = Math.sqrt(3); 
const sqrt1_3 = 1 / Math.sqrt(3);

export default class HexGrid{
	constructor(height, width, sideLength){
		this.sideLength = sideLength;

		// Create a Y formation around the origin
		this.points = [[new GridPoint(0,0)]];
		this.points.push([
			new GridPoint(0,-this.sideLength),
			new GridPoint(-this.sideLength * sqrt3 / 2, this.sideLength / 2),
			new GridPoint(this.sideLength * sqrt3 / 2, this.sideLength / 2)
		]);
		this.points[0][0].addNeighbour(this.points[1][0]); this.points[1][0].addNeighbour(this.points[0][0]);
		this.points[0][0].addNeighbour(this.points[1][1]); this.points[1][1].addNeighbour(this.points[0][0]);
		this.points[0][0].addNeighbour(this.points[1][2]); this.points[1][2].addNeighbour(this.points[0][0]);

		// Generate the points in concentric circles
		
	}

}