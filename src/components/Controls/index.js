import React, { useContext, useState, useRef, useEffect } from "react";
import { AppStateContext } from "../../App";
import HexGrid from "../../utils/HexGrid";
import generateMaze, { LayerFragment, MazeConfig, MazeLayer } from "../../utils/MazeGenerator";
import SquareGrid from "../../utils/SquareGrid";
import Slider from "./Slider";

// Compares config objects and returns true if their values have changed
function configsHaveChanged(prev, next){
	if(!prev) return true;

	for(const key of Object.keys(next)){
		try{
			if(prev[key] !== next[key]) return true; 
		}
		catch(err){
			console.error(err);
			return true;
		}
	}

	return false;
}

const mazeSettings = {
	start: [0,0],
	// endCandidates: ,
	// outline: new MazeConfig(null, [
	// 	new MazeLayer(1, [
	// 		[
	// 			new LayerFragment("ring", 1, []),
	// 			new LayerFragment("ring", 3, [])
	// 		],
	// 		[ new LayerFragment("ring", 1, []) ]
	// 	], [4,2], "Ring"),
	// 	new MazeLayer(2, [
	// 		[ new LayerFragment("ring", 1, []),
	// 		 new LayerFragment("branch", 3, []),
	// 		 new LayerFragment("ring", 1, []),
	// 		 new LayerFragment("ring", 2, [])]
	// 	], [1], "Ring")
	// ], 0)

	outline: new MazeConfig(null, [
		new MazeLayer(1, [
			[
				new LayerFragment("ring", 1, [])
			],
			[
				new LayerFragment("ring", 1, [])
			]
		], [1,2],"ring"),
		new MazeLayer(1.7, [
			[
				new LayerFragment("ring", 1, [])
			],
			[
				new LayerFragment("ring", 1.2, []),
				new LayerFragment("ring", 1, []),
				new LayerFragment("ring", 1, [])
			],
			[
				new LayerFragment("ring", 2, []),
				new LayerFragment("ring", 1, []),
			]
		], [1,3,1],"ring"),
		new MazeLayer(0.5, [
			[
				new LayerFragment("ring", 1, [])
			]
		], [1],"ring")
	], 0)
}

export default function Controls(props){

	// Context hook
	const [appState, dispatch] = useContext(AppStateContext);

	// Component states
	const [gridType, setGridType] = useState("Square");
	const [mazeStart, setMazeStart] = useState([0,0])
	const sliderValue = useRef();

	// Config states
	const [gridConfig, setGridConfig] = useState(null);
	const [mazeConfig, setMazeConfig] = useState(null);

	// Update states based on button presses
	const buttonHandlers = {
		gridHandlers: {
			square: () => {
				setGridType("Square");
			},
			hex: () => {
				setGridType("Hex");
			}
		}
	};

	// Call the constructor methods for the selected grid type
	const gridConstructor = () => {
		switch(gridType){
			case "Square":
				return new SquareGrid(appState.canvasSize, appState.canvasSize, sliderValue.current);
			case "Hex":
				return new HexGrid(appState.canvasSize, appState.canvasSize, sliderValue.current);
			default:
				throw new Error("Grid type not recognized");  
		}
	}

	// Dispatch generated data to the AppStateContext
	const submitHandler = () => {	
		// If user has made changes to grid, then update grid	
		if(configsHaveChanged(gridConfig, {type: gridType, cellsize: sliderValue.current})){
			const grid = gridConstructor();
			const origin = (gridType === "Square") ? {x: 15, y: 15} : { x: appState.canvasSize / 2, y: appState.canvasSize / 2};

			dispatch({
				type: "UpdateGrid",
				payload: {
					grid: grid,
					origin: origin
				}
			});

			// If user has made changes to maze, then update maze 
			if(configsHaveChanged(mazeConfig, {start: mazeStart, cellsize: sliderValue.current})){
				const maze = generateMaze(grid, mazeStart, [], mazeSettings.outline);

				dispatch({
					type: "UpdateMaze",
					payload: maze
				})
			}
		}
		// If user has made changes to maze, then update maze 
		else if(configsHaveChanged(mazeConfig, {start: mazeStart, cellsize: sliderValue.current})){
			const maze = generateMaze(appState.grid, mazeStart, [], mazeSettings.outline);

			dispatch({
				type: "UpdateMaze",
				payload: maze
			})
		}
	}

	return (
		<div className="AppControls" style={{minWidth: props.canvasSize}}>
			<div className="ButtonRow">
				<Slider output={sliderValue} />
			</div>
			<div className="ButtonRow">
				<button className="GridButton" onClickCapture={buttonHandlers.gridHandlers.square}>
					Square Grid
				</button>

				<button className="HexButton" onClickCapture={buttonHandlers.gridHandlers.hex}>
					Hex Grid
				</button>
			</div>
			<button className="GenerateButton" onClickCapture={submitHandler}> Generate Maze</button>
		</div>
	);
}