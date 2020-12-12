import React, { useEffect, useState } from "react";

export default function Slider(props){
	const [value, setValue] = useState(20);

	const bounds = {
		min: 1,
		max: 100,
		step: 1
	};

	useEffect(() => {
		props.output.current = value;
	}, [value]);

	return (
		<>
		<div className="sliderHeader">
			CellSize: <span>{value}</span>
		</div>
		<input min={bounds.min} max={bounds.max} step={bounds.step} onChangeCapture={ (event) => setValue(event.target.value)} type="range"/>
		</>
	);
}