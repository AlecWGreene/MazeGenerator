import React, { useContext, useState } from "react";
import { AppStateContext } from "../../App";
import SquareGrid from "../../utils/SquareGrid";

export default function Controls(props){

	const [appState, dispatch] = useContext(AppStateContext);
	const [gridType, setGridType] = useState("Square");
	const [gridSize, setGridSize] = useState(100);
	const [cellsize, setCellsize] = useState(100);

	const buttonHandlers = {
		gridHandlers: {
			square: () => {
				setGridType("Square");
			}
		}
	};

	const gridConstructor = () => {
		switch(gridType){
			case "Square":
				return new SquareGrid(gridSize,gridSize, cellsize);
			default:
				throw new Error("Grid type not recognized");
		}
	}

	const submitHandler = () => {
		const grid = gridConstructor();
		dispatch({
			type: "UpdateGrid",
			payload: grid
		});
	}

	return (
		<div className="AppControls" style={{minWidth: props.canvasSize}}>
			<div className="ButtonRow">
				<button className="GridButton" onClickCapture={buttonHandlers.gridHandlers.square}>
					Square Grid
				</button>

				<button className="HexButton" onClickCapture={buttonHandlers.gridHandlers.square}>
					Hex Grid
				</button>
			</div>
			<button className="GenerateButton" onClickCapture={submitHandler}> Generate Maze</button>
		</div>
	);
}