import p5 from "p5";
import { useContext, useEffect, useRef, useState } from "react";
import { AppStateContext } from "../../App";

export default function AppCanvas(props){

	const [appState] = useContext(AppStateContext);
	const [renderer, setRenderer] = useState(null);
	const canvasRef = useRef();

	const drawGrid = (p5) => {
		p5.background(0);
		if(appState.grid){
			p5.stroke("white");

			for(const row of appState.grid.points){
				for(const point of row){
					// Draw point
					p5.strokeWeight(5);
					const p = p5.createVector(point.position.x + appState.origin.x, point.position.y + appState.origin.y);
					p5.point(p.x, p.y);

					// Draw connections which are positive y-axis changes and not directly left
					for(const neighbour of point.neighbours){
						const diff = {
							x: neighbour.position.x - point.position.x,
							y: neighbour.position.y - point.position.y
						}

							p5.strokeWeight(2.5);
							p5.line(p.x, p.y, neighbour.position.x + appState.origin.x, neighbour.position.y + appState.origin.y);
					}
				} 
			}
		}
	}

	// Initialize p5 sketch methods
	const sketch = (p5) => {

		// Setup canvas size
		p5.setup = () => {
			p5.createCanvas(props.canvasSize, props.canvasSize);
			p5.noLoop();
		}

		// Draw to the canvas
		p5.draw = () => {  
			drawGrid(p5);
		}
	}

	// When appState.grid or the renderer changes, draw the grid
	useEffect(()=>{
		if(renderer && appState.grid){
			renderer.clear();
			drawGrid(renderer)
		}
	}, [appState.grid, renderer]);

	// Setup the canvas on load
	useEffect(() => {
		const p5Instance = new p5(sketch, canvasRef.current);
		setRenderer(p5Instance);
	}, []);

	return (
		<div ref={canvasRef}></div>
	);
}
