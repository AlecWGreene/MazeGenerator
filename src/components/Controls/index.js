import React, { useContext, useState, useRef, useEffect, createContext, useReducer } from "react";
import { AppStateContext } from "../../App";
import HexGrid from "../../utils/HexGrid";
import generateMaze, { LayerFragment, MazeConfig, MazeLayer } from "../../utils/MazeGenerator";
import SquareGrid from "../../utils/SquareGrid";
import Slider from "./Slider";
import useMazeGenerator from "./useMazeGenerator";

export const CellsizeContext = createContext();

const mazeSettings = {
	start: [0,0],
	outline: new MazeConfig(
		"ring", [
			// First layer
			new MazeLayer(1, [
				[
					new LayerFragment("ring", 1, ["North", "East", "South", "West"])
				]
			], [1], "ring"),
			// Second layer
			new MazeLayer(1, [
				// Slice 1-0
				[
					new LayerFragment("ring", 1, ["East", "West"])
				],
				// Slice 1-1
				[
					new LayerFragment("branch", 1.5, ["North", "East", "South", "West"]),
					new LayerFragment("ring", 1, ["North", "East", "South", "West"])
				],
				// Slice 1-2
				[
					new LayerFragment("ring", 1, ["East", "West"])
				]
			], [0.7, 1.2, 0.7], "ring"),
			// Third layer
			new MazeLayer(1, [
				[
					new LayerFragment("braid", 1, ["North", "East", "South", "West"])
				]
			], [1], "braid")
		], "Alec"
	)
	// outline: new MazeConfig("ring", [
	// 	new MazeLayer(1, [
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		],
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		],
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		]
	// 	], [1,1.5,2],"ring"),
	// 	new MazeLayer(1.7, [
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		],
	// 		[
	// 			new LayerFragment("ring", 1.7, ["North", "East", "South", "West"]),
	// 			new LayerFragment("ring", 1.2, ["North", "East", "South", "West"]),
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		],
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"]),
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		],
	// 		[
	// 			new LayerFragment("ring", 2, ["North", "East", "South", "West"]),
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		]
	// 	], [1,3, 0.7,1],"ring"),
	// 	new MazeLayer(0.5, [
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		],
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		]
	// 	], [1.6,1],"ring"),
	// 	new MazeLayer(0.5, [
	// 		[
	// 			new LayerFragment("ring", 1, ["North", "East", "South", "West"])
	// 		]
	// 	], [1],"ring")
	// ], "Alec")
}

export default function Controls(props){

	// Context hook
	const [appState, dispatch] = useContext(AppStateContext);
	const [cellsize, updateCellsize] = useReducer((state, action) => {
		if(state === action) return state;
		else return action;
	}, 20);

	// Component states
	const [gridType, setGridType] = useState("Hex");
	const [gridCellsize, setGridCellsize] = useState(null);
	const [mazeStart, setMazeStart] = useState([0,0]);
	const [generateNewSeed, toggleGenerateNewSeed] = useState(true);
	const [seed, setSeed] = useState("");
	const [isThinking, setThinking] = useState(false);
	const seedInput = useRef();

	// Config states
	const [gridConfig, setGridConfig] = useState(null);
	const [mazeConfig, setMazeConfig] = useState(null);

	// Utilize hook to run generator asynchronously
	const mazeData = useMazeGenerator(mazeConfig?.grid, mazeConfig?.start, mazeConfig?.outline);

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
				return new SquareGrid(appState.canvasSize, appState.canvasSize, cellsize);
			case "Hex":
				return new HexGrid(appState.canvasSize, appState.canvasSize, cellsize);
			default:
				throw new Error("Grid type not recognized");  
		}
	}

	// Update the seed display when it is auto generated
	useEffect(() => {
		if(!generateNewSeed){
			setSeed(seedInput.current.value)
		}
	}, [seedInput.current]);

	useEffect(() => {
		seedInput.current.value = seed;
		mazeSettings.outline.seed = seed;
	}, [seed]);

	useEffect(() => {
		setThinking(mazeData.isRunning);

		if(mazeData.isRunning){
			dispatch({
				type: "UpdateComputationTime",
				payload: mazeData.time
			});
		}

		if(mazeData.isFinished){
			dispatch({
				type: "UpdateMaze",
				payload: mazeData.maze
			});
		}
	}, [mazeData.isRunning]);

	// When grid settings are changed, update grid
	useEffect(() => {
		// If user has made changes to grid, then update grid	
		let timeout;
		if(appState.canvasSize){
			timeout = setTimeout(() => {
				const grid = gridConstructor();
				const origin = (gridType === "Square") ? {x: 15, y: 15} : { x: appState.canvasSize / 2, y: appState.canvasSize / 2 };
				
				dispatch({
					type: "UpdateGrid",
					payload: {
						grid: grid,
						origin: origin
					}
				})

				if(appState.grid){
					const index = mazeConfig?.start || mazeStart;
					dispatch({
						type: "UpdateMaze",
						payload: {
							graph: [],
							outline: [],
							start: grid.points[index[0]][index[1]]
						}
					})
				}
			}, 100);
		}

		return () => {
			clearTimeout(timeout)
		}
	}, [cellsize, gridType]);

	const createNewSeed = () => {
		let newSeed = "";
		for(let i = 0; i < 8; i++){
			const randNum = Math.floor(Math.random() * 62);

			// Add a digit
			if(randNum < 10){
				newSeed += String.fromCharCode(48 + randNum);
			}
			// Add a lowercase letter
			else if(randNum < 36){
				newSeed += String.fromCharCode(65 + randNum - 10);
			}
			// Add an uppercase letter
			else if(randNum < 62){
				newSeed += String.fromCharCode(97 + randNum - 36);
			}
		}

		setSeed(newSeed);
	}

	// Dispatch generated data to the AppStateContext
	const submitHandler = () => {
		if(generateNewSeed) createNewSeed();

		// If the grid is created then make a maze
		if(appState.grid){
			setMazeConfig({
				grid: appState.grid,
				start: mazeSettings.start,
				outline: mazeSettings.outline
			});
		}
	}

	return (
		<div className="AppControls" style={{minWidth: props.canvasSize}}>
			<div className="ButtonContainer">
				<div className="ButtonRow">
					<CellsizeContext.Provider value={[cellsize, updateCellsize]}>
						<Slider />
					</CellsizeContext.Provider>
				</div>
				<div className="SeedContainer">
					<input className="GenerateToggler" type="checkbox" onChangeCapture={() => toggleGenerateNewSeed(!generateNewSeed)} checked={generateNewSeed}/>
					<input className="SeedDisplay" onKeyUpCapture={() => toggleGenerateNewSeed(false)} ref={seedInput}/>
				</div>
				<div className="ButtonRow">
					<button className={"GridButton"+ gridType === "Square" ? " active" : undefined} onClickCapture={buttonHandlers.gridHandlers.square}>
						Square Grid
					</button>

					<button className={"HexButton"+ gridType === "Hex" ? " active" : undefined} onClickCapture={buttonHandlers.gridHandlers.hex}>
						Hex Grid
					</button>
				</div>
				<button className="GenerateButton" onClickCapture={submitHandler}> Generate Maze</button>
			</div>

			<div className="ButtonContainer">
				<div className="TimeContainer">
					<div className="TimeLabel">Computation Time:</div>
					<div className="TimeValue">{appState.computationTime || "N/A"} ms</div> 
				</div>
				<div className="LoadingIconContainer">
					<img className={"LoadingIcon"+ (isThinking ? " Show": " Hide")} src="./Assets/rings.svg" />
				</div>
			</div>
		</div>
	);
}