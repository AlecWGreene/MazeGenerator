import React, { useContext, useState } from "react";
import { AppStateContext } from "../../App";
import HexGrid from "../../utils/HexGrid";
import SquareGrid from "../../utils/SquareGrid";

export default function Controls(props){

	const [appState, dispatch] = useContext(AppStateContext);
	const [gridType, setGridType] = useState("Square");
	const [gridSize, setGridSize] = useState(100);
	const [cellsize, setCellsize] = useState(5);

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

	const gridConstructor = () => {
		switch(gridType){
			case "Square":
				return new SquareGrid(gridSize,gridSize, cellsize);
			case "Hex":
				return new HexGrid(gridSize, gridSize, cellsize);
			default:
				throw new Error("Grid type not recognized");  
		}
	}

	const submitHandler = () => {
		const grid = gridConstructor();
		const origin = (gridType === "Square") ? {x: 0, y: 0} : { x: appState.canvasSize / 2, y: appState.canvasSize / 2};
		dispatch({
			type: "UpdateGrid",
			payload: {
				grid: grid,
				origin: origin
			}
		});
	}

	return (
		<div className="AppControls" style={{minWidth: props.canvasSize}}>
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