import p5 from "p5";
import { useEffect, useRef, useState } from "react";

export default function AppCanvas(props){

	const [renderer, setRenderer] = useState(null);
	const canvasRef = useRef();

	// Initialize p5 sketch methods
	const sketch = (p5) => {
		let x = 100;
  		let y = 100;

		p5.setup = () => {
			p5.createCanvas(props.canvasSize, props.canvasSize);
		}

		p5.draw = () => {
			p5.background(0);
    		p5.fill(255);
    		p5.rect(x,y,50,50);
		}
	}

	// Setup the canvas on load
	useEffect(() => {
		const p5Instance = new p5(sketch, canvasRef.current);
		setRenderer(p5Instance);
	}, []);

	return (
		<div ref={canvasRef}></div>
	);
}
