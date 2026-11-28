import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Graphics;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.PriorityQueue;
import java.util.Random;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;

/** Carves a random maze, then searches it from the top-left corner to the bottom-right one. */
public class Main {
	static final int CELL_SIZE = 16;
	static final int WALL_SIZE = 4;
	static final int DELAY_MS = 4;
	/** Extra gaps give the maze loops, so a search can settle for a longer route. */
	static final double EXTRA_PASSAGES = 0.1;
	static final String[] SEARCHES = {"Breadth-first", "Depth-first", "A*", "Greedy best-first"};
	static final int WALL = 0;
	static final int OPEN = 1;
	static final int SEEN = 2;
	static final int PATH = 3;
	static final Color[] COLORS = {
		new Color(18, 20, 28), new Color(235, 235, 240), new Color(150, 190, 255),
		new Color(255, 130, 60)
	};
	static final int[][] DIRECTIONS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

	int[][] maze;
	int[][] shown = new int[0][0];
	Thread worker;

	final JComboBox<String> search = new JComboBox<>(SEARCHES);
	final JLabel status = new JLabel(" ");
	final JPanel board = new JPanel() {
		@Override
		protected void paintComponent(Graphics g) {
			super.paintComponent(g);
			for (int row = 0; row < shown.length; row++) {
				for (int col = 0; col < shown[row].length; col++) {
					g.setColor(COLORS[shown[row][col]]);
					g.fillRect(offset(col), offset(row), thickness(col), thickness(row));
				}
			}
		}
	};

