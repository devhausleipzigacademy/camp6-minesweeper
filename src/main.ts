/*

Minesweeper

- squares where mines are
- cleared squares
- hidden squares
- mechanism for finding the edges of cleared areas (recursive conditions checked on neighbors?)
- show maximum cleared area up to mine-adjacent squares on click
- given the edges of cleared areas, compute the number of adjacent mines for each edge square

*/

/////////////
/// Types ///
/////////////

type Coordinate = [number, number];

type Coordinates = Array<Coordinate>;

type Predicate<T> = (element: T) => boolean;

type AdjFunc = (coord: Coordinate) => Coordinates;

const fieldStatuses = ["mine", "no-mine", "visible"] as const;
type FieldStatuses = typeof fieldStatuses[number];

type FieldSquare = {
	id: string;
	status: FieldStatuses;
	isMineAdjacent: boolean;
	isFlagged: boolean;
};

/////////////////
/// Utilities ///
////////////////

function toggleClass(className: string, elementIds: Array<string>): void {
	for (const elementId of elementIds) {
		const element = document.getElementById(elementId) as HTMLElement;
		element.classList.toggle(className);
	}
}

function addClass(className: string, elementIds: Array<string>): void {
	for (const elementId of elementIds) {
		const element = document.getElementById(elementId) as HTMLElement;
		element.classList.add(className);
	}
}

function randomNumber(range: number): number {
	return Math.floor(Math.random() * range);
}

function randomCoordinate(xRange: number, yRange: number): Coordinate {
	return [randomNumber(xRange), randomNumber(yRange)];
}

function coordToId(coord: Coordinate): string {
	const [column, row] = coord;
	return `${column}-${row}`;
}

function idToCoord(id: string): Coordinate {
	return id.split("-").map(Number) as Coordinate;
}

const horizAdj: AdjFunc = function (coord) {
	const [column, row] = coord;
	const left: Coordinate = [column - 1, row];
	const right: Coordinate = [column + 1, row];

	return [left, right];
};

const vertAdj: AdjFunc = function (coord) {
	const [column, row] = coord;
	const top: Coordinate = [column, row + 1];
	const bottom: Coordinate = [column, row - 1];

	return [top, bottom];
};

const backDiaAdj: AdjFunc = function (coord) {
	const [column, row] = coord;
	const topleft: Coordinate = [column - 1, row + 1];
	const bottomright: Coordinate = [column + 1, row - 1];

	return [topleft, bottomright];
};

const forDiaAdj: AdjFunc = function (coord) {
	const [column, row] = coord;
	const bottomleft: Coordinate = [column - 1, row - 1];
	const topright: Coordinate = [column + 1, row + 1];

	return [topright, bottomleft];
};

function filterInvalid<T>(predicate: Predicate<T>, array: Array<T>): Array<T> {
	return array.filter((element) => {
		return predicate(element);
	});
}

//////////////////////////////////////////
/// Prepare Board & Initial Game State ///
//////////////////////////////////////////

const gameGrid = document.querySelector("#game-grid") as HTMLElement;
const scoreElement = document.querySelector("#score > span") as HTMLElement;

const gridRows = 11;
const gridColumns = 11;

const squares: Record<string, FieldSquare> = {};
let score = 0;

function initializeBoardState() {
	for (let i = 0; i < gridRows; i++) {
		for (let j = 0; j < gridColumns; j++) {
			const newSquareId = coordToId([i, j]);
			const newSquare: FieldSquare = {
				id: newSquareId,
				status: "no-mine",
				isMineAdjacent: false,
				isFlagged: false,
			};
			squares[newSquareId] = newSquare;

			const gridElement = document.createElement("div");
			gridElement.id = newSquareId;
			gridElement.classList.add(
				"grid-square",
				"h-[50px]",
				"w-[50px]",
				"max-h-full",
				"bg-gray-400",
				"hover:border-black",
				"border",
				"border-cyan-400",
				"flex",
				"justify-center",
				"items-center",
				"overflow-hidden"
			);
			gameGrid.appendChild(gridElement);
		}
	}
}

initializeBoardState();

function randomMineIds(quantity: number): Array<string> {
	if (quantity > gridRows * gridColumns) {
		throw new Error("Can't have more mines than locations on the grid.");
	}

	const mines: Array<string> = [];
	while (mines.length < quantity) {
		const newMine = coordToId(randomCoordinate(gridRows, gridColumns));
		if (mines.includes(newMine)) {
			continue;
		}
		mines.push(newMine);
	}
	return mines;
}

