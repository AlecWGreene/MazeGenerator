import logo from './logo.svg';
import './App.css';
import AppCanvas from './components/AppCanvas';
import { createContext, useEffect, useReducer, useRef, useState } from 'react';
import Controls from './components/Controls';

function appStateReducer(state, action){
	switch(action.type){
		case "UpdateGrid":
			return {
				...state,
				grid: action.payload.grid,  
				origin: action.payload.origin
			}
		case "ResizeCanvas":
			return {
				...state,
				canvasSize: action.payload
			}
		default:
			console.error("Unknown AppState action type");	
			return state;
	}
}

export const AppStateContext = createContext();

function App() {

	const [appState, dispatch] = useReducer(appStateReducer, {})
	const [frameSize, setFrameSize] = useState({ height: 0, width: 0})
	const [canvasSize, setCanvasSize] = useState(0);
	const appFrameRef = useRef();

	const windowResizeHandler = () => {
		setFrameSize({
			height: appFrameRef.current.getBoundingClientRect().height,
			width: appFrameRef.current.getBoundingClientRect().width
		});
	}

	// Register window resize handler on load and initialize frameSize
	useEffect(() => {
		windowResizeHandler();
		document.addEventListener("resize", windowResizeHandler);
	}, []);

	// Update the canvas size to match the frame size
	useEffect(() => {
		const newSize = Math.min(frameSize.height, frameSize.width) * 0.7;
		setCanvasSize(newSize);
		dispatch({
			type: "ResizeCanvas",
			payload: newSize
		})
	}, [frameSize]);

	return (
	<div className="App" ref={appFrameRef}>
		<AppStateContext.Provider value={[appState, dispatch]}>
			<Controls canvasSize={canvasSize}/>
			{canvasSize > 0 && <AppCanvas canvasSize={canvasSize} />}
		</AppStateContext.Provider>
	</div>
	);
}

export default App;
