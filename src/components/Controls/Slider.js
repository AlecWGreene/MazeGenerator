import React, { useContext, useEffect, useState } from "react";
import { CellsizeContext } from "./index.js";

export default function Slider(props){
	const [cellsize, updateCellsize] = useContext(CellsizeContext);
	const [value, setValue] = useState(20);

	const bounds = {
		min: 1,
		max: 40,
		step: 0.15
	};

	// Update cellsize context value
	useEffect(() => {
		updateCellsize(value)
	}, [value]);

	return (
		<div className="sliderContainer">
			<div className="sliderHeader">
				CellSize: <span>{value}</span>
			</div>
			<input className="sliderInput" min={bounds.min} max={bounds.max} step={bounds.step} onChangeCapture={ (event) => setValue(event.target.value)} type="range"/>
		</div>
	);
}