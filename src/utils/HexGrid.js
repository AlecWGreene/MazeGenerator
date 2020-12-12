import GridPoint from "./GridPoint";

const sqrt3 = Math.sqrt(3); 
const sqrt1_3 = 1 / Math.sqrt(3);

export default class HexGrid{
	constructor(height, width, sideLength){
		this.height = height;
		this.width = width;
		this.sideLength = sideLength;
	
		// Start at the center
		this.points = [[new GridPoint(0,0)]];
		let open = this.getNextHexagon();

		// Until there are no more rings which can fit inside the bounds, repeatedly add rings to the grid
		while(open.length > 0){
			// Assign the open points their neighbours
			for(let index = 0; index < open.length; index++){
				const point = open[index];
				
				// If the point is a corner, connect it to the previous corner
				if(index % this.points.length === 0){
					// Connect it using index matching for hexagons which don't leave the bounds
					if(open.length === this.points.length * 6){
						point.addNeighbour(this.points[this.points.length-1][Math.floor(index * (1 - 1 / this.points.length))]);
					}
				}
				// Else connect it to the two side points closest to it
				else{
					const sideNumber = Math.floor(index / this.points.length);
					const sideIndex = index % this.points.length;

					// Calculate the index using the smaller hexagon and account for index wrapping
					const nextIndex = (sideNumber * (this.points.length - 1) + sideIndex) % ((this.points.length -1)* 6);
					const prevIndex = nextIndex - 1 < 0 ? ((this.points.length - 1) * 6 - 1) : nextIndex - 1;

					point.addNeighbour(this.points[this.points.length-1][prevIndex]);
					point.addNeighbour(this.points[this.points.length-1][nextIndex]);
				}

				// connect point to its neighbours
				const prevIndex = Math.max(index - 1, 0);
				const nextIndex = (index + 1) % open.length;
				point.addNeighbour(open[prevIndex]);
				point.addNeighbour(open[nextIndex]);
			}

			// Add the points to the grid and get the next hexagon
			this.points.push(open)
			open = this.getNextHexagon();
		}
	}
		
	
	// Get all points which can be reached as a point on a regular hexagon concentric to the current grid
	getNextHexagon(){
		// Figure out how far out the ring is
		const index = this.points.length;
		const newRing = [];

		// Iterate over each hexagon vertex and collect #index number of points into the new ring
		// Use discrete angle counting to cirumvent JS rounding errors
		for(let angleIndex = 0; angleIndex < 6; angleIndex++){
			const angle = angleIndex * Math.PI / 3;
			const nextAngle = ((angleIndex + 1)%6) * Math.PI / 3;

			// Calculate a unit vector between the current hex vertex and the next hex vertex
			const angleLine = {
				x: Math.cos(nextAngle) - Math.cos(angle),
				y: Math.sin(nextAngle) - Math.sin(angle)
			}
			angleLine.x /= Math.hypot(angleLine.x, angleLine.y);
			angleLine.y /= Math.hypot(angleLine.x, angleLine.y);

			// Add index number of points along the unit vector
			for(let sideNumber = 0; sideNumber < index; sideNumber++){
				const p = {
					x: this.sideLength * index * Math.cos(angle) + angleLine.x * sideNumber * this.sideLength,
					y: this.sideLength * index * Math.sin(angle) + angleLine.y * sideNumber * this.sideLength
				}

				// Only add the point if it fits in the bounds
				if(0 > Math.abs(p.x) 
			    || Math.abs(p.x) > this.width / 2
				|| 0 > Math.abs(p.y)
				|| Math.abs(p.y) > this.height / 2){
					return [];
				}
				else{
					newRing.push(new GridPoint(p.x, p.y));
				}
			}
		}

		return newRing;
	}
}