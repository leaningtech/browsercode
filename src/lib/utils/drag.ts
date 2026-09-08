export type DragOptions = {
	cursor: 'col-resize' | 'row-resize';
	/** `stop` ends the drag before mouseup, for a gesture that resolves early. */
	move: (dx: number, dy: number, stop: () => void) => void;
	/** Also runs when `move` stops the drag early. */
	end?: () => void;
};

/** Listeners sit on `window`, so a pointer that outruns the divider keeps the drag alive. */
export function startDrag(event: MouseEvent, { cursor, move, end }: DragOptions): void {
	event.preventDefault();
	const startX = event.clientX;
	const startY = event.clientY;

	document.body.classList.add('dragging');
	document.body.style.cursor = cursor;

	function stop(): void {
		document.body.classList.remove('dragging');
		document.body.style.cursor = '';
		window.removeEventListener('mousemove', onMove);
		window.removeEventListener('mouseup', stop);
		end?.();
	}

	function onMove(moveEvent: MouseEvent): void {
		move(moveEvent.clientX - startX, moveEvent.clientY - startY, stop);
	}

	window.addEventListener('mousemove', onMove);
	window.addEventListener('mouseup', stop);
}