function addMinesToBoard(quantity) {
	const newMineIds = randomMineIds(quantity);

	for (const mineId of newMineIds) {
		squares[mineId]["status"] = "mine";
	}
}

addMinesToBoard(20);

const adjacencyFunctions = [horizAdj, vertAdj, forDiaAdj, backDiaAdj];

const ElevenByEleven: Predicate<Coordinate> = function (coord) {
	const [column, row] = coord;
	return !(row < 0 || row > 10 || column < 0 || column > 10);
};

function getAdjacents(coord: Coordinate): Coordinates {
	const adjacents: Coordinates = [];

	for (const adjFunc of adjacencyFunctions) {
		adjacents.push(...adjFunc(coord));
	}

	return filterInvalid(ElevenByEleven, adjacents);
}

function calculateMineAdjacency(coord: Coordinate): number {
	let mineCount = 0;
	const adjCoords = getAdjacents(coord);

	for (const adjCoord of adjCoords) {
		if (squares[coordToId(adjCoord)].status == "mine") {
			mineCount++;
		}
	}

	return mineCount;
}

type MineAdjacencyPair = [Coordinate, number];

type SeenMemo = Record<string, boolean>;

function haveSeen(seenMemo: SeenMemo, coord: Coordinate): boolean {
	const id = coordToId(coord);
	if (seenMemo[id] == undefined) {
		seenMemo[id] = true;
		return false;
	} else {
		return true;
	}
}

function findClearSurroundings(
	coord: Coordinate,
	mineAdjMemo: Array<MineAdjacencyPair> | null = null,
	clearMemo: Coordinates | null = null,
	seenMemo: SeenMemo | null = null
) {
	if (mineAdjMemo == null) {
		mineAdjMemo = [] as Array<MineAdjacencyPair>;
	}
	if (clearMemo == null) {
		clearMemo = [] as Coordinates;
	}
	if (seenMemo == null) {
		seenMemo = {} as SeenMemo;
	}

	const adjCoords = [coord, ...getAdjacents(coord)];

	for (const adjCoord of adjCoords) {
		if (haveSeen(seenMemo, adjCoord) == true) {
			continue;
		}

		const adjacentMines = calculateMineAdjacency(adjCoord);

		if (adjacentMines > 0) {
			const pair: MineAdjacencyPair = [adjCoord, adjacentMines];
			mineAdjMemo.push(pair);
		} else {
			const id = coordToId(adjCoord);
			const square = squares[id];
			if (square.status == "mine") {
				continue;
			}

			clearMemo.push(adjCoord);
			findClearSurroundings(adjCoord, mineAdjMemo, clearMemo, seenMemo);
		}
	}

	return {
		mineAdjMemo,
		clearMemo,
	};
}

function updateScore() {
	scoreElement.innerText = String(score);
}

document.addEventListener("click", (event) => {
	const target = event.target as HTMLElement;

	if (target.matches("#game-grid > .grid-square")) {
		const fieldSquare = squares[target.id];
		console.log(squares);
		switch (fieldSquare.status) {
			case "mine":
				addClass("mine", [target.id]);
				// end game; reset state
				break;
			case "no-mine":
				const coord = idToCoord(target.id);
				const { mineAdjMemo, clearMemo } = findClearSurroundings(coord);

				for (const clearSquareCoord of clearMemo) {
					const clearSquareId = coordToId(clearSquareCoord);
					addClass("clear", [clearSquareId]);

					const clearSquare = squares[clearSquareId];
					clearSquare.status = "visible";
				}

				for (const pair of mineAdjMemo) {
					const [mineAdjCoord, mines] = pair;

					const mineAdjSquareId = coordToId(mineAdjCoord);
					const mineAdjSquare = squares[mineAdjSquareId];

					if (mineAdjSquare.status == "mine") {
						continue;
					}

					mineAdjSquare.status = "visible";
					addClass("clear", [mineAdjSquareId]);

					const gridElement = document.getElementById(
						mineAdjSquareId
					) as HTMLElement;

					let color = "black";
					gridElement.innerHTML = `<span class='bg-${color}-500;'>${String(
						mines
					)}</span>`;
				}

				break;
			case "visible":
			// do nothing
		}
	}
});
