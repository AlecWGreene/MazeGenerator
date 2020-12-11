export default class GridPoint{
	constructor(x, y, neighbours){
		this.position = {
			x: x,
			y: y
		}

		this.neighbours = neighbours || [];
	}

	addNeighbour(point){
		this.neighbours.push(point);
	}

	removeNeighbour(point){
		this.neighbours = this.neighbours.filter(p => p.position.x !== point.position.x || p.position.y !== point.position.y);
	}
}