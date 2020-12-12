import React, { useContext, useState, useRef, useEffect } from "react";
import { AppStateContext } from "../../App";
import HexGrid from "../../utils/HexGrid";
import SquareGrid from "../../utils/SquareGrid";
import Slider from "./Slider";

export default function Controls(props){

	const [appState, dispatch] = useContext(AppStateContext);
	const [gridType, setGridType] = useState("Square");
	const sliderValue = useRef();

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
		const grid = gridConstructor();
		const origin = (gridType === "Square") ? {x: 15, y: 15} : { x: appState.canvasSize / 2, y: appState.canvasSize / 2};
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