	Main() {
		JFrame frame = new JFrame("Click for a new maze");
		board.setBackground(COLORS[WALL]);
		board.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				start(true);
			}
		});
		board.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseClicked(MouseEvent e) {
				start(true);
			}
		});
		search.addActionListener(e -> start(false));
		JButton newMaze = new JButton("New maze");
		newMaze.addActionListener(e -> start(true));

		JPanel controls = new JPanel();
		controls.add(search);
		controls.add(newMaze);
		JPanel top = new JPanel(new BorderLayout());
		top.add(controls, BorderLayout.CENTER);
		top.add(status, BorderLayout.SOUTH);

		frame.add(top, BorderLayout.NORTH);
		frame.add(board, BorderLayout.CENTER);
		frame.setSize(480, 360);
		frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
		frame.setVisible(true);
	}

	void start(boolean newMaze) {
		int rows = blocksIn(board.getHeight());
		int cols = blocksIn(board.getWidth());
		if (rows < 5 || cols < 5) {
			return;
		}
		if (worker != null) {
			worker.interrupt();
		}
		if (newMaze) {
			maze = null;
		}
		int[][] grid = maze == null ? new int[rows][cols] : copy(maze);
		worker = new Thread(new Run(grid, maze == null, (String) search.getSelectedItem()));
		worker.start();
	}

	static int blocksIn(int pixels) {
		return 2 * ((pixels - WALL_SIZE) / (CELL_SIZE + WALL_SIZE)) + 1;
	}

	static int offset(int block) {
		return block / 2 * (CELL_SIZE + WALL_SIZE) + block % 2 * WALL_SIZE;
	}

	static int thickness(int block) {
		return block % 2 == 0 ? WALL_SIZE : CELL_SIZE;
	}

	static int[][] copy(int[][] grid) {
		int[][] copy = new int[grid.length][];
		for (int row = 0; row < grid.length; row++) {
			copy[row] = grid[row].clone();
		}
		return copy;
	}

	class Run implements Runnable {
		final int[][] grid;
		final boolean needsCarving;
		final String searchName;
		final Random random = new Random();
		final int stepsPerFrame;
		int steps;
		String progress = "Carving a new maze";

		Run(int[][] grid, boolean needsCarving, String searchName) {
			this.grid = grid;
			this.needsCarving = needsCarving;
			this.searchName = searchName;
			stepsPerFrame = Math.max(1, grid.length * grid[0].length / 2000);
		}

		@Override
		public void run() {
			try {
				if (needsCarving) {
					carve();
					addLoops();
					int[][] carved = copy(grid);
					onSwing(() -> maze = carved);
				}
				solve();
			} catch (InterruptedException e) {
				// A newer run replaced this one.
			}
		}

		void carve() throws InterruptedException {
			Deque<int[]> stack = new ArrayDeque<>();
			grid[1][1] = OPEN;
			stack.push(new int[] {1, 1});
			while (!stack.isEmpty()) {
				int[] cell = stack.peek();
				List<int[]> unvisited = new ArrayList<>();
				for (int[] d : DIRECTIONS) {
					int row = cell[0] + 2 * d[0];
					int col = cell[1] + 2 * d[1];
					if (row > 0 && row < grid.length - 1 && col > 0 && col < grid[0].length - 1
						&& grid[row][col] == WALL) {
						unvisited.add(new int[] {row, col});
					}
				}
				if (unvisited.isEmpty()) {
					stack.pop();
					continue;
				}
				int[] next = unvisited.get(random.nextInt(unvisited.size()));
				grid[(cell[0] + next[0]) / 2][(cell[1] + next[1]) / 2] = OPEN;
				grid[next[0]][next[1]] = OPEN;
				stack.push(next);
				show();
			}
		}

		void addLoops() throws InterruptedException {
			for (int row = 1; row < grid.length - 1; row++) {
				for (int col = 1; col < grid[0].length - 1; col++) {
					// A wall between two cells has one even and one odd coordinate.
					boolean betweenCells = (row + col) % 2 == 1;
					if (betweenCells && grid[row][col] == WALL
						&& random.nextDouble() < EXTRA_PASSAGES) {
						grid[row][col] = OPEN;
					}
				}
			}
			publish();
		}

		/** The searches differ only in which cell of the frontier they explore next. */
		void solve() throws InterruptedException {
			int rows = grid.length;
			int cols = grid[0].length;
			int[] goal = {rows - 2, cols - 2};
			int[][] distance = new int[rows][cols];
			for (int[] row : distance) {
				Arrays.fill(row, Integer.MAX_VALUE);
			}
			int[][][] cameFrom = new int[rows][cols][];
			boolean[][] explored = new boolean[rows][cols];
			// Entries are {row, col, priority, order}; a tie goes to the cell reached first.
			PriorityQueue<int[]> frontier = new PriorityQueue<>(Comparator
				.<int[]>comparingInt(entry -> entry[2])
				.thenComparingInt(entry -> entry[3]));
			int order = 0;
			int exploredCount = 0;
			distance[1][1] = 0;
			frontier.add(new int[] {1, 1, 0, order});
			reach(1, 1);
			while (!frontier.isEmpty()) {
				int[] entry = frontier.poll();
				int row = entry[0];
				int col = entry[1];
				// A cell is queued again when a shorter route to it turns up.
				if (explored[row][col]) {
					continue;
				}
				explored[row][col] = true;
				exploredCount++;
				progress = searchName + ": explored " + exploredCount + " cells";
				show();
				for (int[] d : DIRECTIONS) {
					if (grid[row + d[0]][col + d[1]] == WALL) {
						continue;
					}
					int nextRow = row + 2 * d[0];
					int nextCol = col + 2 * d[1];
					int steps = distance[row][col] + 1;
					if (!explored[nextRow][nextCol] && steps < distance[nextRow][nextCol]) {
						distance[nextRow][nextCol] = steps;
						cameFrom[nextRow][nextCol] = new int[] {row, col};
						order++;
						int priority = priority(nextRow, nextCol, steps, goal, order);
						frontier.add(new int[] {nextRow, nextCol, priority, order});
						reach(nextRow, nextCol);
					}
				}
				if (row == goal[0] && col == goal[1]) {
					break;
				}
			}
			for (int[] cell = goal; cell != null; cell = cameFrom[cell[0]][cell[1]]) {
				int[] from = cameFrom[cell[0]][cell[1]];
				grid[cell[0]][cell[1]] = PATH;
				if (from != null) {
					grid[(cell[0] + from[0]) / 2][(cell[1] + from[1]) / 2] = PATH;
				}
				show();
			}
			progress = searchName + ": explored " + exploredCount + " cells, route "
				+ distance[goal[0]][goal[1]] + " steps";
			publish();
		}

		void reach(int row, int col) {
			grid[row][col] = SEEN;
			for (int[] d : DIRECTIONS) {
				int gapRow = row + d[0];
				int gapCol = col + d[1];
				if (grid[gapRow][gapCol] == OPEN && grid[gapRow + d[0]][gapCol + d[1]] == SEEN) {
					grid[gapRow][gapCol] = SEEN;
				}
			}
		}

		int priority(int row, int col, int steps, int[] goal, int order) {
			int remaining = (Math.abs(goal[0] - row) + Math.abs(goal[1] - col)) / 2;
			switch (searchName) {
				case "Depth-first":
					return -order;
				case "A*":
					return steps + remaining;
				case "Greedy best-first":
					return remaining;
				default:
					return 0;
			}
		}

		void show() throws InterruptedException {
			if (++steps % stepsPerFrame == 0) {
				publish();
			}
		}

		void publish() throws InterruptedException {
			int[][] snapshot = copy(grid);
			String text = progress;
			onSwing(() -> {
				shown = snapshot;
				status.setText(text);
				board.repaint();
			});
			Thread.sleep(DELAY_MS);
		}

		void onSwing(Runnable action) {
			Thread thread = Thread.currentThread();
			SwingUtilities.invokeLater(() -> {
				if (worker == thread) {
					action.run();
				}
			});
		}
	}

	public static void main(String[] args) {
		SwingUtilities.invokeLater(Main::new);
	}
}