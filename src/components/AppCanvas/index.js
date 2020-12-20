import p5 from "p5";
import { useContext, useEffect, useReducer, useRef, useState } from "react";
import { AppStateContext } from "../../App";

function renderConfigReducer(state, action){
	return {
		...state,
		action
	}
}

export default function AppCanvas(props){

	const [appState] = useContext(AppStateContext);
	const [renderer, setRenderer] = useState(null);

	const [renderConfig, dispatchConfig] = useReducer(renderConfigReducer, {
		grid: {
			point: {
				stroke: 3,
				color: "silver"
			},
			line: {
				stroke: 1,
				color: "silver"
			}
		},
		maze: {
			startPoint: {
				stroke: 7,
				color: "green"
			},
			nodePoint: {
				stroke: 3.25,
				color: "cyan"
			},
			line: {
				stroke: 3,
				color: "cyan"
			}
		}
	}); 

	const canvasRef = useRef();

	// Draws the grid using points and the line
	const drawGrid = (p5) => {
		p5.background(0);
		if(appState.grid){
			
			for(const row of appState.grid.points){
				for(const point of row){
					// Draw point
					p5.strokeWeight(renderConfig.grid.point.stroke);
					p5.stroke(renderConfig.grid.point.color);
					const p = p5.createVector(point.position.x + appState.origin.x, point.position.y + appState.origin.y);
					p5.point(p.x, p.y);

					// Draw connections which are positive y-axis changes and not directly left
					for(const neighbour of point.neighbours){
						const diff = {
							x: neighbour.position.x - point.position.x,
							y: neighbour.position.y - point.position.y
						}

						// Draw line
						p5.stroke(renderConfig.grid.line.color);
						p5.strokeWeight(renderConfig.grid.line.stroke);
						p5.line(p.x, p.y, neighbour.position.x + appState.origin.x, neighbour.position.y + appState.origin.y);
					}
				} 
			}
		}
	}

	// Draws the maze and shows the path connections
	const drawMaze = (p5) => {
		if(appState.maze){
			// Draw the graph lines
			for(const node of appState.maze.graph){
				
				// Draw node connections
				for(const connection of node.connections){
					p5.stroke(renderConfig.maze.line.color);
					p5.strokeWeight(renderConfig.maze.line.stroke)
					p5.line(node.point.position.x + appState.origin.x, 
						node.point.position.y + appState.origin.y, 
						connection.point.position.x + appState.origin.x,
						connection.point.position.y + appState.origin.y);
				}
			}

			// Draw the maze points
			for(const node of appState.maze.graph){
				// Draw node point 
				p5.stroke(renderConfig.maze.nodePoint.color);
				p5.strokeWeight(renderConfig.maze.nodePoint.stroke)
				p5.point(node.point.position.x + appState.origin.x, node.point.position.y + appState.origin.y);
			}

			// Draw starting point
			p5.stroke(renderConfig.maze.startPoint.color);
			p5.strokeWeight(renderConfig.maze.startPoint.stroke)
			p5.point(appState.maze.start.position.x + appState.origin.x, appState.maze.start.position.y + appState.origin.y);

			// Draw problem nodes, for debugging
			if(appState.maze?.problems){
				for(const node of appState.maze.problems){
					// Draw node connections
					for(const connection of node.connections){
						p5.stroke("yellow");
						p5.strokeWeight(renderConfig.maze.line.stroke * 0.8)
						p5.line(node.point.position.x + appState.origin.x, 
							node.point.position.y + appState.origin.y, 
							connection.point.position.x + appState.origin.x,
							connection.point.position.y + appState.origin.y);
					}

						// Draw node point 
						p5.stroke("red");
						p5.strokeWeight(renderConfig.maze.nodePoint.stroke * 0.15)
						p5.point(node.point.position.x + appState.origin.x, node.point.position.y + appState.origin.y);
					
				}
			}
		}
	}

	// DEBUGGING draws the maze outline
	const drawOutline = (p5) => {
		if(appState.maze){
			let color = {
				layer: 80,
				slice: 40,
				fragment: 70
			}
			let counter = {
				layer: 1,
				slice: 1,
				fragment: 1 
			}

			// Layers
			for(const layer of appState.maze.outline){
				counter.layer++;
				counter.slice = 1;
				for(const slice of layer){
					counter.slice++;
					counter.fragment = 1;
					for(const fragment of slice){
						counter.fragment++;
						for(const row of fragment.subgraph){
							for(const point of row){
								// if(point.weight){
								// p5.stroke(255 * point.weight,255 * point.weight,255 * point.weight);
								//p5.stroke((color.layer * counter.layer) * 2 / counter.fragment, ((2.2 * counter.slice * color.slice - color.layer * counter.layer)) * 2 / counter.fragment, (color.layer * counter.slice) * 2 / counter.fragment);
								p5.stroke(
									(color.layer * counter.layer) * 1.5 / counter.fragment,
									(color.slice * counter.slice) * 3 / counter.fragment,
									((color.layer * counter.layer) + (color.slice * counter.slice)) / (2 * counter.fragment)
								);
								p5.strokeWeight(renderConfig.maze.nodePoint.stroke);
								p5.point(point.position.x + appState.origin.x, point.position.y + appState.origin.y);
								
							}
						}
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
			drawMaze(p5);
		}
	}

	// When appState.grid or the renderer changes, draw the grid
	useEffect(()=>{
		if(renderer && appState.grid){
			renderer.clear();
			renderer.background("black");
			//drawGrid(renderer);
			//drawOutline(renderer);
			drawMaze(renderer);
		}
	}, [appState.maze, appState.origin, appState.grid, renderer]);

	// Setup the canvas on load
	useEffect(() => {
		const p5Instance = new p5(sketch, canvasRef.current);
		setRenderer(p5Instance);
	}, []);

	return (
		<div ref={canvasRef}></div>
	);
}
